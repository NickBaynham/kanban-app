from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
import os
from openai import OpenAI
import json
from .api import get_or_create_board
from pydantic import BaseModel
import models

router = APIRouter()

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ.get("OPENROUTER_API_KEY", "dummy"),
)

class ChatRequest(BaseModel):
    message: str

tools = [
    {
        "type": "function",
        "function": {
            "name": "add_card",
            "description": "Add a new card to a column. VERY IMPORTANT: Find the column_id dynamically by looking at the board state provided in the system prompt.",
            "parameters": {
                "type": "object",
                "properties": {
                    "column_id": {"type": "integer"},
                    "title": {"type": "string"},
                    "details": {"type": "string"}
                },
                "required": ["column_id", "title"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_card",
            "description": "Delete a card by its ID",
            "parameters": {
                "type": "object",
                "properties": {
                    "card_id": {"type": "integer"}
                },
                "required": ["card_id"]
            }
        }
    }
]

@router.post("/chat")
def chat_with_ai(req: ChatRequest, db: Session = Depends(get_db)):
    board = get_or_create_board(db)
    
    board_state = f"Board ID: {board.id}, Name: {board.name}\n"
    for col in board.columns:
        board_state += f"Column {col.id} '{col.name}': "
        cards = [f"[ID:{c.id}] {c.title}" for c in col.cards]
        board_state += ", ".join(cards) + "\n"

    system_prompt = f"You are a helpful Kanban assistant capable of moving, creating, and deleting cards using tools. The current board state with integer IDs is:\n```\n{board_state}\n```\nHelp the user manage their tasks."
    
    try:
        response = client.chat.completions.create(
            model="openai/gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": req.message}
            ],
            tools=tools,
        )
    except Exception as e:
        return {"response": f"AI Error: {str(e)}", "board_changed": False}
        
    choice = response.choices[0]
    
    if getattr(choice.message, "tool_calls", None):
        for tool_call in choice.message.tool_calls:
            if tool_call.function.name == "add_card":
                args = json.loads(tool_call.function.arguments)
                new_card = models.Card(
                    title=args["title"],
                    details=args.get("details", ""),
                    column_id=args["column_id"],
                    order=999
                )
                db.add(new_card)
                db.commit()
            elif tool_call.function.name == "delete_card":
                args = json.loads(tool_call.function.arguments)
                card = db.query(models.Card).filter(models.Card.id == args["card_id"]).first()
                if card:
                    db.delete(card)
                    db.commit()
        return {"response": "I've made the requested changes to your board.", "board_changed": True}
    
    return {"response": choice.message.content or "Done.", "board_changed": False}
