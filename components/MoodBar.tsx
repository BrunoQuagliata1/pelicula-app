"use client";

import { MOODS } from "@/lib/moods";
import { SearchIntent } from "@/lib/movieSearch";

interface MoodBarProps {
  activeMood: string;
  onSelect: (key: string, intent: SearchIntent, label: string) => void;
}

const ALL_MOODS = [
  { key: "popular", emoji: "🔥", label: "Populares", intent: { type: "popular" as const, message: "Populares ahora" } },
  { key: "top", emoji: "⭐", label: "Top IMDb", intent: { type: "top_rated" as const, message: "Las mejor valoradas" } },
  ...MOODS.map((m, i) => ({ key: `mood-${i}`, emoji: m.emoji, label: m.label, intent: m.intent })),
];

export default function MoodBar({ activeMood, onSelect }: MoodBarProps) {
  return (
    <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar flex-shrink-0">
      {ALL_MOODS.map((mood) => {
        const isActive = activeMood === mood.key;
        return (
          <button
            key={mood.key}
            onClick={() => onSelect(mood.key, mood.intent, mood.label)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              background: isActive ? "var(--accent)" : "var(--surface)",
              color: isActive ? "var(--accent-text)" : "var(--text-2)",
              border: isActive ? "none" : "1px solid var(--border)",
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 500,
            }}
          >
            <span>{mood.emoji}</span>
            <span className="whitespace-nowrap">{mood.label}</span>
          </button>
        );
      })}
    </div>
  );
}
