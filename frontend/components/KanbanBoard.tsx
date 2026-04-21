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
import { useState, useEffect } from "react";
import type { BoardSnapshot, CardData, ColumnDef } from "@/lib/boardTypes";
import {
  arrayMove,
  deleteCard as localDeleteCard,
  findColumnForCard,
  renameColumn as localRenameColumn,
  reorderCardsInColumn,
  updateCard as localUpdateCard,
} from "@/lib/boardState";
import { EditableProjectTitle } from "./EditableProjectTitle";
import { KanbanColumn } from "./KanbanColumn";
import { fetchWithAuth } from "@/lib/apiClient";
import SidebarChat from "./SidebarChat";

// Helper to map backend format to frontend format
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBoardFromBackend(backendBoard: any): BoardSnapshot {
  const columns: ColumnDef[] = [];
  const cardsById: Record<string, CardData> = {};
  const columnCardIds: Record<string, string[]> = {};

  if (!backendBoard || !backendBoard.columns) return { columns, cardsById, columnCardIds };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  backendBoard.columns.forEach((col: any) => {
    const colId = String(col.id);
    columns.push({ id: colId, title: col.name });
    columnCardIds[colId] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (col.cards || []).forEach((card: any) => {
      const cardId = String(card.id);
      cardsById[cardId] = { id: cardId, title: card.title, details: card.details || "" };
      columnCardIds[colId].push(cardId);
    });
  });

  return { columns, cardsById, columnCardIds };
}

export function KanbanBoard() {
  const [board, setBoard] = useState<BoardSnapshot | null>(null);
  const [collapsedLanes, setCollapsedLanes] = useState<Record<string, boolean>>({});

  const loadBoard = async () => {
    try {
      const res = await fetchWithAuth("/board");
      if (res.ok) {
        const data = await res.json();
        setBoard(mapBoardFromBackend(data));
      }
    } catch (e) {
      console.error("Failed to load board", e);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBoard();
  }, []);

  const toggleLane = (columnId: string) => {
    setCollapsedLanes((prev) => ({ ...prev, [columnId]: !prev[columnId] }));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!board) return;
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeColumn = findColumnForCard(board, activeId);
    const overColumn = findColumnForCard(board, overId);
    if (!activeColumn || !overColumn) return;

    // Local Optimistic Update
    let newBoard = board;
    let newOrder = 0;
    
    if (activeColumn === overColumn) {
      const items = [...(board.columnCardIds[activeColumn] ?? [])];
      const oldIndex = items.indexOf(activeId);
      const newIndex = items.indexOf(overId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
      newBoard = reorderCardsInColumn(board, activeColumn, arrayMove(items, oldIndex, newIndex));
      setBoard(newBoard);
      newOrder = newIndex;
    } else {
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

      newBoard = {
        ...board,
        columnCardIds: {
          ...board.columnCardIds,
          [activeColumn]: sourceItems,
          [overColumn]: destItems,
        },
      };
      setBoard(newBoard);
      newOrder = toIndex;
    }

    // Backend Sync
    try {
      await fetchWithAuth(`/cards/${activeId}`, {
        method: "PUT",
        body: JSON.stringify({
          column_id: parseInt(overColumn),
          order: newOrder
        })
      });
      // Optionally reload to ensure sync
      // await loadBoard();
    } catch(e) {
      console.error(e);
    }
  };

  const onRename = async (id: string, title: string) => {
    if (!board) return;
    setBoard((b) => localRenameColumn(b!, id, title));
    await fetchWithAuth(`/columns/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name: title })
    });
  };

  const onDeleteCard = async (id: string) => {
    if (!board) return;
    setBoard((b) => localDeleteCard(b!, id));
    await fetchWithAuth(`/cards/${id}`, { method: "DELETE" });
  };

  const onUpdateCard = async (id: string, title: string, details: string) => {
    if (!board) return;
    setBoard((b) => localUpdateCard(b!, id, title, details));
    await fetchWithAuth(`/cards/${id}`, {
      method: "PUT",
      body: JSON.stringify({ title, details })
    });
  };

  const onAddCard = async (colId: string, title: string, details: string) => {
    if (!board) return;
    // Local optimistic update via temporary ID
    // We wait for real backend add instead to get the correct numeric ID
    try {
      const res = await fetchWithAuth("/cards", {
        method: "POST",
        body: JSON.stringify({ title, details, column_id: parseInt(colId), order: 999 })
      });
      if (res.ok) {
        // Just reload board for simplicity when adding card
        await loadBoard();
      }
    } catch(e) {
      console.error(e);
    }
  };

  if (!board) return <div className="p-4 text-[var(--color-gray)]">Loading...</div>;

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full h-full min-h-[70vh]">
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="flex-1 flex flex-col min-w-0">
          <EditableProjectTitle />
          <div className="board-scroll flex gap-5 overflow-x-auto pb-5 flex-1">
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
                  onRename={onRename}
                  onDeleteCard={onDeleteCard}
                  onUpdateCard={onUpdateCard}
                  onAddCard={onAddCard}
                />
              );
            })}
          </div>
        </div>
      </DndContext>
      <div className="w-full lg:w-80 flex-shrink-0">
         <SidebarChat onBoardChange={loadBoard} />
      </div>
    </div>
  );
}
