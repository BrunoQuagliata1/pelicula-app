"use client";

import { MOODS } from "@/lib/moods";
import { SearchIntent } from "@/lib/movieSearch";

interface MoodBarProps {
  activeMood: string;
  onMood: (intent: SearchIntent, label: string, key: string) => void;
  isLoading?: boolean;
}

const POPULAR_MOOD = {
  emoji: "🔥",
  label: "Populares",
  key: "popular",
  intent: { type: "popular" as const, message: "Películas populares del momento" },
};

export default function MoodBar({ activeMood, onMood, isLoading }: MoodBarProps) {
  const allMoods = [
    POPULAR_MOOD,
    ...MOODS.map((m) => ({ ...m, key: m.label })),
  ];

  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar flex-shrink-0 border-b border-[#262626]">
      {allMoods.map((mood) => {
        const isActive = activeMood === mood.key;
        return (
          <button
            key={mood.key}
            onClick={() => !isLoading && onMood(mood.intent, mood.label, mood.key)}
            disabled={isLoading}
            className={`
              flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
              transition-all duration-200 border whitespace-nowrap
              ${isActive
                ? "bg-[#E50914] border-[#E50914] text-white"
                : "bg-[#141414] border-[#262626] text-[#A3A3A3] hover:border-[#525252] hover:text-white active:scale-95"
              }
              disabled:opacity-50
            `}
          >
            <span className="text-base leading-none">{mood.emoji}</span>
            <span>{mood.label}</span>
          </button>
        );
      })}
    </div>
  );
}
