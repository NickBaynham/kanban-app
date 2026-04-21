"use client";

import { useState } from "react";
import { fetchWithAuth, setAuthToken } from "@/lib/apiClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetchWithAuth("/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        const data = await res.json();
        setAuthToken(data.token);
        router.push("/");
      } else {
        setError("Invalid credentials");
      }
    } catch {
      setError("Login failed");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)]">
      <form onSubmit={handleLogin} className="w-full max-w-sm rounded bg-white p-8 shadow-md">
        <h2 className="mb-6 text-center text-2xl font-bold text-[var(--color-navy)]">Kanban Login</h2>
        {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-bold text-gray-700">Username</label>
          <input
            type="text"
            className="w-full appearance-none rounded border px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled
          />
        </div>
        <div className="mb-6">
          <label className="mb-2 block text-sm font-bold text-gray-700">Password</label>
          <input
            type="password"
            className="w-full appearance-none rounded border px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between">
          <button
            className="rounded bg-[var(--color-secondary)] px-4 py-2 font-bold text-white hover:opacity-90 focus:outline-none"
            type="submit"
          >
            Sign In
          </button>
        </div>
      </form>
    </div>
  );
}
