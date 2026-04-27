import json
import logging
import os
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session
from openai import OpenAI

import auth
import models
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter()

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ.get("OPENROUTER_API_KEY", "dummy"),
)

MAX_TOOL_TURNS = 5

tools = [
    {
        "type": "function",
        "function": {
            "name": "create_card",
            "description": "Create a new card in a column on the current board.",
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
            "description": "Update a card's title and/or details.",
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
            "description": "Move a card to a different column.",
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
            "description": "Delete a card by its ID.",
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
            "description": "Rename the current kanban board.",
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
            "description": "Rename a lane/column.",
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
            "description": "Collapse or expand a lane/column.",
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


class ChatRequest(BaseModel):
    message: str
    board_id: int


def _board_state_text(board: models.Board) -> str:
    out = f"Board ID: {board.id}, Name: '{board.name}'\n"
    for col in board.columns:
        s = "collapsed" if col.collapsed else "open"
        out += f"  Column [ID:{col.id}] '{col.name}' [{s}]\n"
        for c in col.cards:
            out += f"    - Card [ID:{c.id}] {c.title}\n"
    return out


def _next_order(db: Session, column_id: int) -> int:
    max_order = (
        db.query(func.max(models.Card.order))
        .filter(models.Card.column_id == column_id)
        .scalar()
    )
    return (max_order + 1) if max_order is not None else 0


def _column_in_board(db: Session, column_id: int, board_id: int) -> models.ColumnModel | None:
    return (
        db.query(models.ColumnModel)
        .filter(models.ColumnModel.id == column_id, models.ColumnModel.board_id == board_id)
        .first()
    )


def _card_in_board(db: Session, card_id: int, board_id: int) -> models.Card | None:
    return (
        db.query(models.Card)
        .join(models.ColumnModel, models.Card.column_id == models.ColumnModel.id)
        .filter(models.Card.id == card_id, models.ColumnModel.board_id == board_id)
        .first()
    )


def _execute_tool(name: str, args: dict[str, Any], db: Session, board: models.Board) -> dict[str, Any]:
    """Execute a single tool call, scoped to the user's board. Returns a result dict."""
    try:
        if name == "create_card":
            column_id = int(args["column_id"])
            col = _column_in_board(db, column_id, board.id)
            if not col:
                return {"ok": False, "error": f"Column {column_id} is not on this board."}
            card = models.Card(
                title=args["title"],
                details=args.get("details", "") or "",
                column_id=column_id,
                order=_next_order(db, column_id),
            )
            db.add(card)
            db.commit()
            db.refresh(card)
            return {"ok": True, "card_id": card.id, "column_id": column_id, "title": card.title}

        if name == "update_card":
            card_id = int(args["card_id"])
            card = _card_in_board(db, card_id, board.id)
            if not card:
                return {"ok": False, "error": f"Card {card_id} is not on this board."}
            if "title" in args and args["title"] is not None:
                card.title = args["title"]
            if "details" in args and args["details"] is not None:
                card.details = args["details"]
            db.commit()
            return {"ok": True, "card_id": card_id}

        if name == "move_card":
            card_id = int(args["card_id"])
            target_col_id = int(args["column_id"])
            card = _card_in_board(db, card_id, board.id)
            if not card:
                return {"ok": False, "error": f"Card {card_id} is not on this board."}
            target_col = _column_in_board(db, target_col_id, board.id)
            if not target_col:
                return {"ok": False, "error": f"Column {target_col_id} is not on this board."}
            card.column_id = target_col_id
            card.order = _next_order(db, target_col_id)
            db.commit()
            return {"ok": True, "card_id": card_id, "column_id": target_col_id}

        if name == "delete_card":
            card_id = int(args["card_id"])
            card = _card_in_board(db, card_id, board.id)
            if not card:
                return {"ok": False, "error": f"Card {card_id} is not on this board."}
            db.delete(card)
            db.commit()
            return {"ok": True, "card_id": card_id}

        if name == "rename_board":
            board.name = args["name"]
            db.commit()
            return {"ok": True, "board_id": board.id, "name": board.name}

        if name == "rename_lane":
            column_id = int(args["column_id"])
            col = _column_in_board(db, column_id, board.id)
            if not col:
                return {"ok": False, "error": f"Column {column_id} is not on this board."}
            col.name = args["name"]
            db.commit()
            return {"ok": True, "column_id": column_id, "name": col.name}

        if name == "toggle_lane":
            column_id = int(args["column_id"])
            col = _column_in_board(db, column_id, board.id)
            if not col:
                return {"ok": False, "error": f"Column {column_id} is not on this board."}
            col.collapsed = bool(args["collapsed"])
            db.commit()
            return {"ok": True, "column_id": column_id, "collapsed": col.collapsed}

        return {"ok": False, "error": f"Unknown tool: {name}"}
    except Exception as exc:
        logger.exception("Tool %s raised: %s", name, exc)
        db.rollback()
        return {"ok": False, "error": "Tool execution failed."}


@router.post("/chat")
def chat_with_ai(
    req: ChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    board = (
        db.query(models.Board)
        .filter(models.Board.id == req.board_id, models.Board.user_id == current_user.id)
        .first()
    )
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")

    system_prompt = (
        "You are a helpful Kanban assistant for the user's current board. "
        "You can create, update, move, and delete cards, rename the board, and "
        "rename, collapse, or expand lanes. Always look up IDs from the board "
        "state below — never invent IDs. If a tool returns an error, explain "
        "the issue to the user instead of retrying with the same arguments.\n\n"
        f"Current board state:\n```\n{_board_state_text(board)}```"
    )

    messages: list[dict[str, Any]] = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": req.message},
    ]

    any_tool_succeeded = False
    failures: list[str] = []
    final_text: str | None = None

    for _ in range(MAX_TOOL_TURNS):
        try:
            response = client.chat.completions.create(
                model="openai/gpt-4o-mini",
                messages=messages,
                tools=tools,
            )
        except Exception as exc:
            logger.exception("OpenRouter chat completion failed: %s", exc)
            return {
                "response": "Sorry, I couldn't reach the AI service. Please try again.",
                "board_changed": False,
            }

        choice = response.choices[0]
        msg = choice.message
        tool_calls = getattr(msg, "tool_calls", None) or []

        # Persist the assistant turn (with any tool calls) into the conversation.
        assistant_entry: dict[str, Any] = {"role": "assistant", "content": msg.content or ""}
        if tool_calls:
            assistant_entry["tool_calls"] = [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                }
                for tc in tool_calls
            ]
        messages.append(assistant_entry)

        if not tool_calls:
            final_text = msg.content or "Done."
            break

        # Dispatch every tool the model requested this turn.
        for tc in tool_calls:
            name = tc.function.name
            try:
                args = json.loads(tc.function.arguments or "{}")
            except json.JSONDecodeError:
                args = {}
            result = _execute_tool(name, args, db, board)
            if result.get("ok"):
                any_tool_succeeded = True
            else:
                failures.append(f"{name}: {result.get('error', 'unknown error')}")
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": json.dumps(result),
                }
            )

        # Refresh board state for the next turn so the model sees committed changes.
        db.refresh(board)
        messages[0]["content"] = (
            "You are a helpful Kanban assistant for the user's current board. "
            "You can create, update, move, and delete cards, rename the board, and "
            "rename, collapse, or expand lanes. Always look up IDs from the board "
            "state below.\n\n"
            f"Current board state:\n```\n{_board_state_text(board)}```"
        )
    else:
        final_text = "I tried several steps but couldn't finish; please review the board."

    response_text = final_text or "Done."
    if failures:
        response_text += "\n\nNote: " + "; ".join(failures)

    return {"response": response_text, "board_changed": any_tool_succeeded}
