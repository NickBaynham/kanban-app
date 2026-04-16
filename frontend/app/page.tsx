import { KanbanBoardLoader } from "@/components/KanbanBoardLoader";

/** Home is a Server Component: do not use `next/dynamic` with `{ ssr: false }` here (Next.js forbids it). Use `KanbanBoardLoader` instead. */
export default function Home() {
  return (
    <div className="page-shell min-h-full">
      <header className="relative border-b border-[var(--color-border)] bg-white/75 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset] backdrop-blur-md">
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--color-primary)]/35 to-transparent"
          aria-hidden
        />
        <div className="mx-auto flex max-w-[100vw] flex-col gap-2 px-6 py-7 lg:px-10">
          <div className="flex items-center gap-3">
            <div
              className="h-1.5 w-28 rounded-full bg-gradient-to-r from-[var(--color-accent)] via-[var(--color-primary)] to-[var(--color-secondary)] shadow-sm shadow-[var(--color-primary)]/20"
              aria-hidden
            />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-primary)]">
              Kanban
            </span>
          </div>
          <p className="max-w-2xl text-base leading-relaxed text-[var(--color-gray)]">
            One board, five columns. Drag cards, rename columns, add or remove work items. Nothing is
            saved when you refresh.
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-[100vw] px-6 py-9 lg:px-10">
        <KanbanBoardLoader />
      </main>
    </div>
  );
}
