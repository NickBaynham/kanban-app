from pydantic import BaseModel
from typing import List, Optional

class CardBase(BaseModel):
    title: str
    details: Optional[str] = None
    order: int

class CardCreate(CardBase):
    column_id: int

class CardUpdate(BaseModel):
    title: Optional[str] = None
    details: Optional[str] = None
    order: Optional[int] = None
    column_id: Optional[int] = None

class CardOutput(CardBase):
    id: int
    column_id: int
    class Config:
        from_attributes = True

class ColumnBase(BaseModel):
    name: str
    order: int

class ColumnUpdate(BaseModel):
    name: str

class ColumnOutput(ColumnBase):
    id: int
    board_id: int
    cards: List[CardOutput] = []
    class Config:
        from_attributes = True

class BoardOutput(BaseModel):
    id: int
    name: str
    columns: List[ColumnOutput] = []
    class Config:
        from_attributes = True
