import { SearchIntent } from "@/lib/movieSearch";

// Mood → TMDB params mapping
export interface MoodOption {
  emoji: string;
  label: string;
  intent: SearchIntent;
}

export const MOODS: MoodOption[] = [
  {
    emoji: "😂",
    label: "Me quiero reír",
    intent: { type: "discover", genres: [35], sortBy: "vote_average.desc", voteCountGte: 500, message: "Comedias para partirte de risa" },
  },
  {
    emoji: "😱",
    label: "Quiero tensión",
    intent: { type: "discover", genres: [53, 27], sortBy: "vote_average.desc", voteCountGte: 500, message: "Thrillers y terror que te ponen nervioso" },
  },
  {
    emoji: "🤯",
    label: "Que me vuele la cabeza",
    intent: { type: "discover", genres: [878, 53], sortBy: "vote_average.desc", voteCountGte: 1000, message: "Películas que te vuelan la cabeza" },
  },
  {
    emoji: "😢",
    label: "Algo que emocione",
    intent: { type: "discover", genres: [18, 10749], sortBy: "vote_average.desc", voteCountGte: 800, message: "Dramas que te llegan al alma" },
  },
  {
    emoji: "💥",
    label: "Adrenalina pura",
    intent: { type: "discover", genres: [28, 12], sortBy: "popularity.desc", voteCountGte: 500, message: "Acción y aventura a full" },
  },
  {
    emoji: "😌",
    label: "Algo tranquilo",
    intent: { type: "discover", genres: [18, 10751], sortBy: "vote_average.desc", voteCountGte: 500, runtimeLte: 110, message: "Algo tranquilo para relajarse" },
  },
  {
    emoji: "🚀",
    label: "Ciencia ficción épica",
    intent: { type: "discover", genres: [878], sortBy: "vote_average.desc", voteCountGte: 800, message: "Ciencia ficción de la buena" },
  },
  {
    emoji: "🔍",
    label: "Misterio e intriga",
    intent: { type: "discover", genres: [9648, 80, 53], sortBy: "vote_average.desc", voteCountGte: 500, message: "Misterio y crimen que enganchan" },
  },
];
