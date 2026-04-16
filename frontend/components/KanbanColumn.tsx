"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useState } from "react";
import type { CardData, ColumnDef } from "@/lib/boardTypes";
import { KanbanCard } from "./KanbanCard";

const LANE_ACCENTS = ["#ecad0a", "#209dd7", "#753991", "#209dd7", "#ecad0a"] as const;

type Props = {
  column: ColumnDef;
  cards: CardData[];
  cardIds: string[];
  laneIndex: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onRename: (columnId: string, title: string) => void;
  onDeleteCard: (cardId: string) => void;
  onUpdateCard: (cardId: string, title: string, details: string) => void;
  onAddCard: (columnId: string, title: string, details: string) => void;
};

export function KanbanColumn({
  column,
  cards,
  cardIds,
  laneIndex,
  collapsed,
  onToggleCollapse,
  onRename,
  onDeleteCard,
  onUpdateCard,
  onAddCard,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(column.title);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDetails, setNewDetails] = useState("");

  const stripe = LANE_ACCENTS[laneIndex % LANE_ACCENTS.length];

  const handleToggleCollapse = () => {
    setEditing(false);
    setShowForm(false);
    onToggleCollapse();
  };

  const commitRename = () => {
    const next = draftTitle.trim() || column.title;
    onRename(column.id, next);
    setDraftTitle(next);
    setEditing(false);
  };

  const submitCard = (e: React.FormEvent) => {
    e.preventDefault();
    const t = newTitle.trim();
    if (!t) return;
    onAddCard(column.id, t, newDetails.trim());
    setNewTitle("");
    setNewDetails("");
    setShowForm(false);
  };

  const laneShadow = isOver ? "var(--shadow-lane-hover)" : "var(--shadow-lane)";

  return (
    <section
      data-testid={`column-${column.id}`}
      data-collapsed={collapsed ? "true" : "false"}
      className={`relative flex h-full shrink-0 flex-col overflow-hidden rounded-2xl border-2 bg-gradient-to-b from-[var(--color-column-surface)] to-[var(--color-column-bg)] transition-all duration-200 ease-out ${
        collapsed ? "w-[3.25rem] min-h-[200px] p-2" : "w-72 min-h-[420px] p-3"
      } ${
        isOver
          ? "border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/35 ring-offset-2 ring-offset-[var(--color-page-bg)]"
          : "border-white/80"
      }`}
      style={{ boxShadow: `${laneShadow}, inset 0 1px 0 rgba(255,255,255,0.85)` }}
    >
      <div
        className="absolute left-0 right-0 top-0 z-10 h-[3px] rounded-t-[13px]"
        style={{
          background: `linear-gradient(90deg, ${stripe}, color-mix(in srgb, ${stripe} 45%, white), ${stripe})`,
        }}
        aria-hidden
      />

      <header
        className={`relative z-0 flex border-[var(--color-border)]/80 pb-2 ${collapsed ? "mt-0.5 flex-col items-center gap-2 border-b" : "mt-1 flex-row items-start gap-1.5 border-b pb-3"}`}
      >
        <button
          type="button"
          onClick={handleToggleCollapse}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-white/90 text-[var(--color-navy)] shadow-sm transition-all hover:border-[var(--color-primary)]/30 hover:bg-white hover:shadow-md"
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand lane" : "Collapse lane"}
        >
          {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </button>

        {collapsed ? (
          <button
            type="button"
            onClick={handleToggleCollapse}
            className="max-h-[180px] truncate text-center text-xs font-semibold leading-tight text-[var(--color-navy)] [writing-mode:vertical-rl] rotate-180 transition-colors hover:text-[var(--color-primary)]"
            title={`${column.title} — click to expand`}
          >
            {column.title}
          </button>
        ) : editing ? (
          <div className="min-w-0 flex-1">
            <input
              autoFocus
              className="w-full rounded-lg border-2 border-[var(--color-primary)]/40 bg-white px-2.5 py-2 text-base font-semibold text-[var(--color-navy)] shadow-inner outline-none transition-shadow focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/25"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") {
                  setDraftTitle(column.title);
                  setEditing(false);
                }
              }}
              aria-label="Column name"
            />
          </div>
        ) : (
          <div className="min-w-0 flex-1">
            <button
              type="button"
              className="w-full rounded-lg px-1.5 text-left text-lg font-semibold tracking-tight text-[var(--color-navy)] transition-colors hover:bg-white/70"
              onClick={() => {
                setDraftTitle(column.title);
                setEditing(true);
              }}
            >
              {column.title}
            </button>
            <p className="mt-1 px-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--color-gray)]">
              Click title to rename
            </p>
          </div>
        )}
      </header>

      <div
        ref={setNodeRef}
        className={
          collapsed
            ? "mt-2 flex min-h-[48px] flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] bg-gradient-to-b from-white/50 to-slate-100/40 px-1 text-center text-xs text-[var(--color-gray)]"
            : "mt-3 flex min-h-[200px] flex-1 flex-col gap-3.5 overflow-y-auto pb-2 pr-0.5"
        }
      >
        {collapsed ? (
          <span className="font-medium tabular-nums text-[var(--color-navy)]/70" aria-live="polite">
            {cardIds.length} {cardIds.length === 1 ? "card" : "cards"}
          </span>
        ) : (
          <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
            {cards.map((card) => (
              <KanbanCard
                key={card.id}
                card={card}
                onDelete={onDeleteCard}
                onUpdate={onUpdateCard}
              />
            ))}
          </SortableContext>
        )}
      </div>

      {!collapsed && (
        <div className="relative z-0 mt-auto border-t border-[var(--color-border)]/90 bg-gradient-to-t from-white/30 to-transparent pt-3">
          {showForm ? (
            <form onSubmit={submitCard} className="flex flex-col gap-2.5">
              <input
                className="rounded-lg border border-[var(--color-border)] bg-white/95 px-3 py-2.5 text-sm text-[var(--color-navy)] shadow-sm outline-none transition-shadow focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                placeholder="Title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                aria-label="New card title"
              />
              <textarea
                className="min-h-[72px] resize-y rounded-lg border border-[var(--color-border)] bg-white/95 px-3 py-2.5 text-sm text-[var(--color-navy)] shadow-sm outline-none transition-shadow focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                placeholder="Details"
                value={newDetails}
                onChange={(e) => setNewDetails(e.target.value)}
                aria-label="New card details"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-[var(--color-secondary)] px-3 py-2.5 text-sm font-semibold text-white shadow-md shadow-[var(--color-secondary)]/30 transition-opacity hover:opacity-95"
                >
                  Add card
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm font-medium text-[var(--color-gray)] shadow-sm transition-colors hover:bg-slate-50"
                  onClick={() => {
                    setShowForm(false);
                    setNewTitle("");
                    setNewDetails("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              className="w-full rounded-xl border-2 border-dashed border-[var(--color-primary)]/45 bg-gradient-to-b from-[var(--color-primary)]/6 to-transparent py-2.5 text-sm font-semibold text-[var(--color-primary)] shadow-sm transition-all hover:border-[var(--color-primary)]/70 hover:from-[var(--color-primary)]/10 hover:shadow"
              onClick={() => setShowForm(true)}
            >
              + Add card
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
