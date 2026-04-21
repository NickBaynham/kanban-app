from sqlalchemy import Column, Integer, String, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base

class Board(Base):
    __tablename__ = "boards"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    
    columns = relationship("ColumnModel", back_populates="board", cascade="all, delete-orphan", order_by="ColumnModel.order")


class ColumnModel(Base):
    __tablename__ = "columns"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    order = Column(Integer)
    board_id = Column(Integer, ForeignKey("boards.id"))
    
    board = relationship("Board", back_populates="columns")
    cards = relationship("Card", back_populates="column", cascade="all, delete-orphan", order_by="Card.order")


class Card(Base):
    __tablename__ = "cards"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    details = Column(Text, nullable=True)
    order = Column(Integer)
    column_id = Column(Integer, ForeignKey("columns.id"))
    
    column = relationship("ColumnModel", back_populates="cards")
