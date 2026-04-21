from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
import models
import schemas
import os

router = APIRouter()

def get_or_create_board(db: Session) -> models.Board:
    board = db.query(models.Board).first()
    if not board:
        board = models.Board(name="Kanban Project")
        db.add(board)
        db.flush()
        columns = ["To Do", "In Progress", "In Review", "Testing", "Done"]
        for idx, col_name in enumerate(columns):
            db.add(models.ColumnModel(name=col_name, order=idx, board_id=board.id))
        db.commit()
        db.refresh(board)
    return board

@router.get("/board", response_model=schemas.BoardOutput)
def get_board(db: Session = Depends(get_db)):
    return get_or_create_board(db)

@router.put("/columns/{column_id}", response_model=schemas.ColumnOutput)
def update_column(column_id: int, col_in: schemas.ColumnUpdate, db: Session = Depends(get_db)):
    column = db.query(models.ColumnModel).filter(models.ColumnModel.id == column_id).first()
    if not column:
        raise HTTPException(status_code=404, detail="Column not found")
    column.name = col_in.name
    db.commit()
    db.refresh(column)
    return column

@router.post("/cards", response_model=schemas.CardOutput)
def create_card(card_in: schemas.CardCreate, db: Session = Depends(get_db)):
    card = models.Card(**card_in.model_dump())
    db.add(card)
    db.commit()
    db.refresh(card)
    return card

@router.put("/cards/{card_id}", response_model=schemas.CardOutput)
def update_card(card_id: int, card_in: schemas.CardUpdate, db: Session = Depends(get_db)):
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
def delete_card(card_id: int, db: Session = Depends(get_db)):
    card = db.query(models.Card).filter(models.Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    db.delete(card)
    db.commit()
    return {"ok": True}


class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login")
def login(req: LoginRequest):
    expected_password = os.environ.get("PASSWORD", "password123")
    if req.username == "admin" and req.password == expected_password:
        return {"token": "dummy_token"}
    raise HTTPException(status_code=401, detail="Invalid credentials")
