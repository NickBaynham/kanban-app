import { DndContext } from "@dnd-kit/core";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KanbanColumn } from "./KanbanColumn";

function wrap(ui: ReactElement) {
  return <DndContext onDragEnd={() => {}}>{ui}</DndContext>;
}

afterEach(() => cleanup());

describe("KanbanColumn", () => {
  it("renames column when title is edited", async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();
    render(
      wrap(
        <KanbanColumn
          column={{ id: "c0", title: "Backlog" }}
          cardIds={[]}
          cards={[]}
          laneIndex={0}
          collapsed={false}
          onToggleCollapse={() => {}}
          onRename={onRename}
          onDeleteCard={() => {}}
          onUpdateCard={() => {}}
          onAddCard={() => {}}
        />,
      ),
    );

    await user.click(screen.getByRole("button", { name: "Backlog" }));
    const input = screen.getByRole("textbox", { name: "Column name" });
    await user.clear(input);
    await user.type(input, "Icebox");
    await user.keyboard("{Enter}");

    expect(onRename).toHaveBeenCalledWith("c0", "Icebox");
  });

  it("submits a new card", async () => {
    const user = userEvent.setup();
    const onAddCard = vi.fn();
    render(
      wrap(
        <KanbanColumn
          column={{ id: "c1", title: "Ready" }}
          cardIds={[]}
          cards={[]}
          laneIndex={1}
          collapsed={false}
          onToggleCollapse={() => {}}
          onRename={() => {}}
          onDeleteCard={() => {}}
          onUpdateCard={() => {}}
          onAddCard={onAddCard}
        />,
      ),
    );

    const col = screen.getByTestId("column-c1");
    await user.click(within(col).getByRole("button", { name: "+ Add card" }));
    await user.type(within(col).getByRole("textbox", { name: "New card title" }), "Task A");
    await user.type(within(col).getByRole("textbox", { name: "New card details" }), "Do the thing");
    await user.click(within(col).getByRole("button", { name: "Add card" }));

    expect(onAddCard).toHaveBeenCalledWith("c1", "Task A", "Do the thing");
  });
});
