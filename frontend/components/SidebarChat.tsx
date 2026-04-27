"use client";

import { useEffect, useRef, useState } from "react";
import { fetchWithAuth } from "@/lib/apiClient";
import { SendIcon, SparklesIcon } from "./Icons";

type ChatMessage = { role: "assistant" | "user"; content: string };

const INITIAL: ChatMessage[] = [
  {
    role: "assistant",
    content:
      "Hi! I can add, move, rename, or delete cards on this board. Try: \"Add card 'Buy milk' to To Do\".",
  },
];

export default function SidebarChat({
  boardId,
  onBoardChange,
}: {
  boardId: number;
  onBoardChange: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMsg = input;
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetchWithAuth("/chat", {
        method: "POST",
        body: JSON.stringify({ message: userMsg, board_id: boardId }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
        if (data.board_changed) onBoardChange();
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Sorry — the assistant request failed." },
        ]);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Network error. Check your connection and retry." },
      ]);
    }
    setLoading(false);
  };

  return (
    <div className="flex h-full min-h-[400px] flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-md shadow-[var(--color-navy)]/8">
      <header className="relative flex items-center gap-3 bg-gradient-to-r from-[var(--color-navy)] via-[#0a3a72] to-[var(--color-secondary)] px-4 py-3 text-white">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20">
          <SparklesIcon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">AI Assistant</p>
          <p className="text-[11px] uppercase tracking-wider text-white/70">
            Manages this board
          </p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-snug ${
                m.role === "user"
                  ? "bg-[var(--color-primary)] text-white shadow-sm shadow-[var(--color-primary)]/30"
                  : "bg-slate-100 text-[var(--color-navy)]"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl bg-slate-100 px-3.5 py-2 text-sm italic text-[var(--color-gray)]">
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-primary)] [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-primary)] [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-primary)]" />
              </span>
              Thinking…
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={send}
        className="flex shrink-0 items-center gap-2 border-t border-[var(--color-border)] bg-white px-3 py-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-navy)] outline-none transition-shadow focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
          placeholder="Ask me to update the board…"
          disabled={loading}
          aria-label="Message"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-secondary)] text-white shadow-sm transition-opacity hover:opacity-95 disabled:opacity-40"
          aria-label="Send"
        >
          <SendIcon size={16} />
        </button>
      </form>
    </div>
  );
}
