"use client";
import { setAuthToken } from "@/lib/apiClient";
import { useRouter } from "next/navigation";
import { LogoutIcon } from "./Icons";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => {
        setAuthToken(null);
        router.push("/login");
      }}
      className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-white/80 px-3 py-2 text-sm font-semibold text-[var(--color-navy)] shadow-sm transition-all hover:border-[var(--color-primary)]/40 hover:bg-white hover:text-[var(--color-primary)]"
    >
      <LogoutIcon size={15} />
      <span className="hidden sm:inline">Sign out</span>
    </button>
  );
}
