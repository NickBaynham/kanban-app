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
import { useState, useEffect, useCallback } from "react";
import type {
  BoardSnapshot,
  CardData,
  ColumnDef,
  BackendBoard,
  BackendColumn,
} from "@/lib/boardTypes";
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
import { MessageIcon, PanelRightCloseIcon, SparklesIcon } from "./Icons";

function mapBoardFromBackend(backendBoard: BackendBoard | null): BoardSnapshot {
  const columns: ColumnDef[] = [];
  const cardsById: Record<string, CardData> = {};
  const columnCardIds: Record<string, string[]> = {};

  if (!backendBoard?.columns) return { columns, cardsById, columnCardIds };

  backendBoard.columns.forEach((col: BackendColumn) => {
    const colId = String(col.id);
    columns.push({ id: colId, title: col.name });
    columnCardIds[colId] = [];

    (col.cards || []).forEach((card) => {
      const cardId = String(card.id);
      cardsById[cardId] = {
        id: cardId,
        title: card.title,
        details: card.details ?? "",
      };
      columnCardIds[colId].push(cardId);
    });
  });

  return { columns, cardsById, columnCardIds };
}

function extractCollapsed(backendBoard: BackendBoard | null): Record<string, boolean> {
  const collapsed: Record<string, boolean> = {};
  if (!backendBoard?.columns) return collapsed;
  backendBoard.columns.forEach((col) => {
    if (col.collapsed) collapsed[String(col.id)] = true;
  });
  return collapsed;
}

export function KanbanBoard({ boardId }: { boardId: number }) {
  const [board, setBoard] = useState<BoardSnapshot | null>(null);
  const [boardName, setBoardName] = useState<string>("");
  const [collapsedLanes, setCollapsedLanes] = useState<Record<string, boolean>>({});
  const [chatOpen, setChatOpen] = useState<boolean>(true);

  const loadBoard = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`/boards/${boardId}`);
      if (res.ok) {
        const data: BackendBoard = await res.json();
        setBoard(mapBoardFromBackend(data));
        setBoardName(data.name);
        setCollapsedLanes(extractCollapsed(data));
      }
    } catch (e) {
      console.error("Failed to load board", e);
    }
  }, [boardId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBoard();
  }, [loadBoard]);

  const toggleLane = (columnId: string) => {
    const previous = !!collapsedLanes[columnId];
    const next = !previous;
    setCollapsedLanes((prev) => ({ ...prev, [columnId]: next }));
    fetchWithAuth(`/columns/${columnId}`, {
      method: "PUT",
      body: JSON.stringify({ collapsed: next }),
    })
      .then((res) => {
        if (!res.ok) {
          setCollapsedLanes((prev) => ({ ...prev, [columnId]: previous }));
        }
      })
      .catch(() => {
        setCollapsedLanes((prev) => ({ ...prev, [columnId]: previous }));
      });
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

    const previousBoard = board;
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

    try {
      const res = await fetchWithAuth(`/cards/${activeId}`, {
        method: "PUT",
        body: JSON.stringify({ column_id: parseInt(overColumn), order: newOrder }),
      });
      if (!res.ok) setBoard(previousBoard);
    } catch (e) {
      console.error(e);
      setBoard(previousBoard);
    }
  };

  const onRename = async (id: string, title: string) => {
    if (!board) return;
    const previous = board;
    setBoard((b) => (b ? localRenameColumn(b, id, title) : b));
    try {
      const res = await fetchWithAuth(`/columns/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name: title }),
      });
      if (!res.ok) setBoard(previous);
    } catch (e) {
      console.error(e);
      setBoard(previous);
    }
  };

  const onDeleteCard = async (id: string) => {
    if (!board) return;
    const previous = board;
    setBoard((b) => (b ? localDeleteCard(b, id) : b));
    try {
      const res = await fetchWithAuth(`/cards/${id}`, { method: "DELETE" });
      if (!res.ok) setBoard(previous);
    } catch (e) {
      console.error(e);
      setBoard(previous);
    }
  };

  const onUpdateCard = async (id: string, title: string, details: string) => {
    if (!board) return;
    const previous = board;
    setBoard((b) => (b ? localUpdateCard(b, id, title, details) : b));
    try {
      const res = await fetchWithAuth(`/cards/${id}`, {
        method: "PUT",
        body: JSON.stringify({ title, details }),
      });
      if (!res.ok) setBoard(previous);
    } catch (e) {
      console.error(e);
      setBoard(previous);
    }
  };

  const onAddCard = async (colId: string, title: string, details: string) => {
    if (!board) return;
    try {
      const res = await fetchWithAuth("/cards", {
        method: "POST",
        body: JSON.stringify({ title, details, column_id: parseInt(colId), order: 0 }),
      });
      if (res.ok) {
        await loadBoard();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!board) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-[var(--color-gray)]">
        <div className="flex items-center gap-2 text-sm">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-primary)]" />
          Loading board…
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col gap-3 lg:flex-row lg:gap-4">
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <EditableProjectTitle boardId={boardId} boardName={boardName} />
            {!chatOpen && (
              <button
                type="button"
                onClick={() => setChatOpen(true)}
                className="flex items-center gap-2 self-end rounded-lg border border-[var(--color-border)] bg-white/85 px-3 py-2 text-sm font-semibold text-[var(--color-navy)] shadow-sm transition-all hover:border-[var(--color-primary)]/40 hover:bg-white hover:shadow"
                aria-label="Open AI assistant"
              >
                <SparklesIcon size={16} className="text-[var(--color-primary)]" />
                AI assistant
              </button>
            )}
          </div>
          <div className="board-scroll flex flex-1 gap-4 overflow-x-auto pb-4">
            {board.columns.map((column, laneIndex) => {
              const cardIds = board.columnCardIds[column.id] ?? [];
              const cards = cardIds.map((id) => board.cardsById[id]).filter(Boolean);
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
      {chatOpen && (
        <aside className="lg:sticky lg:top-4 lg:h-[calc(100vh-7rem)] w-full shrink-0 lg:w-[22rem] xl:w-[24rem]">
          <div className="relative h-full">
            <button
              type="button"
              onClick={() => setChatOpen(false)}
              className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Hide AI assistant"
              title="Hide assistant"
            >
              <PanelRightCloseIcon size={16} />
            </button>
            <SidebarChat boardId={boardId} onBoardChange={loadBoard} />
          </div>
        </aside>
      )}
      {!chatOpen && (
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] text-white shadow-lg shadow-[var(--color-primary)]/35 transition-transform hover:scale-105 lg:hidden"
          aria-label="Open AI assistant"
        >
          <MessageIcon size={22} />
        </button>
      )}
    </div>
  );
}
