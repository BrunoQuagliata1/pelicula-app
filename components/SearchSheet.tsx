"use client";

import { useState, useEffect, useRef } from "react";

interface SearchSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

const QUICK_SUGGESTIONS = [
  "Acción",
  "Terror",
  "Comedia",
  "Con Tom Hanks",
  "Ciencia ficción",
  "Romance",
  "Animación",
  "Con Meryl Streep",
  "Años 90",
  "Película corta",
  "Thriller psicológico",
  "Documental",
];

export default function SearchSheet({ isOpen, onClose, onSearch, isLoading }: SearchSheetProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Small delay so the sheet animation starts first
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || isLoading) return;
    onSearch(trimmed);
    onClose();
    setQuery("");
  };

  const handleSuggestion = (s: string) => {
    onSearch(s);
    onClose();
    setQuery("");
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`sheet-backdrop transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div className={`sheet-panel ${isOpen ? "sheet-open" : "sheet-closed"} overflow-hidden`}
        style={{ maxHeight: "85dvh" }}>
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2 md:hidden">
          <div className="w-10 h-1 rounded-full bg-[#525252]" />
        </div>

        {/* Search input */}
        <form onSubmit={handleSubmit} className="flex items-center gap-3 px-4 pb-4 pt-2">
          <div className="relative flex-1">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#525252]"
              fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar películas, actores, géneros..."
              className="w-full bg-[#141414] border border-[#262626] rounded-2xl pl-11 pr-4 py-3.5 text-white placeholder-[#525252] outline-none focus:border-[#525252] transition-colors"
            />
          </div>
          {query.trim() && (
            <button
              type="submit"
              disabled={isLoading}
              className="min-h-[44px] px-4 py-2 rounded-2xl bg-[#E50914] hover:bg-[#c2070f] text-white font-medium text-sm transition-colors disabled:opacity-50"
            >
              Buscar
            </button>
          )}
          {!query.trim() && (
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-3 py-2 text-[#A3A3A3] text-sm transition-colors hover:text-white"
            >
              Cancelar
            </button>
          )}
        </form>

        {/* Divider */}
        <div className="h-px bg-[#262626] mx-4" />

        {/* Quick suggestions */}
        <div className="px-4 py-4 overflow-y-auto" style={{ maxHeight: "calc(85dvh - 120px)" }}>
          <p className="text-xs text-[#525252] font-medium uppercase tracking-wider mb-3">
            Sugerencias rápidas
          </p>
          <div className="flex flex-wrap gap-2">
            {QUICK_SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleSuggestion(s)}
                className="px-3 py-2 rounded-xl bg-[#141414] border border-[#262626] text-sm text-[#A3A3A3] hover:text-white hover:border-[#525252] transition-all active:scale-95 min-h-[44px]"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
