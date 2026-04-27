import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


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


@pytest.fixture
def token():
    return _register_login("testuser", "testpassword")


@pytest.fixture
def board(token):
    resp = client.post("/api/boards", json={"name": "Test Board"}, headers=_auth(token))
    assert resp.status_code == 200
    return resp.json()


# ── Auth ─────────────────────────────────────────────────────────────────────

def test_register_and_login():
    tok = _register_login("logintest", "password123")
    assert tok and len(tok) > 10


def test_login_wrong_password(token):
    resp = client.post(
        "/api/login",
        data={"username": "testuser", "password": "wrongpassword"},
    )
    assert resp.status_code == 401


def test_boards_require_auth():
    resp = client.get("/api/boards")
    assert resp.status_code == 401


# ── Boards ───────────────────────────────────────────────────────────────────

def test_create_board(token):
    resp = client.post("/api/boards", json={"name": "New Board"}, headers=_auth(token))
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "New Board"
    assert len(data["columns"]) == 5
    assert [c["name"] for c in data["columns"]] == [
        "To Do",
        "In Progress",
        "In Review",
        "Testing",
        "Done",
    ]


def test_get_boards(token, board):
    resp = client.get("/api/boards", headers=_auth(token))
    assert resp.status_code == 200
    assert board["id"] in [b["id"] for b in resp.json()]


def test_get_board(token, board):
    resp = client.get(f"/api/boards/{board['id']}", headers=_auth(token))
    assert resp.status_code == 200
    assert resp.json()["name"] == "Test Board"


def test_get_board_not_found(token):
    resp = client.get("/api/boards/999999", headers=_auth(token))
    assert resp.status_code == 404


def test_delete_board(token, board):
    del_resp = client.delete(f"/api/boards/{board['id']}", headers=_auth(token))
    assert del_resp.status_code == 200
    assert client.get(f"/api/boards/{board['id']}", headers=_auth(token)).status_code == 404


