"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/lib/apiClient";

const KanbanBoard = dynamic(
  () => import("./KanbanBoard").then((mod) => mod.KanbanBoard),
  {
    ssr: false,
    loading: () => (
      <div
        className="min-h-[420px] rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-column-bg)]"
        aria-busy="true"
        aria-label="Loading board"
      />
    ),
  },
);

export function KanbanBoardLoader() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!getAuthToken()) {
      router.push("/login");
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMounted(true);
    }
  }, [router]);

  if (!mounted) return null;

  return <KanbanBoard />;
}
