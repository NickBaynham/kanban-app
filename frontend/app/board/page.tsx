"use client";

import { KanbanBoardLoader } from "@/components/KanbanBoardLoader";
import { LogoutButton } from "@/components/LogoutButton";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function BoardContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const boardId = id ? parseInt(id, 10) : 0;

  if (!boardId) return <div className="p-10">Invalid Board ID</div>;

  return (
    <div className="page-shell min-h-full">
      <header className="relative border-b border-[var(--color-border)] bg-white/75 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset] backdrop-blur-md">
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--color-primary)]/35 to-transparent"
          aria-hidden
        />
        <div className="mx-auto flex max-w-[100vw] flex-row gap-2 px-6 py-7 lg:px-10 justify-between items-center">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-gray-500 hover:text-[var(--color-primary)] transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div
                className="h-1.5 w-28 rounded-full bg-gradient-to-r from-[var(--color-accent)] via-[var(--color-primary)] to-[var(--color-secondary)] shadow-sm shadow-[var(--color-primary)]/20"
                aria-hidden
              />
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-primary)]">
                Board View
              </span>
            </div>
          </div>
          <div>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[100vw] px-6 py-9 lg:px-10">
        <KanbanBoardLoader boardId={boardId} />
      </main>
    </div>
  );
}

export default function BoardPage() {
  return (
    <Suspense fallback={<div className="p-10">Loading...</div>}>
      <BoardContent />
    </Suspense>
  );
}
