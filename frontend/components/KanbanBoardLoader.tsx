"use client";

import dynamic from "next/dynamic";

const KanbanBoard = dynamic(
  () => import("./KanbanBoard").then((mod) => mod.KanbanBoard),
  {
    ssr: false,
    loading: () => (
      <div
        className="min-h-[420px] rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-column-bg)]"
        aria-busy="true"
        aria-label="Loading board"
      />
    ),
  },
);

export function KanbanBoardLoader() {
  return <KanbanBoard />;
}
