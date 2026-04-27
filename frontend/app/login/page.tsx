"use client";

import { useState } from "react";
import { setAuthToken } from "@/lib/apiClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KanbanIcon, LoginIcon } from "@/components/Icons";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username, password }),
      });
      if (res.ok) {
        const data = await res.json();
        setAuthToken(data.access_token);
        router.push("/");
      } else {
        setError("Invalid username or password");
      }
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-white/95 p-7 shadow-xl shadow-[var(--color-navy)]/10 backdrop-blur-sm"
      >
        <div className="mb-5 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] text-white shadow-md shadow-[var(--color-primary)]/25">
            <KanbanIcon size={22} />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-[var(--color-navy)]">
              Welcome back
            </h2>
            <p className="mt-1 text-sm text-[var(--color-gray)]">Sign in to your boards</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--color-gray)]">
          Username
        </label>
        <input
          type="text"
          className="mb-4 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
        />

        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--color-gray)]">
          Password
        </label>
        <input
          type="password"
          className="mb-5 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-secondary)] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[var(--color-secondary)]/25 transition-opacity hover:opacity-95 disabled:opacity-60"
        >
          <LoginIcon size={16} />
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <div className="mt-4 text-center text-sm text-[var(--color-gray)]">
          New here?{" "}
          <Link
            href="/register"
            className="font-semibold text-[var(--color-primary)] hover:underline"
          >
            Create an account
          </Link>
        </div>
      </form>
    </div>
  );
}
