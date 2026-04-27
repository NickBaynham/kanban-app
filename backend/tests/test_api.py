import pytest
from fastapi.testclient import TestClient
from main import app
from database import Base, engine

Base.metadata.create_all(bind=engine)

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


@pytest.fixture(scope="module")
def token():
    return _register_login("testuser", "testpassword")


@pytest.fixture(scope="module")
def board(token):
    resp = client.post("/api/boards", json={"name": "Test Board"}, headers=_auth(token))
    assert resp.status_code == 200
    return resp.json()


# Auth tests

def test_register_and_login():
    tok = _register_login("logintest", "password123")
    assert tok is not None and len(tok) > 10


def test_login_wrong_password():
    resp = client.post(
        "/api/login",
        data={"username": "testuser", "password": "wrongpassword"},
    )
    assert resp.status_code == 401


def test_boards_require_auth():
    resp = client.get("/api/boards")
    assert resp.status_code == 401


# Board tests

def test_create_board(token):
    resp = client.post("/api/boards", json={"name": "New Board"}, headers=_auth(token))
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "New Board"
    assert len(data["columns"]) == 5
    default_names = [c["name"] for c in data["columns"]]
    assert default_names == ["To Do", "In Progress", "In Review", "Testing", "Done"]


def test_get_boards(token, board):
    resp = client.get("/api/boards", headers=_auth(token))
    assert resp.status_code == 200
    ids = [b["id"] for b in resp.json()]
    assert board["id"] in ids


def test_get_board(token, board):
    resp = client.get(f"/api/boards/{board['id']}", headers=_auth(token))
    assert resp.status_code == 200
    assert resp.json()["name"] == "Test Board"


def test_get_board_not_found(token):
    resp = client.get("/api/boards/999999", headers=_auth(token))
    assert resp.status_code == 404


def test_delete_board(token):
    resp = client.post("/api/boards", json={"name": "To Delete"}, headers=_auth(token))
    board_id = resp.json()["id"]
    del_resp = client.delete(f"/api/boards/{board_id}", headers=_auth(token))
    assert del_resp.status_code == 200
    assert client.get(f"/api/boards/{board_id}", headers=_auth(token)).status_code == 404


# Card tests

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
    assert resp.json()["title"] == "Updated"
    assert resp.json()["details"] == "New details"


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


def test_board_isolation_between_users(token):
    other_token = _register_login("otheruser", "otherpassword")
    resp = client.post("/api/boards", json={"name": "Other Board"}, headers=_auth(other_token))
    other_board_id = resp.json()["id"]
    assert client.get(f"/api/boards/{other_board_id}", headers=_auth(token)).status_code == 404


# Rename board

def test_rename_board(token, board):
    resp = client.put(
        f"/api/boards/{board['id']}",
        json={"name": "Renamed Board"},
        headers=_auth(token),
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Renamed Board"
    # Rename back
    client.put(f"/api/boards/{board['id']}", json={"name": "Test Board"}, headers=_auth(token))


def test_rename_board_not_found(token):
    resp = client.put("/api/boards/999999", json={"name": "Ghost"}, headers=_auth(token))
    assert resp.status_code == 404


# Column collapsed state

def test_column_collapsed_defaults_false(board):
    for col in board["columns"]:
        assert col["collapsed"] is False


def test_collapse_and_expand_column(token, board):
    col_id = board["columns"][0]["id"]

    # Collapse
    resp = client.put(f"/api/columns/{col_id}", json={"collapsed": True}, headers=_auth(token))
    assert resp.status_code == 200
    assert resp.json()["collapsed"] is True

    # Expand
    resp = client.put(f"/api/columns/{col_id}", json={"collapsed": False}, headers=_auth(token))
    assert resp.status_code == 200
    assert resp.json()["collapsed"] is False


def test_rename_column(token, board):
    col_id = board["columns"][2]["id"]
    resp = client.put(f"/api/columns/{col_id}", json={"name": "Review"}, headers=_auth(token))
    assert resp.status_code == 200
    assert resp.json()["name"] == "Review"
    # Rename back
    client.put(f"/api/columns/{col_id}", json={"name": "In Review"}, headers=_auth(token))


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
    # Restore
    client.put(f"/api/columns/{col_id}", json={"name": "In Progress", "collapsed": False}, headers=_auth(token))
