"use client";

import { KanbanBoardLoader } from "@/components/KanbanBoardLoader";
import { LogoutButton } from "@/components/LogoutButton";
import { ArrowLeftIcon, KanbanIcon } from "@/components/Icons";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function BoardContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const boardId = id ? parseInt(id, 10) : 0;

  if (!boardId) return <div className="p-10">Invalid Board ID</div>;

  return (
    <div className="page-shell flex min-h-full flex-col">
      <header className="relative border-b border-[var(--color-border)] bg-white/75 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset] backdrop-blur-md">
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--color-primary)]/35 to-transparent"
          aria-hidden
        />
        <div className="mx-auto flex w-full items-center justify-between gap-3 px-4 py-3 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] bg-white/80 text-[var(--color-navy)] shadow-sm transition-all hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)]"
              aria-label="Back to boards"
              title="Back to boards"
            >
              <ArrowLeftIcon size={18} />
            </Link>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] text-white shadow-sm">
              <KanbanIcon size={18} />
            </div>
            <span className="hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-primary)] sm:inline">
              Board
            </span>
          </div>
          <LogoutButton />
        </div>
      </header>
      <main className="flex flex-1 flex-col px-3 py-4 lg:px-5 lg:py-5">
        <KanbanBoardLoader boardId={boardId} />
      </main>
    </div>
  );
}

export default function BoardPage() {
  return (
    <Suspense fallback={<div className="p-10">Loading…</div>}>
      <BoardContent />
    </Suspense>
  );
}
