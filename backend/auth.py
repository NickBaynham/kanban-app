from datetime import datetime, timedelta, timezone
import os
import sys

import bcrypt
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer

from database import get_db
import models

_INSECURE_FALLBACK = "insecure-development-key-change-me"


def _resolve_secret_key() -> str:
    key = os.environ.get("SECRET_KEY")
    if key:
        return key
    # Allow tests and local dev to run without env config, but never in prod.
    if os.environ.get("PYTEST_CURRENT_TEST") or os.environ.get("KANBAN_ALLOW_INSECURE_KEY") == "1":
        return _INSECURE_FALLBACK
    sys.stderr.write(
        "FATAL: SECRET_KEY environment variable is not set. Refusing to start with an insecure default.\n"
        "Generate one with `python -c 'import secrets; print(secrets.token_urlsafe(64))'` and set it via .env.\n"
    )
    raise RuntimeError("SECRET_KEY is not set")


SECRET_KEY = _resolve_secret_key()
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 1 week

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")


def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def get_password_hash(password):
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expires_at = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expires_at})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str | None = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    return user
