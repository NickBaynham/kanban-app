import os
import pytest

DB_PATH = "/tmp/kanban_test.db"
os.environ["DATABASE_URL"] = f"sqlite:///{DB_PATH}"


@pytest.fixture(scope="session", autouse=True)
def cleanup_db():
    yield
    if os.path.exists(DB_PATH):
        os.unlink(DB_PATH)
