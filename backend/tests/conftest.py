import os
import pytest

DB_PATH = "/tmp/kanban_test.db"
os.environ["DATABASE_URL"] = f"sqlite:///{DB_PATH}"
os.environ.setdefault("KANBAN_ALLOW_INSECURE_KEY", "1")


@pytest.fixture(autouse=True)
def _reset_tables():
    """Recreate the schema before every test so fixtures are isolated."""
    # Imported lazily so DATABASE_URL above is honored.
    from database import Base, engine
    import models  # noqa: F401  (registers tables on Base.metadata)

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="session", autouse=True)
def cleanup_db():
    yield
    if os.path.exists(DB_PATH):
        os.unlink(DB_PATH)
