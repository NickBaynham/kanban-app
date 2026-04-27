"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useState } from "react";
import type { CardData, ColumnDef } from "@/lib/boardTypes";
import { KanbanCard } from "./KanbanCard";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  XIcon,
  CheckIcon,
} from "./Icons";

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
    if (next !== column.title) onRename(column.id, next);
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
      className={`relative flex h-full shrink-0 flex-col overflow-hidden rounded-2xl border bg-gradient-to-b from-[var(--color-column-surface)] to-[var(--color-column-bg)] transition-all duration-200 ease-out ${
        collapsed ? "w-[3.5rem] min-h-[280px] p-2" : "w-[19rem] min-h-[460px] p-3"
      } ${
        isOver
          ? "border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/35 ring-offset-2 ring-offset-[var(--color-page-bg)]"
          : "border-white/80"
      }`}
      style={{ boxShadow: `${laneShadow}, inset 0 1px 0 rgba(255,255,255,0.85)` }}
    >
      <div
        className="absolute left-0 right-0 top-0 z-10 h-[3px] rounded-t-[15px]"
        style={{
          background: `linear-gradient(90deg, ${stripe}, color-mix(in srgb, ${stripe} 45%, white), ${stripe})`,
        }}
        aria-hidden
      />

      <header
        className={`relative z-0 flex border-[var(--color-border)]/80 ${
          collapsed
            ? "mt-1 flex-col items-center gap-2 border-b pb-2"
            : "mt-1 flex-row items-center gap-2 border-b pb-2.5"
        }`}
      >
        <button
          type="button"
          onClick={handleToggleCollapse}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-white/90 text-[var(--color-navy)] shadow-sm transition-all hover:border-[var(--color-primary)]/30 hover:bg-white hover:text-[var(--color-primary)] hover:shadow"
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand lane" : "Collapse lane"}
        >
          {collapsed ? <ChevronRightIcon size={16} /> : <ChevronLeftIcon size={16} />}
        </button>

        {collapsed ? (
          <>
            <button
              type="button"
              onClick={handleToggleCollapse}
              className="max-h-[180px] truncate text-center text-xs font-semibold leading-tight text-[var(--color-navy)] [writing-mode:vertical-rl] rotate-180 transition-colors hover:text-[var(--color-primary)]"
              title={`${column.title} — click to expand`}
            >
              {column.title}
            </button>
            <span className="rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-[10px] font-bold tabular-nums text-[var(--color-primary)]">
              {cardIds.length}
            </span>
          </>
        ) : editing ? (
          <div className="min-w-0 flex-1">
            <input
              autoFocus
              className="w-full rounded-lg border-2 border-[var(--color-primary)]/40 bg-white px-2.5 py-1.5 text-base font-semibold text-[var(--color-navy)] shadow-inner outline-none transition-shadow focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/25"
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
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              className="min-w-0 flex-1 truncate rounded-md px-1 text-left text-base font-semibold tracking-tight text-[var(--color-navy)] transition-colors hover:bg-white/70"
              onClick={() => {
                setDraftTitle(column.title);
                setEditing(true);
              }}
              title="Click to rename"
            >
              {column.title}
            </button>
            <span className="shrink-0 rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-[11px] font-bold tabular-nums text-[var(--color-primary)]">
              {cardIds.length}
            </span>
          </div>
        )}
      </header>

      <div
        ref={setNodeRef}
        className={
          collapsed
            ? "mt-2 flex min-h-[60px] flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] bg-gradient-to-b from-white/50 to-slate-100/40 px-1 text-center text-xs text-[var(--color-gray)]"
            : "mt-3 flex min-h-[200px] flex-1 flex-col gap-3 overflow-y-auto pb-2 pr-0.5"
        }
      >
        {collapsed ? (
          <span className="font-medium tabular-nums text-[var(--color-navy)]/70" aria-live="polite">
            {cardIds.length === 1 ? "1 card" : `${cardIds.length} cards`}
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
            {cards.length === 0 && (
              <div className="flex min-h-[120px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] bg-white/40 px-3 text-center">
                <p className="text-xs text-[var(--color-gray)]">No cards yet</p>
              </div>
            )}
          </SortableContext>
        )}
      </div>

      {!collapsed && (
        <div className="relative z-0 mt-auto pt-2">
          {showForm ? (
            <form onSubmit={submitCard} className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-white/95 p-2 shadow-sm">
              <input
                autoFocus
                className="rounded-lg border border-[var(--color-border)] bg-white px-2.5 py-2 text-sm text-[var(--color-navy)] outline-none transition-shadow focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                placeholder="Card title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                aria-label="New card title"
              />
              <textarea
                className="min-h-[64px] resize-y rounded-lg border border-[var(--color-border)] bg-white px-2.5 py-2 text-sm text-[var(--color-navy)] outline-none transition-shadow focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                placeholder="Details (optional)"
                value={newDetails}
                onChange={(e) => setNewDetails(e.target.value)}
                aria-label="New card details"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--color-secondary)] px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-[var(--color-secondary)]/30 transition-opacity hover:opacity-95"
                >
                  <CheckIcon size={14} />
                  Add card
                </button>
                <button
                  type="button"
                  className="flex items-center justify-center rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-gray)] transition-colors hover:bg-slate-50"
                  onClick={() => {
                    setShowForm(false);
                    setNewTitle("");
                    setNewDetails("");
                  }}
                  aria-label="Cancel"
                >
                  <XIcon size={14} />
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[var(--color-primary)]/40 bg-white/40 py-2 text-sm font-semibold text-[var(--color-primary)] transition-all hover:border-[var(--color-primary)]/70 hover:bg-[var(--color-primary)]/8 hover:shadow-sm"
              onClick={() => setShowForm(true)}
            >
              <PlusIcon size={14} />
              Add card
            </button>
          )}
        </div>
      )}
    </section>
  );
}
