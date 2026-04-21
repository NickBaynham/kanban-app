"use client";
import { setAuthToken } from "@/lib/apiClient";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => {
        setAuthToken(null);
        router.push("/login");
      }}
      className="text-sm font-semibold text-[var(--color-primary)] hover:text-[var(--color-secondary)] hover:underline border border-[var(--color-primary)] rounded px-3 py-1"
    >
      Sign Out
    </button>
  );
}
