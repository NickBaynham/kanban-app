import type { BoardSnapshot, CardData, ColumnDef } from "./boardTypes";

export function createInitialState(): BoardSnapshot {
  const columns: ColumnDef[] = [
    { id: "c0", title: "Backlog" },
    { id: "c1", title: "Ready" },
    { id: "c2", title: "In progress" },
    { id: "c3", title: "Review" },
    { id: "c4", title: "Done" },
  ];

  const cardsById: Record<string, CardData> = {
    k1: {
      id: "k1",
      title: "Design board layout",
      details: "Wireframe the five columns and card chrome.",
    },
    k2: {
      id: "k2",
      title: "Pick drag-and-drop library",
      details: "Evaluate dnd-kit vs alternatives; keep bundle small.",
    },
    k3: {
      id: "k3",
      title: "Implement column rename",
      details: "Inline edit in header; no persistence.",
    },
    k4: {
      id: "k4",
      title: "Add card form",
      details: "Title + details; purple submit button.",
    },
    k5: {
      id: "k5",
      title: "Write Playwright smoke tests",
      details: "Rename, add, delete, drag between columns.",
    },
    k6: {
      id: "k6",
      title: "Ship MVP",
      details: "Lint, unit tests, E2E green.",
    },
  };

  const columnCardIds: Record<string, string[]> = {
    c0: ["k1", "k2"],
    c1: ["k3"],
    c2: ["k4", "k5"],
    c3: [],
    c4: ["k6"],
  };

  return { columns, cardsById, columnCardIds };
}

export function renameColumn(
  state: BoardSnapshot,
  columnId: string,
  title: string,
): BoardSnapshot {
  return {
    ...state,
    columns: state.columns.map((c) =>
      c.id === columnId ? { ...c, title } : c,
    ),
  };
}

export function addCard(
  state: BoardSnapshot,
  columnId: string,
  title: string,
  details: string,
): BoardSnapshot {
  const id = `card-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const card: CardData = { id, title, details };
  const existing = state.columnCardIds[columnId] ?? [];
  return {
    ...state,
    cardsById: { ...state.cardsById, [id]: card },
    columnCardIds: { ...state.columnCardIds, [columnId]: [...existing, id] },
  };
}

export function updateCard(
  state: BoardSnapshot,
  cardId: string,
  title: string,
  details: string,
): BoardSnapshot {
  const existing = state.cardsById[cardId];
  if (!existing) return state;
  const nextTitle = title.trim() || existing.title;
  return {
    ...state,
    cardsById: {
      ...state.cardsById,
      [cardId]: {
        ...existing,
        title: nextTitle,
        details: details.trim(),
      },
    },
  };
}

export function deleteCard(state: BoardSnapshot, cardId: string): BoardSnapshot {
  const restCards = { ...state.cardsById };
  delete restCards[cardId];
  const columnCardIds: Record<string, string[]> = {};
  for (const colId of Object.keys(state.columnCardIds)) {
    columnCardIds[colId] = state.columnCardIds[colId].filter((id) => id !== cardId);
  }
  return { ...state, cardsById: restCards, columnCardIds };
}

export function reorderCardsInColumn(
  state: BoardSnapshot,
  columnId: string,
  orderedIds: string[],
): BoardSnapshot {
  return {
    ...state,
    columnCardIds: { ...state.columnCardIds, [columnId]: orderedIds },
  };
}

export function findColumnForCard(
  state: BoardSnapshot,
  itemId: string,
): string | undefined {
  for (const col of state.columns) {
    if (col.id === itemId) return col.id;
    if (state.columnCardIds[col.id]?.includes(itemId)) return col.id;
  }
  return undefined;
}

export function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
