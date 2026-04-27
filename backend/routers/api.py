from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from datetime import timedelta
from database import get_db
import models
import schemas
import os
import auth

router = APIRouter()

from typing import List

def create_default_columns(db: Session, board_id: int):
    columns = ["To Do", "In Progress", "In Review", "Testing", "Done"]
    for idx, col_name in enumerate(columns):
        db.add(models.ColumnModel(name=col_name, order=idx, board_id=board_id))
    db.commit()

@router.get("/boards", response_model=List[schemas.BoardOutput])
def get_boards(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Board).filter(models.Board.user_id == current_user.id).all()

@router.post("/boards", response_model=schemas.BoardOutput)
def create_board(board_in: schemas.BoardCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    board = models.Board(name=board_in.name, user_id=current_user.id)
    db.add(board)
    db.commit()
    db.refresh(board)
    create_default_columns(db, board.id)
    db.refresh(board)
    return board

@router.get("/boards/{board_id}", response_model=schemas.BoardOutput)
def get_board(board_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    board = db.query(models.Board).filter(models.Board.id == board_id, models.Board.user_id == current_user.id).first()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    return board

@router.put("/boards/{board_id}", response_model=schemas.BoardOutput)
def update_board(board_id: int, board_in: schemas.BoardUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    board = db.query(models.Board).filter(models.Board.id == board_id, models.Board.user_id == current_user.id).first()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    board.name = board_in.name
    db.commit()
    db.refresh(board)
    return board

@router.delete("/boards/{board_id}")
def delete_board(board_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    board = db.query(models.Board).filter(models.Board.id == board_id, models.Board.user_id == current_user.id).first()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    db.delete(board)
    db.commit()
    return {"ok": True}

@router.put("/columns/{column_id}", response_model=schemas.ColumnOutput)
def update_column(column_id: int, col_in: schemas.ColumnUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    column = db.query(models.ColumnModel).filter(models.ColumnModel.id == column_id).first()
    if not column:
        raise HTTPException(status_code=404, detail="Column not found")
    if col_in.name is not None:
        column.name = col_in.name
    if col_in.collapsed is not None:
        column.collapsed = col_in.collapsed
    db.commit()
    db.refresh(column)
    return column

@router.post("/cards", response_model=schemas.CardOutput)
def create_card(card_in: schemas.CardCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    card = models.Card(**card_in.model_dump())
    db.add(card)
    db.commit()
    db.refresh(card)
    return card

@router.put("/cards/{card_id}", response_model=schemas.CardOutput)
def update_card(card_id: int, card_in: schemas.CardUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    card = db.query(models.Card).filter(models.Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    update_data = card_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(card, key, value)
    db.commit()
    db.refresh(card)
    return card

@router.delete("/cards/{card_id}")
def delete_card(card_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    card = db.query(models.Card).filter(models.Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    db.delete(card)
    db.commit()
    return {"ok": True}
@router.post("/register", response_model=schemas.UserOutput)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user_in.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = auth.get_password_hash(user_in.password)
    db_user = models.User(username=user_in.username, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

class Token(BaseModel):
    access_token: str
    token_type: str

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}
