import { describe, expect, it } from "vitest";
import {
  arrayMove,
  deleteCard,
  findColumnForCard,
  renameColumn,
  reorderCardsInColumn,
  updateCard,
} from "./boardState";
import type { BoardSnapshot } from "./boardTypes";

function snapshot(): BoardSnapshot {
  return {
    columns: [
      { id: "c0", title: "Backlog" },
      { id: "c1", title: "Ready" },
      { id: "c2", title: "Done" },
    ],
    cardsById: {
      k1: { id: "k1", title: "Design", details: "wires" },
      k2: { id: "k2", title: "Build", details: "" },
      k3: { id: "k3", title: "Ship", details: "lint + tests" },
    },
    columnCardIds: { c0: ["k1", "k2"], c1: [], c2: ["k3"] },
  };
}

describe("renameColumn", () => {
  it("updates the column title", () => {
    const next = renameColumn(snapshot(), "c0", "Icebox");
    expect(next.columns.find((c) => c.id === "c0")?.title).toBe("Icebox");
  });
});

describe("updateCard", () => {
  it("updates title and details", () => {
    const next = updateCard(snapshot(), "k1", "New", "New details");
    expect(next.cardsById.k1).toEqual({ id: "k1", title: "New", details: "New details" });
  });

  it("keeps previous title if new title is whitespace", () => {
    const next = updateCard(snapshot(), "k1", "   ", "Just details");
    expect(next.cardsById.k1?.title).toBe("Design");
    expect(next.cardsById.k1?.details).toBe("Just details");
  });

  it("no-ops for unknown card id", () => {
    const s = snapshot();
    expect(updateCard(s, "missing", "x", "y")).toEqual(s);
  });
});

describe("deleteCard", () => {
  it("removes the card from the board", () => {
    const next = deleteCard(snapshot(), "k1");
    expect(next.cardsById.k1).toBeUndefined();
    expect(next.columnCardIds.c0).not.toContain("k1");
  });
});

describe("reorderCardsInColumn", () => {
  it("replaces the column ordering", () => {
    const next = reorderCardsInColumn(snapshot(), "c0", ["k2", "k1"]);
    expect(next.columnCardIds.c0).toEqual(["k2", "k1"]);
  });
});

describe("findColumnForCard", () => {
  it("finds column by card id or column id", () => {
    const s = snapshot();
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
