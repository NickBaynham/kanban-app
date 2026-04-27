"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchWithAuth } from "@/lib/apiClient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderIcon, PlusIcon, TrashIcon, XIcon } from "./Icons";

type Board = { id: number; name: string };

const ACCENTS = ["#209dd7", "#753991", "#ecad0a", "#0a3a72", "#ff6b6b", "#22a06b"];

function colorFor(id: number): string {
  return ACCENTS[id % ACCENTS.length];
}

export default function Dashboard() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const loadBoards = useCallback(async () => {
    try {
      const res = await fetchWithAuth("/boards");
      if (res.ok) {
        const data: Board[] = await res.json();
        setBoards(data);
      }
    } catch (e) {
      console.error("Failed to load boards", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBoards();
  }, [loadBoards]);

  useEffect(() => {
    if (showCreate) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [showCreate]);

  const createBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const res = await fetchWithAuth("/boards", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const newBoard: Board = await res.json();
        router.push(`/board?id=${newBoard.id}`);
      }
    } catch (err) {
      console.error("Failed to create board", err);
    } finally {
      setCreating(false);
    }
  };

  const deleteBoard = async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this board? This cannot be undone.")) return;
    try {
      const res = await fetchWithAuth(`/boards/${id}`, { method: "DELETE" });
      if (res.ok) loadBoards();
    } catch (err) {
      console.error("Failed to delete board", err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-[var(--color-gray)]">
        <span className="mr-2 h-2 w-2 animate-pulse rounded-full bg-[var(--color-primary)]" />
        Loading boards…
      </div>
    );
  }

  return (
    <>
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-navy)]/55 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreate(false);
          }}
        >
          <form
            onSubmit={createBoard}
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--color-navy)]">New board</h2>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-md p-1 text-[var(--color-gray)] hover:bg-slate-100 hover:text-[var(--color-navy)]"
                aria-label="Close"
              >
                <XIcon size={18} />
              </button>
            </div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--color-gray)]">
              Board name
            </label>
            <input
              ref={inputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Marketing site relaunch"
              className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
              required
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-gray)] hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newName.trim() || creating}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--color-secondary)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-50"
              >
                <PlusIcon size={14} />
                {creating ? "Creating…" : "Create board"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid auto-rows-fr grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <button
          onClick={() => {
            setNewName("");
            setShowCreate(true);
          }}
          className="group flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--color-primary)]/40 bg-white/40 p-6 text-[var(--color-primary)] transition-all hover:border-[var(--color-primary)]/70 hover:bg-[var(--color-primary)]/5 hover:shadow-md"
          aria-label="Create new board"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 transition-colors group-hover:bg-[var(--color-primary)]/15">
            <PlusIcon size={22} />
          </span>
          <span className="text-base font-semibold">Create new board</span>
          <span className="text-xs text-[var(--color-gray)]">Start with 5 default lanes</span>
        </button>

        {boards.map((board) => {
          const accent = colorFor(board.id);
          return (
            <Link
              key={board.id}
              href={`/board?id=${board.id}`}
              className="group relative block min-h-[160px] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm transition-all hover:border-[var(--color-primary)]/30 hover:shadow-md"
            >
              <div
                className="absolute inset-x-0 top-0 h-1.5"
                style={{
                  background: `linear-gradient(90deg, ${accent}, color-mix(in srgb, ${accent} 35%, white), ${accent})`,
                }}
                aria-hidden
              />
              <div
                className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm"
                style={{ background: accent }}
                aria-hidden
              >
                <FolderIcon size={18} />
              </div>
              <h3 className="text-lg font-semibold text-[var(--color-navy)] transition-colors group-hover:text-[var(--color-primary)] line-clamp-2">
                {board.name}
              </h3>
              <p className="mt-1.5 text-xs uppercase tracking-wider text-[var(--color-gray)]">
                Open board →
              </p>
              <button
                onClick={(e) => deleteBoard(board.id, e)}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-gray)] opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                title="Delete board"
                aria-label={`Delete ${board.name}`}
              >
                <TrashIcon size={16} />
              </button>
            </Link>
          );
        })}
      </div>
    </>
  );
}
