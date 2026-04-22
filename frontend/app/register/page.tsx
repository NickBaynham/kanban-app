"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        // Automatically redirect to login page after successful registration
        router.push("/login");
      } else {
        const data = await res.json();
        setError(data.detail || "Registration failed");
      }
    } catch {
      setError("Registration failed due to a network error");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)]">
      <form onSubmit={handleRegister} className="w-full max-w-sm rounded bg-white p-8 shadow-md">
        <h2 className="mb-6 text-center text-2xl font-bold text-[var(--color-navy)]">Create Account</h2>
        {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-bold text-gray-700">Username</label>
          <input
            type="text"
            className="w-full appearance-none rounded border px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="mb-6">
          <label className="mb-2 block text-sm font-bold text-gray-700">Password</label>
          <input
            type="password"
            className="w-full appearance-none rounded border px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="flex items-center justify-between">
          <button
            className="rounded bg-[var(--color-secondary)] px-4 py-2 font-bold text-white hover:opacity-90 focus:outline-none"
            type="submit"
          >
            Register
          </button>
          <Link href="/login" className="inline-block align-baseline font-bold text-sm text-[var(--color-primary)] hover:text-blue-800">
            Back to Login
          </Link>
        </div>
      </form>
    </div>
  );
}
