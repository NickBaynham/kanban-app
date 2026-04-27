"""Tests for the chat router. The OpenRouter client is patched so we can
drive deterministic tool-call sequences."""

import json
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


# ── Helpers ──────────────────────────────────────────────────────────────────


def _register_login(username: str, password: str) -> str:
    client.post("/api/register", json={"username": username, "password": password})
    resp = client.post(
        "/api/login",
        data={"username": username, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _tool_call(call_id: str, name: str, args: dict) -> SimpleNamespace:
    return SimpleNamespace(
        id=call_id,
        type="function",
        function=SimpleNamespace(name=name, arguments=json.dumps(args)),
    )


def _completion(*, content: str | None = None, tool_calls: list | None = None) -> SimpleNamespace:
    return SimpleNamespace(
        choices=[
            SimpleNamespace(
                message=SimpleNamespace(content=content, tool_calls=tool_calls or None)
            )
        ]
    )


@pytest.fixture
def token():
    return _register_login("chatuser", "chatpassword")


@pytest.fixture
def board(token):
    resp = client.post("/api/boards", json={"name": "Chat Board"}, headers=_auth(token))
    assert resp.status_code == 200
    return resp.json()


# ── Tests ────────────────────────────────────────────────────────────────────


def test_chat_board_not_found(token):
    resp = client.post(
        "/api/chat",
        json={"message": "hi", "board_id": 99999},
        headers=_auth(token),
    )
    assert resp.status_code == 404


def test_chat_no_tool_calls_returns_text(token, board):
    sequence = iter([_completion(content="No actions needed.")])

    with patch("routers.chat.client") as mock_client:
        mock_client.chat.completions.create.side_effect = lambda **_: next(sequence)
        resp = client.post(
            "/api/chat",
            json={"message": "hi", "board_id": board["id"]},
            headers=_auth(token),
        )
    assert resp.status_code == 200
    body = resp.json()
    assert body["board_changed"] is False
    assert "No actions needed" in body["response"]


def test_chat_create_card_dispatches_and_persists(token, board):
    col_id = board["columns"][0]["id"]
    sequence = iter(
        [
            _completion(
                tool_calls=[
                    _tool_call("c1", "create_card", {"column_id": col_id, "title": "From AI"}),
                ]
            ),
            _completion(content="Added the card."),
        ]
    )

    with patch("routers.chat.client") as mock_client:
        mock_client.chat.completions.create.side_effect = lambda **_: next(sequence)
        resp = client.post(
            "/api/chat",
            json={"message": "Add card 'From AI' to first column", "board_id": board["id"]},
            headers=_auth(token),
        )
    assert resp.status_code == 200
    body = resp.json()
    assert body["board_changed"] is True

    fresh = client.get(f"/api/boards/{board['id']}", headers=_auth(token)).json()
    titles = [c["title"] for c in fresh["columns"][0]["cards"]]
    assert "From AI" in titles


def test_chat_unknown_card_id_surfaces_failure(token, board):
    sequence = iter(
        [
            _completion(
                tool_calls=[
                    _tool_call("c1", "delete_card", {"card_id": 999999}),
                ]
            ),
            _completion(content="I tried, but that card wasn't on the board."),
        ]
    )

    with patch("routers.chat.client") as mock_client:
        mock_client.chat.completions.create.side_effect = lambda **_: next(sequence)
        resp = client.post(
            "/api/chat",
            json={"message": "delete card 999999", "board_id": board["id"]},
            headers=_auth(token),
        )
    assert resp.status_code == 200
    body = resp.json()
    assert body["board_changed"] is False
    assert "delete_card" in body["response"]
    assert "not on this board" in body["response"]


def test_chat_cannot_modify_other_users_card(token, board):
    """A model coaxed into supplying an out-of-board card_id must not mutate it."""
    other_token = _register_login("otherchat", "otherpw1234")
    other_board = client.post(
        "/api/boards", json={"name": "Other"}, headers=_auth(other_token)
    ).json()
    victim_card = client.post(
        "/api/cards",
        json={
            "title": "Victim",
            "details": "",
            "column_id": other_board["columns"][0]["id"],
            "order": 0,
        },
        headers=_auth(other_token),
    ).json()

    sequence = iter(
        [
            _completion(
                tool_calls=[
                    _tool_call("c1", "delete_card", {"card_id": victim_card["id"]}),
                ]
            ),
            _completion(content="That card isn't on this board."),
        ]
    )

    with patch("routers.chat.client") as mock_client:
        mock_client.chat.completions.create.side_effect = lambda **_: next(sequence)
        resp = client.post(
            "/api/chat",
            json={"message": "delete it", "board_id": board["id"]},
            headers=_auth(token),
        )
    assert resp.status_code == 200
    assert resp.json()["board_changed"] is False

    # Victim card must still exist on the other user's board.
    fresh = client.get(
        f"/api/boards/{other_board['id']}", headers=_auth(other_token)
    ).json()
    titles = [c["title"] for col in fresh["columns"] for c in col["cards"]]
    assert "Victim" in titles


def test_chat_move_card_normalizes_order(token, board):
    src_col = board["columns"][0]["id"]
    dst_col = board["columns"][4]["id"]
    # Pre-seed destination so the moved card can't keep order=0.
    client.post(
        "/api/cards",
        json={"title": "Anchor", "details": "", "column_id": dst_col, "order": 0},
        headers=_auth(token),
    )
    movable = client.post(
        "/api/cards",
        json={"title": "Mover", "details": "", "column_id": src_col, "order": 0},
        headers=_auth(token),
    ).json()

    sequence = iter(
        [
            _completion(
                tool_calls=[
                    _tool_call(
                        "c1", "move_card", {"card_id": movable["id"], "column_id": dst_col}
                    ),
                ]
            ),
            _completion(content="Moved."),
        ]
    )

    with patch("routers.chat.client") as mock_client:
        mock_client.chat.completions.create.side_effect = lambda **_: next(sequence)
        resp = client.post(
            "/api/chat",
            json={"message": "move it", "board_id": board["id"]},
            headers=_auth(token),
        )
    assert resp.status_code == 200
    fresh = client.get(f"/api/boards/{board['id']}", headers=_auth(token)).json()
    dst_cards = next(c for c in fresh["columns"] if c["id"] == dst_col)["cards"]
    moved = next(c for c in dst_cards if c["title"] == "Mover")
    anchor = next(c for c in dst_cards if c["title"] == "Anchor")
    assert moved["order"] > anchor["order"]


def test_chat_openai_failure_returns_friendly_message(token, board):
    with patch("routers.chat.client") as mock_client:
        mock_client.chat.completions.create.side_effect = RuntimeError("boom")
        resp = client.post(
            "/api/chat",
            json={"message": "hi", "board_id": board["id"]},
            headers=_auth(token),
        )
    assert resp.status_code == 200
    body = resp.json()
    assert body["board_changed"] is False
    # Should NOT leak raw exception text.
    assert "boom" not in body["response"]