def test_rename_board(token, board):
    resp = client.put(
        f"/api/boards/{board['id']}",
        json={"name": "Renamed Board"},
        headers=_auth(token),
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Renamed Board"


def test_rename_board_not_found(token):
    resp = client.put("/api/boards/999999", json={"name": "Ghost"}, headers=_auth(token))
    assert resp.status_code == 404


# ── Cards ────────────────────────────────────────────────────────────────────

def test_create_card(token, board):
    col_id = board["columns"][0]["id"]
    resp = client.post(
        "/api/cards",
        json={"title": "My Card", "details": "Some details", "column_id": col_id, "order": 0},
        headers=_auth(token),
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "My Card"


def test_update_card(token, board):
    col_id = board["columns"][0]["id"]
    card = client.post(
        "/api/cards",
        json={"title": "Original", "details": "", "column_id": col_id, "order": 0},
        headers=_auth(token),
    ).json()
    resp = client.put(
        f"/api/cards/{card['id']}",
        json={"title": "Updated", "details": "New details"},
        headers=_auth(token),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["title"] == "Updated"
    assert body["details"] == "New details"


def test_move_card_to_another_column(token, board):
    src_col_id = board["columns"][0]["id"]
    dst_col_id = board["columns"][4]["id"]
    card = client.post(
        "/api/cards",
        json={"title": "Movable", "details": "", "column_id": src_col_id, "order": 0},
        headers=_auth(token),
    ).json()
    resp = client.put(
        f"/api/cards/{card['id']}",
        json={"column_id": dst_col_id, "order": 0},
        headers=_auth(token),
    )
    assert resp.status_code == 200
    assert resp.json()["column_id"] == dst_col_id


def test_delete_card(token, board):
    col_id = board["columns"][0]["id"]
    card = client.post(
        "/api/cards",
        json={"title": "To Delete", "details": "", "column_id": col_id, "order": 0},
        headers=_auth(token),
    ).json()
    resp = client.delete(f"/api/cards/{card['id']}", headers=_auth(token))
    assert resp.status_code == 200


# ── Cross-user authorization ─────────────────────────────────────────────────

def test_board_isolation_between_users(token):
    other_token = _register_login("otheruser", "otherpassword")
    resp = client.post("/api/boards", json={"name": "Other Board"}, headers=_auth(other_token))
    other_board_id = resp.json()["id"]
    assert client.get(f"/api/boards/{other_board_id}", headers=_auth(token)).status_code == 404


def test_other_user_cannot_update_card(token, board):
    col_id = board["columns"][0]["id"]
    card = client.post(
        "/api/cards",
        json={"title": "Owner card", "details": "", "column_id": col_id, "order": 0},
        headers=_auth(token),
    ).json()
    other_token = _register_login("attacker", "pw1234567")
    resp = client.put(
        f"/api/cards/{card['id']}",
        json={"title": "Hijacked"},
        headers=_auth(other_token),
    )
    assert resp.status_code == 404
    fresh = client.get(f"/api/boards/{board['id']}", headers=_auth(token)).json()
    titles = [c["title"] for col in fresh["columns"] for c in col["cards"]]
    assert "Hijacked" not in titles


def test_other_user_cannot_delete_card(token, board):
    col_id = board["columns"][0]["id"]
    card = client.post(
        "/api/cards",
        json={"title": "Owner card", "details": "", "column_id": col_id, "order": 0},
        headers=_auth(token),
    ).json()
    other_token = _register_login("attacker", "pw1234567")
    resp = client.delete(f"/api/cards/{card['id']}", headers=_auth(other_token))
    assert resp.status_code == 404


def test_other_user_cannot_update_column(token, board):
    col_id = board["columns"][0]["id"]
    other_token = _register_login("attacker", "pw1234567")
    resp = client.put(
        f"/api/columns/{col_id}",
        json={"name": "Pwned"},
        headers=_auth(other_token),
    )
    assert resp.status_code == 404


def test_other_user_cannot_create_card_in_column(token, board):
    col_id = board["columns"][0]["id"]
    other_token = _register_login("attacker", "pw1234567")
    resp = client.post(
        "/api/cards",
        json={"title": "Inserted", "details": "", "column_id": col_id, "order": 0},
        headers=_auth(other_token),
    )
    assert resp.status_code == 404


def test_cannot_move_card_to_other_users_column(token, board):
    col_id = board["columns"][0]["id"]
    card = client.post(
        "/api/cards",
        json={"title": "Mine", "details": "", "column_id": col_id, "order": 0},
        headers=_auth(token),
    ).json()

    other_token = _register_login("victim", "pw1234567")
    other_board = client.post(
        "/api/boards", json={"name": "Other"}, headers=_auth(other_token)
    ).json()
    other_col_id = other_board["columns"][0]["id"]

    resp = client.put(
        f"/api/cards/{card['id']}",
        json={"column_id": other_col_id},
        headers=_auth(token),
    )
    assert resp.status_code == 404


# ── Columns ──────────────────────────────────────────────────────────────────

def test_column_collapsed_defaults_false(board):
    for col in board["columns"]:
        assert col["collapsed"] is False


def test_collapse_and_expand_column(token, board):
    col_id = board["columns"][0]["id"]

    resp = client.put(f"/api/columns/{col_id}", json={"collapsed": True}, headers=_auth(token))
    assert resp.status_code == 200
    assert resp.json()["collapsed"] is True

    resp = client.put(f"/api/columns/{col_id}", json={"collapsed": False}, headers=_auth(token))
    assert resp.status_code == 200
    assert resp.json()["collapsed"] is False


def test_rename_column(token, board):
    col_id = board["columns"][2]["id"]
    resp = client.put(f"/api/columns/{col_id}", json={"name": "Review"}, headers=_auth(token))
    assert resp.status_code == 200
    assert resp.json()["name"] == "Review"


def test_column_update_name_and_collapsed_together(token, board):
    col_id = board["columns"][1]["id"]
    resp = client.put(
        f"/api/columns/{col_id}",
        json={"name": "Active", "collapsed": True},
        headers=_auth(token),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Active"
    assert data["collapsed"] is True


# ── Card order normalization on create ───────────────────────────────────────

def test_create_card_assigns_increasing_order(token, board):
    col_id = board["columns"][0]["id"]
    a = client.post(
        "/api/cards",
        json={"title": "A", "details": "", "column_id": col_id, "order": 0},
        headers=_auth(token),
    ).json()
    b = client.post(
        "/api/cards",
        json={"title": "B", "details": "", "column_id": col_id, "order": 1},
        headers=_auth(token),
    ).json()
    assert a["order"] == 0
    assert b["order"] == 1
