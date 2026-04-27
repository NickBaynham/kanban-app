import Dashboard from "@/components/Dashboard";
import { LogoutButton } from "@/components/LogoutButton";
import { KanbanIcon } from "@/components/Icons";

export default function Home() {
  return (
    <div className="page-shell min-h-full">
      <header className="relative border-b border-[var(--color-border)] bg-white/75 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset] backdrop-blur-md">
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--color-primary)]/35 to-transparent"
          aria-hidden
        />
        <div className="mx-auto flex w-full items-center justify-between gap-3 px-5 py-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] text-white shadow-md shadow-[var(--color-primary)]/25">
              <KanbanIcon size={20} />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-primary)]">
                Kanban
              </span>
              <h1 className="truncate text-lg font-bold tracking-tight text-[var(--color-navy)]">
                Your boards
              </h1>
            </div>
          </div>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-screen-2xl px-5 py-7 lg:px-8">
        <Dashboard />
      </main>
    </div>
  );
}
