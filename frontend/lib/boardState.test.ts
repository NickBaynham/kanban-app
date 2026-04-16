import { describe, expect, it } from "vitest";
import {
  addCard,
  arrayMove,
  createInitialState,
  deleteCard,
  findColumnForCard,
  renameColumn,
  reorderCardsInColumn,
  updateCard,
} from "./boardState";

describe("createInitialState", () => {
  it("has five columns and seeded cards", () => {
    const s = createInitialState();
    expect(s.columns).toHaveLength(5);
    expect(Object.keys(s.cardsById).length).toBeGreaterThan(0);
    expect(s.columnCardIds.c0?.length).toBeGreaterThan(0);
  });
});

describe("renameColumn", () => {
  it("updates the column title", () => {
    const s = createInitialState();
    const next = renameColumn(s, "c0", "Icebox");
    expect(next.columns.find((c) => c.id === "c0")?.title).toBe("Icebox");
    expect(s.columns.find((c) => c.id === "c0")?.title).toBe("Backlog");
  });
});

describe("addCard", () => {
  it("appends a card to the column", () => {
    const s = createInitialState();
    const next = addCard(s, "c3", "New", "Details here");
    const ids = next.columnCardIds.c3 ?? [];
    expect(ids.length).toBe(1);
    const id = ids[0];
    expect(next.cardsById[id]).toEqual({
      id,
      title: "New",
      details: "Details here",
    });
  });
});

describe("updateCard", () => {
  it("updates title and details", () => {
    const s = createInitialState();
    const next = updateCard(s, "k1", "New title", "New details");
    expect(next.cardsById.k1).toEqual({
      id: "k1",
      title: "New title",
      details: "New details",
    });
  });

  it("keeps previous title if new title is only whitespace", () => {
    const s = createInitialState();
    const next = updateCard(s, "k1", "   ", "Only details");
    expect(next.cardsById.k1?.title).toBe("Design board layout");
    expect(next.cardsById.k1?.details).toBe("Only details");
  });

  it("no-ops for unknown card id", () => {
    const s = createInitialState();
    const next = updateCard(s, "missing", "x", "y");
    expect(next).toEqual(s);
  });
});

describe("deleteCard", () => {
  it("removes the card from the board", () => {
    const s = createInitialState();
    const next = deleteCard(s, "k1");
    expect(next.cardsById.k1).toBeUndefined();
    expect(next.columnCardIds.c0?.includes("k1")).toBe(false);
  });
});

describe("reorderCardsInColumn", () => {
  it("replaces the column ordering", () => {
    const s = createInitialState();
    const next = reorderCardsInColumn(s, "c0", ["k2", "k1"]);
    expect(next.columnCardIds.c0).toEqual(["k2", "k1"]);
  });
});

describe("findColumnForCard", () => {
  it("finds column by card id or column id", () => {
    const s = createInitialState();
    expect(findColumnForCard(s, "k1")).toBe("c0");
    expect(findColumnForCard(s, "c2")).toBe("c2");
    expect(findColumnForCard(s, "missing")).toBeUndefined();
  });
});

describe("arrayMove", () => {
  it("moves an item to a new index", () => {
    expect(arrayMove(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
  });
});
