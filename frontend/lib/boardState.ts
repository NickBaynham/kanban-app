import type { BoardSnapshot } from "./boardTypes";

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
      [cardId]: { ...existing, title: nextTitle, details: details.trim() },
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
