"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import type { CardData } from "@/lib/boardTypes";
import { CheckIcon, GripIcon, PencilIcon, TrashIcon, XIcon } from "./Icons";

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
      className={`group relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-gradient-to-br from-white to-slate-50/80 p-3 transition-[box-shadow,transform,border-color] duration-200 [box-shadow:var(--shadow-card)] ${
        isDragging
          ? "z-10 scale-[1.02] opacity-[0.97] [box-shadow:var(--shadow-card-hover)] ring-2 ring-[var(--color-accent)]/90"
          : "hover:-translate-y-0.5 hover:border-[var(--color-primary)]/25 hover:[box-shadow:var(--shadow-card-hover)]"
      } ${editing ? "ring-2 ring-[var(--color-primary)]/25" : ""}`}
    >
      <div
        className="pointer-events-none absolute inset-y-3 left-0 w-[3px] rounded-full bg-gradient-to-b from-[var(--color-accent)] via-[var(--color-primary)] to-[var(--color-secondary)] opacity-90"
        aria-hidden
      />
      <div className="flex gap-2 pl-2">
        <button
          type="button"
          className={`mt-0.5 shrink-0 rounded-md p-1.5 text-[var(--color-gray)] transition-colors hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-navy)] ${
            editing ? "cursor-not-allowed opacity-40" : "cursor-grab touch-none active:cursor-grabbing"
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
                autoFocus
                className="w-full rounded-lg border border-[var(--color-border)] bg-white px-2.5 py-1.5 text-sm font-semibold text-[var(--color-navy)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                aria-label="Card title"
              />
              <textarea
                className="min-h-[64px] w-full resize-y rounded-lg border border-[var(--color-border)] bg-white px-2.5 py-1.5 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                value={draftDetails}
                onChange={(e) => setDraftDetails(e.target.value)}
                aria-label="Card details"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={save}
                  className="flex items-center gap-1.5 rounded-lg bg-[var(--color-secondary)] px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:opacity-95"
                >
                  <CheckIcon size={14} />
                  Save
                </button>
                <button
                  type="button"
                  onClick={cancel}
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5 text-sm text-[var(--color-gray)] hover:bg-slate-50"
                >
                  <XIcon size={14} />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <h3 className="font-semibold tracking-tight text-[var(--color-navy)] leading-snug">
                {card.title}
              </h3>
              {card.details && (
                <p className="mt-1 text-sm leading-snug text-[var(--color-gray)] whitespace-pre-wrap break-words">
                  {card.details}
                </p>
              )}
            </>
          )}
        </div>
        {!editing && (
          <div className="flex shrink-0 flex-col gap-1 self-start opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <button
              type="button"
              onClick={() => {
                setDraftTitle(card.title);
                setDraftDetails(card.details);
                setEditing(true);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-[var(--color-primary)] transition-colors hover:border-[var(--color-primary)]/25 hover:bg-[var(--color-primary)]/8"
              aria-label={`Edit ${card.title}`}
              title="Edit"
            >
              <PencilIcon size={14} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(card.id)}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-[var(--color-secondary)] transition-colors hover:border-[var(--color-secondary)]/25 hover:bg-[var(--color-secondary)]/8"
              aria-label={`Delete ${card.title}`}
              title="Delete"
            >
              <TrashIcon size={14} />
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
