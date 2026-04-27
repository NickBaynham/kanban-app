"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/apiClient";
import { KanbanIcon } from "./Icons";

type Props = {
  boardId: number;
  boardName: string;
};

export function EditableProjectTitle({ boardId, boardName }: Props) {
  const [title, setTitle] = useState(boardName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(boardName);

  useEffect(() => {
    if (!editing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTitle(boardName);
      setDraft(boardName);
    }
  }, [boardName, editing]);

  const commit = async () => {
    const next = draft.trim() || title;
    const previous = title;
    setTitle(next);
    setDraft(next);
    setEditing(false);
    try {
      const res = await fetchWithAuth(`/boards/${boardId}`, {
        method: "PUT",
        body: JSON.stringify({ name: next }),
      });
      if (!res.ok) {
        setTitle(previous);
        setDraft(previous);
      }
    } catch {
      setTitle(previous);
      setDraft(previous);
    }
  };

  return (
    <div className="flex min-w-0 items-center gap-3" data-testid="project-title-block">
      <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] text-white shadow-md shadow-[var(--color-primary)]/25 sm:flex">
        <KanbanIcon size={22} />
      </div>
      <h1 className="m-0 min-w-0 text-2xl font-bold tracking-tight md:text-3xl">
        {editing ? (
          <input
            autoFocus
            data-testid="project-title-input"
            className="w-full max-w-2xl rounded-xl border-2 border-[var(--color-primary)]/40 bg-white px-3 py-1.5 text-2xl font-bold tracking-tight text-[var(--color-navy)] shadow-inner outline-none md:text-3xl focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/25"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setDraft(title);
                setEditing(false);
              }
            }}
            aria-label="Project title"
          />
        ) : (
          <button
            type="button"
            data-testid="project-title-display"
            className="block max-w-full truncate rounded-lg px-1 py-0.5 text-left transition-colors hover:bg-white/60"
            onClick={() => {
              setDraft(title);
              setEditing(true);
            }}
            title="Click to rename"
          >
            <span className="bg-gradient-to-br from-[var(--color-navy)] via-[var(--color-navy)] to-[var(--color-primary)]/55 bg-clip-text text-transparent">
              {title}
            </span>
          </button>
        )}
      </h1>
    </div>
  );
}
