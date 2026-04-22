"use client";
import { useState } from "react";
import { fetchWithAuth } from "@/lib/apiClient";

export default function SidebarChat({ boardId, onBoardChange }: { boardId: number, onBoardChange: () => void }) {
  const [messages, setMessages] = useState<{role: string, content: string}[]>([
    { role: "assistant", content: "Hello! How can I help you organize your board?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetchWithAuth("/chat", {
        method: "POST",
        body: JSON.stringify({ message: userMsg, board_id: boardId })
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
        if (data.board_changed) {
          onBoardChange();
        }
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I had an issue connecting." }]);
      }
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: "assistant", content: "Network error occurred." }]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-white border border-[var(--color-border)] rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
      <div className="bg-[var(--color-navy)] text-white p-4 font-semibold shrink-0">
        AI Assistant
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`p-3 rounded-lg text-sm max-w-[85%] break-words ${m.role === 'user' ? 'bg-[var(--color-primary)] text-white self-end ml-auto' : 'bg-gray-100 text-[var(--color-gray)]'}`}>
            {m.content}
          </div>
        ))}
        {loading && <div className="text-gray-400 text-sm italic">Thinking...</div>}
      </div>
      <form onSubmit={send} className="p-3 border-t flex shrink-0 border-[var(--color-border)]">
        <input 
          type="text" 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          className="flex-1 border rounded min-w-0 px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)] bg-white text-black"
          placeholder="e.g. Add a card to Backlog..."
          disabled={loading}
        />
        <button 
          type="submit" 
          disabled={loading || !input.trim()}
          className="ml-2 bg-[var(--color-secondary)] text-white px-4 py-2 rounded text-sm font-semibold hover:opacity-90 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
