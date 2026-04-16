"use client";

import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useState } from "react";
import type { BoardSnapshot } from "@/lib/boardTypes";
import {
  addCard,
  arrayMove,
  createInitialState,
  deleteCard,
  findColumnForCard,
  renameColumn,
  reorderCardsInColumn,
  updateCard,
} from "@/lib/boardState";
import { EditableProjectTitle } from "./EditableProjectTitle";
import { KanbanColumn } from "./KanbanColumn";

export function KanbanBoard() {
  const [board, setBoard] = useState<BoardSnapshot>(createInitialState);
  const [collapsedLanes, setCollapsedLanes] = useState<Record<string, boolean>>({});

  const toggleLane = (columnId: string) => {
    setCollapsedLanes((prev) => ({ ...prev, [columnId]: !prev[columnId] }));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeColumn = findColumnForCard(board, activeId);
    const overColumn = findColumnForCard(board, overId);
    if (!activeColumn || !overColumn) return;

    if (activeColumn === overColumn) {
      const items = [...(board.columnCardIds[activeColumn] ?? [])];
      const oldIndex = items.indexOf(activeId);
      const newIndex = items.indexOf(overId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
      setBoard(reorderCardsInColumn(board, activeColumn, arrayMove(items, oldIndex, newIndex)));
      return;
    }

    const sourceItems = [...(board.columnCardIds[activeColumn] ?? [])];
    const destItems = [...(board.columnCardIds[overColumn] ?? [])];
    const fromIndex = sourceItems.indexOf(activeId);
    if (fromIndex === -1) return;
    sourceItems.splice(fromIndex, 1);

    let toIndex: number;
    if (overId === overColumn) {
      toIndex = destItems.length;
    } else {
      const idx = destItems.indexOf(overId);
      toIndex = idx === -1 ? destItems.length : idx;
    }
    destItems.splice(toIndex, 0, activeId);

    setBoard({
      ...board,
      columnCardIds: {
        ...board.columnCardIds,
        [activeColumn]: sourceItems,
        [overColumn]: destItems,
      },
    });
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <EditableProjectTitle />
      <div className="board-scroll flex gap-5 overflow-x-auto pb-5">
        {board.columns.map((column, laneIndex) => {
          const cardIds = board.columnCardIds[column.id] ?? [];
          const cards = cardIds
            .map((id) => board.cardsById[id])
            .filter(Boolean);
          return (
            <KanbanColumn
              key={column.id}
              column={column}
              cardIds={cardIds}
              cards={cards}
              laneIndex={laneIndex}
              collapsed={!!collapsedLanes[column.id]}
              onToggleCollapse={() => toggleLane(column.id)}
              onRename={(id, title) => setBoard((b) => renameColumn(b, id, title))}
              onDeleteCard={(id) => setBoard((b) => deleteCard(b, id))}
              onUpdateCard={(id, title, details) =>
                setBoard((b) => updateCard(b, id, title, details))
              }
              onAddCard={(col, title, details) =>
                setBoard((b) => addCard(b, col, title, details))
              }
            />
          );
        })}
      </div>
    </DndContext>
  );
}
