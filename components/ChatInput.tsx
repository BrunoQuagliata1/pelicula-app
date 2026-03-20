"use client";

import { useState, useRef, useEffect } from "react";
import { MOODS } from "@/lib/moods";
import { SearchIntent } from "@/lib/movieSearch";

interface ChatInputProps {
  onSubmit: (message: string) => void;
  onMood: (intent: SearchIntent, label: string) => void;
  onSurprise: () => void;
  onSwipe: () => void;
  isLoading: boolean;
  placeholder?: string;
}

export default function ChatInput({ onSubmit, onMood, onSurprise, onSwipe, isLoading, placeholder }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [tab, setTab] = useState<"buscar" | "animo">("buscar");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSubmit(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const trimmed = input.trim();
      if (trimmed && !isLoading) { onSubmit(trimmed); setInput(""); }
    }
  };

  return (
    <div className="border-t border-gray-800 bg-gray-950/95 backdrop-blur-sm">
      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 pt-3 pb-0">
        <button
          onClick={() => setTab("buscar")}
          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${tab === "buscar" ? "bg-indigo-600 text-white" : "text-gray-500 hover:text-gray-300"}`}
        >
          🔍 Buscar
        </button>
        <button
          onClick={() => setTab("animo")}
          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${tab === "animo" ? "bg-indigo-600 text-white" : "text-gray-500 hover:text-gray-300"}`}
        >
          🎭 Por ánimo
        </button>
        <div className="ml-auto flex items-center gap-1.5">
          {/* Sorprendeme */}
          <button
            onClick={onSurprise}
            disabled={isLoading}
            title="Sorprendeme"
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full bg-gray-800 hover:bg-purple-900/50 border border-gray-700 hover:border-purple-700 text-gray-400 hover:text-purple-300 transition-all disabled:opacity-40"
          >
            🎲 Random
          </button>
          {/* Swipe mode */}
          <button
            onClick={onSwipe}
            disabled={isLoading}
            title="Modo swipe"
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full bg-gray-800 hover:bg-pink-900/50 border border-gray-700 hover:border-pink-700 text-gray-400 hover:text-pink-300 transition-all disabled:opacity-40"
          >
            👆 Swipe
          </button>
        </div>
      </div>

      {/* Tab content */}
      {tab === "buscar" ? (
        /* Search input */
        <form onSubmit={handleSubmit} className="flex items-end gap-3 px-4 py-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder ?? "Ej: algo de acción, como Inception, con Cate Blanchett..."}
              disabled={isLoading}
              rows={1}
              className="w-full bg-gray-900 border border-gray-700 rounded-2xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 resize-none outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-colors disabled:opacity-60 leading-relaxed"
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isLoading ? (
              <svg className="w-4 h-4 text-gray-300 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </form>
      ) : (
        /* Mood grid */
        <div className="px-4 py-3 grid grid-cols-4 gap-2">
          {MOODS.map((mood) => (
            <button
              key={mood.label}
              onClick={() => { onMood(mood.intent, mood.label); setTab("buscar"); }}
              disabled={isLoading}
              className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 text-center transition-all disabled:opacity-40 active:scale-95"
            >
              <span className="text-xl leading-none">{mood.emoji}</span>
              <span className="text-gray-400 text-[10px] leading-tight">{mood.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
