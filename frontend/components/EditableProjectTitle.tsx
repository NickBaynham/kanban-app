"use client";

import { useState } from "react";

const DEFAULT_TITLE = "Project board";

export function EditableProjectTitle() {
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);

  const commit = () => {
    const next = draft.trim() || title;
    setTitle(next);
    setDraft(next);
    setEditing(false);
  };

  return (
    <div className="mb-6 shrink-0" data-testid="project-title-block">
      <h1 className="m-0 text-3xl font-bold tracking-tight md:text-4xl">
        {editing ? (
          <input
            autoFocus
            data-testid="project-title-input"
            className="w-full max-w-2xl rounded-xl border-2 border-[var(--color-primary)]/40 bg-white px-4 py-3 text-3xl font-bold tracking-tight text-[var(--color-navy)] shadow-inner outline-none md:text-4xl focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/25"
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
            className="block w-full max-w-2xl rounded-xl px-1 py-1 text-left transition-colors hover:bg-white/60"
            onClick={() => {
              setDraft(title);
              setEditing(true);
            }}
          >
            <span className="bg-gradient-to-br from-[var(--color-navy)] via-[var(--color-navy)] to-[var(--color-primary)]/45 bg-clip-text text-transparent">
              {title}
            </span>
          </button>
        )}
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--color-gray)]">Click the title to rename this project.</p>
    </div>
  );
}
