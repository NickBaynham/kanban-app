export type ColumnDef = { id: string; title: string };

export type CardData = { id: string; title: string; details: string };

export type BoardSnapshot = {
  columns: ColumnDef[];
  cardsById: Record<string, CardData>;
  columnCardIds: Record<string, string[]>;
};
