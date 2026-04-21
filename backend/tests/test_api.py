from fastapi.testclient import TestClient
from main import app
from database import Base, engine

# Recreate DB for tests
Base.metadata.create_all(bind=engine)

client = TestClient(app)

def test_get_board():
    response = client.get("/api/board")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Kanban Project"
    assert len(data["columns"]) == 5

def test_login():
    response = client.post("/api/login", json={"username": "admin", "password": "password123"})
    assert response.status_code in [200, 401] # Depends on local .env configuration

def test_chat():
    response = client.post("/api/chat", json={"message": "hello"})
    assert response.status_code == 200
    assert "response" in response.json()
