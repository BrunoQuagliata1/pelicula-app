"use client";

import { useState, useRef } from "react";
import { X, MagnifyingGlass } from "@phosphor-icons/react";

interface SearchSheetProps {
  onClose: () => void;
  onSearch: (query: string) => void;
}

const SUGGESTIONS = [
  "Algo de acción", "Terror psicológico", "Comedia romántica",
  "Ciencia ficción épica", "Documental", "Con Tom Hanks",
  "Película corta", "Años 90", "Ganadora del Oscar", "Animación",
];

export default function SearchSheet({ onClose, onSearch }: SearchSheetProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = (q: string) => {
    if (!q.trim()) return;
    onSearch(q.trim());
    onClose();
  };

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="sheet-panel" style={{ maxHeight: "70dvh" }}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full" style={{ background: "var(--text-3)" }} />
        </div>

        <div className="px-4 pb-6 flex flex-col gap-4">
          {/* Input */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <MagnifyingGlass size={18} style={{ color: "var(--text-3)", flexShrink: 0 }} />
            <input
              ref={inputRef}
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit(query)}
              placeholder="Buscar película, actor, género..."
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: "var(--text-1)" }}
            />
            {query && (
              <button onClick={() => setQuery("")}>
                <X size={16} style={{ color: "var(--text-3)" }} />
              </button>
            )}
          </div>

          {/* Submit */}
          {query.trim() && (
            <button
              onClick={() => submit(query)}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
              style={{ background: "var(--accent)", color: "var(--accent-text)" }}
            >
              Buscar
            </button>
          )}

          {/* Suggestions */}
          <div>
            <p className="text-[11px] uppercase tracking-widest mb-3" style={{ color: "var(--text-3)" }}>Sugerencias</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  className="text-xs px-3 py-2 rounded-full transition-all active:scale-95"
                  style={{ background: "var(--surface)", color: "var(--text-2)", border: "1px solid var(--border)" }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
