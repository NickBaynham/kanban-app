export type ColumnDef = { id: string; title: string };

export type CardData = { id: string; title: string; details: string };

export type BoardSnapshot = {
  columns: ColumnDef[];
  cardsById: Record<string, CardData>;
  columnCardIds: Record<string, string[]>;
};

// Wire format from the backend (FastAPI response_model=BoardOutput).
export type BackendCard = {
  id: number;
  title: string;
  details: string | null;
  order: number;
  column_id: number;
};

export type BackendColumn = {
  id: number;
  name: string;
  order: number;
  board_id: number;
  collapsed: boolean;
  cards: BackendCard[];
};

export type BackendBoard = {
  id: number;
  name: string;
  user_id: number;
  columns: BackendColumn[];
};
