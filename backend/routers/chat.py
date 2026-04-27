from fastapi import APIRouter, Depends, HTTPException
import auth
from sqlalchemy.orm import Session
from database import get_db
import os
from openai import OpenAI
import json
from pydantic import BaseModel
import models

router = APIRouter()

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ.get("OPENROUTER_API_KEY", "dummy"),
)

class ChatRequest(BaseModel):
    message: str
    board_id: int

tools = [
    {
        "type": "function",
        "function": {
            "name": "create_card",
            "description": "Create a new card in a column. Find column_id from the board state.",
            "parameters": {
                "type": "object",
                "properties": {
                    "column_id": {"type": "integer"},
                    "title": {"type": "string"},
                    "details": {"type": "string"},
                },
                "required": ["column_id", "title"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_card",
            "description": "Update a card's title and/or details. Find card_id from the board state.",
            "parameters": {
                "type": "object",
                "properties": {
                    "card_id": {"type": "integer"},
                    "title": {"type": "string"},
                    "details": {"type": "string"},
                },
                "required": ["card_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "move_card",
            "description": "Move a card to a different column. Find card_id and column_id from the board state.",
            "parameters": {
                "type": "object",
                "properties": {
                    "card_id": {"type": "integer"},
                    "column_id": {"type": "integer"},
                },
                "required": ["card_id", "column_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_card",
            "description": "Delete a card by its ID. Find card_id from the board state.",
            "parameters": {
                "type": "object",
                "properties": {
                    "card_id": {"type": "integer"},
                },
                "required": ["card_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "rename_board",
            "description": "Rename the kanban board.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                },
                "required": ["name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "rename_lane",
            "description": "Rename a lane/column. Find column_id from the board state.",
            "parameters": {
                "type": "object",
                "properties": {
                    "column_id": {"type": "integer"},
                    "name": {"type": "string"},
                },
                "required": ["column_id", "name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "toggle_lane",
            "description": "Collapse or expand a lane/column. Find column_id from the board state.",
            "parameters": {
                "type": "object",
                "properties": {
                    "column_id": {"type": "integer"},
                    "collapsed": {"type": "boolean"},
                },
                "required": ["column_id", "collapsed"],
            },
        },
    },
]


@router.post("/chat")
def chat_with_ai(req: ChatRequest, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    board = db.query(models.Board).filter(models.Board.id == req.board_id, models.Board.user_id == current_user.id).first()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")

    board_state = f"Board ID: {board.id}, Name: '{board.name}'\n"
    for col in board.columns:
        status = "collapsed" if col.collapsed else "open"
        board_state += f"Column {col.id} '{col.name}' [{status}]: "
        cards = [f"[ID:{c.id}] {c.title}" for c in col.cards]
        board_state += (", ".join(cards) if cards else "(empty)") + "\n"

    system_prompt = (
        "You are a helpful Kanban assistant. You can create, update, move, and delete cards; "
        "rename the board; rename, collapse, and expand lanes. "
        "Always look up IDs from the board state below — never guess.\n\n"
        f"Current board state:\n```\n{board_state}```"
    )

    try:
        response = client.chat.completions.create(
            model="openai/gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": req.message},
            ],
            tools=tools,
        )
    except Exception as e:
        return {"response": f"AI Error: {str(e)}", "board_changed": False}

    choice = response.choices[0]

    if not getattr(choice.message, "tool_calls", None):
        return {"response": choice.message.content or "Done.", "board_changed": False}

    for tool_call in choice.message.tool_calls:
        name = tool_call.function.name
        args = json.loads(tool_call.function.arguments)

        if name == "create_card":
            db.add(models.Card(
                title=args["title"],
                details=args.get("details", ""),
                column_id=args["column_id"],
                order=999,
            ))
            db.commit()

        elif name == "update_card":
            card = db.query(models.Card).filter(models.Card.id == args["card_id"]).first()
            if card:
                if "title" in args:
                    card.title = args["title"]
                if "details" in args:
                    card.details = args["details"]
                db.commit()

        elif name == "move_card":
            card = db.query(models.Card).filter(models.Card.id == args["card_id"]).first()
            if card:
                card.column_id = args["column_id"]
                db.commit()

        elif name == "delete_card":
            card = db.query(models.Card).filter(models.Card.id == args["card_id"]).first()
            if card:
                db.delete(card)
                db.commit()

        elif name == "rename_board":
            board.name = args["name"]
            db.commit()

        elif name == "rename_lane":
            col = db.query(models.ColumnModel).filter(models.ColumnModel.id == args["column_id"]).first()
            if col:
                col.name = args["name"]
                db.commit()

        elif name == "toggle_lane":
            col = db.query(models.ColumnModel).filter(models.ColumnModel.id == args["column_id"]).first()
            if col:
                col.collapsed = args["collapsed"]
                db.commit()

    return {"response": "I've made the requested changes to your board.", "board_changed": True}
