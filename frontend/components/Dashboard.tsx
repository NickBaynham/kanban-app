"use client";

import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/lib/apiClient";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const [boards, setBoards] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadBoards();
  }, []);

  const loadBoards = async () => {
    try {
      const res = await fetchWithAuth("/boards");
      if (res.ok) {
        const data = await res.json();
        setBoards(data);
      }
    } catch (e) {
      console.error("Failed to load boards", e);
    }
    setLoading(false);
  };

  const createBoard = async () => {
    const name = prompt("Enter new board name:", "New Project");
    if (!name) return;
    try {
      const res = await fetchWithAuth("/boards", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const newBoard = await res.json();
        router.push(`/board?id=${newBoard.id}`);
      }
    } catch (e) {
      console.error("Failed to create board", e);
    }
  };

  const deleteBoard = async (id: number, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigating to the board
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this board? This action cannot be undone.")) return;
    try {
      const res = await fetchWithAuth(`/boards/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadBoards();
      }
    } catch (e) {
      console.error("Failed to delete board", e);
    }
  };

  if (loading) return <div className="p-4">Loading boards...</div>;

  return (
    <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {boards.map((board) => (
        <Link 
          key={board.id} 
          href={`/board?id=${board.id}`}
          className="group block p-6 bg-white rounded-xl border border-[var(--color-border)] shadow-sm hover:shadow-md transition-all cursor-pointer relative"
        >
          <h3 className="text-xl font-semibold text-[var(--color-navy)] mb-2 group-hover:text-[var(--color-primary)] transition-colors">
            {board.name}
          </h3>
          <p className="text-sm text-[var(--color-gray)]">Click to open board</p>
          <button 
            onClick={(e) => deleteBoard(board.id, e)}
            className="absolute top-4 right-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Delete Board"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </Link>
      ))}

      <button 
        onClick={createBoard}
        className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[var(--color-border)] rounded-xl text-[var(--color-gray)] hover:bg-[var(--color-column-bg)] hover:text-[var(--color-primary)] transition-colors min-h-[140px]"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span className="font-semibold">Create New Board</span>
      </button>
    </div>
  );
}
