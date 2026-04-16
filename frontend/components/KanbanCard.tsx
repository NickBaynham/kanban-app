"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import type { CardData } from "@/lib/boardTypes";

type Props = {
  card: CardData;
  onDelete: (id: string) => void;
  onUpdate: (id: string, title: string, details: string) => void;
};

export function KanbanCard({ card, onDelete, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(card.title);
  const [draftDetails, setDraftDetails] = useState(card.details);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, disabled: editing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const save = () => {
    const t = draftTitle.trim();
    if (!t) return;
    onUpdate(card.id, t, draftDetails);
    setEditing(false);
  };

  const cancel = () => {
    setDraftTitle(card.title);
    setDraftDetails(card.details);
    setEditing(false);
  };

  const gripProps = editing ? {} : { ...attributes, ...listeners };

  return (
    <article
      ref={setNodeRef}
      style={style}
      data-testid={`card-${card.id}`}
      className={`group relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-gradient-to-br from-white via-white to-slate-50/90 p-4 transition-[box-shadow,transform,border-color] duration-200 [box-shadow:var(--shadow-card)] ${
        isDragging
          ? "z-10 scale-[1.02] opacity-[0.97] [box-shadow:var(--shadow-card-hover)] ring-2 ring-[var(--color-accent)]/90"
          : "hover:-translate-y-0.5 hover:border-[var(--color-primary)]/25 hover:[box-shadow:var(--shadow-card-hover)]"
      } ${editing ? "ring-2 ring-[var(--color-primary)]/25" : ""}`}
    >
      <div
        className="pointer-events-none absolute inset-y-3 left-0 w-1 rounded-full bg-gradient-to-b from-[var(--color-accent)] via-[var(--color-primary)] to-[var(--color-secondary)] opacity-90"
        aria-hidden
      />
      <div className="flex gap-3 pl-2">
        <button
          type="button"
          className={`mt-0.5 shrink-0 rounded-lg bg-slate-100/90 p-2 text-[var(--color-gray)] shadow-sm transition-colors hover:bg-[var(--color-primary)]/12 hover:text-[var(--color-navy)] ${
            editing ? "cursor-not-allowed opacity-50" : "cursor-grab touch-none active:cursor-grabbing"
          }`}
          aria-label={editing ? "Drag handle disabled while editing" : `Drag ${card.title}`}
          disabled={editing}
          {...gripProps}
        >
          <GripIcon />
        </button>
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex flex-col gap-2">
              <input
                className="w-full rounded-lg border border-[var(--color-border)] bg-white px-2.5 py-2 text-sm font-semibold text-[var(--color-navy)] shadow-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                aria-label="Card title"
              />
              <textarea
                className="min-h-[72px] w-full resize-y rounded-lg border border-[var(--color-border)] bg-white px-2.5 py-2 text-sm text-[var(--color-navy)] shadow-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                value={draftDetails}
                onChange={(e) => setDraftDetails(e.target.value)}
                aria-label="Card details"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={save}
                  className="rounded-lg bg-[var(--color-secondary)] px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:opacity-95"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={cancel}
                  className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--color-gray)] hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <h3 className="font-semibold tracking-tight text-[var(--color-navy)]">{card.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-gray)]">{card.details}</p>
            </>
          )}
        </div>
        {!editing && (
          <div className="flex shrink-0 flex-col gap-1 self-start">
            <button
              type="button"
              onClick={() => {
                setDraftTitle(card.title);
                setDraftDetails(card.details);
                setEditing(true);
              }}
              className="rounded-lg border border-transparent px-2.5 py-1.5 text-sm font-medium text-[var(--color-primary)] transition-colors hover:border-[var(--color-primary)]/25 hover:bg-[var(--color-primary)]/8"
              aria-label={`Edit ${card.title}`}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(card.id)}
              className="rounded-lg border border-transparent px-2.5 py-1.5 text-sm font-medium text-[var(--color-secondary)] transition-colors hover:border-[var(--color-secondary)]/25 hover:bg-[var(--color-secondary)]/8"
              aria-label={`Delete ${card.title}`}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

function GripIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden className="opacity-75">
      <circle cx="5" cy="4" r="1.25" fill="currentColor" />
      <circle cx="11" cy="4" r="1.25" fill="currentColor" />
      <circle cx="5" cy="8" r="1.25" fill="currentColor" />
      <circle cx="11" cy="8" r="1.25" fill="currentColor" />
      <circle cx="5" cy="12" r="1.25" fill="currentColor" />
      <circle cx="11" cy="12" r="1.25" fill="currentColor" />
    </svg>
  );
}
