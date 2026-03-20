"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ChatInput from "@/components/ChatInput";
import MovieGrid from "@/components/MovieGrid";
import CountryPicker from "@/components/CountryPicker";
import { TMDBMovie, getMovieDetails, getSimilarMovies, getMovieRecommendations, getPopularMovies, getTopRatedMovies, discoverMovies, searchMovies, searchPerson } from "@/lib/tmdb";
import { parseUserInput, SearchIntent } from "@/lib/movieSearch";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  movies?: TMDBMovie[];
  isLoading?: boolean;
}

const DEFAULT_COUNTRY = "ES";

async function enrichMovies(movies: TMDBMovie[], limit = 12): Promise<TMDBMovie[]> {
  const slice = movies.slice(0, limit);
  const enriched = await Promise.allSettled(
    slice.map((m) => getMovieDetails(m.id))
  );
  return enriched
    .filter((r): r is PromiseFulfilledResult<TMDBMovie> => r.status === "fulfilled")
    .map((r) => r.value);
}

async function executeSearch(intent: SearchIntent): Promise<TMDBMovie[]> {
  switch (intent.type) {
    case "popular": {
      const [pop, top] = await Promise.all([
        getPopularMovies(1),
        getTopRatedMovies(1),
      ]);
      const combined = [
        ...pop.results.slice(0, 8),
        ...top.results.slice(0, 8),
      ];
      // Deduplicate
      const seen = new Set<number>();
      const unique = combined.filter((m) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });
      return enrichMovies(unique);
    }

    case "top_rated": {
      const res = await getTopRatedMovies(1);
      return enrichMovies(res.results);
    }

    case "now_playing": {
      const { getNowPlayingMovies } = await import("@/lib/tmdb");
      const res = await getNowPlayingMovies(1);
      return enrichMovies(res.results);
    }

    case "search": {
      if (!intent.query) return [];
      const res = await searchMovies(intent.query);
      return enrichMovies(res.results);
    }

    case "similar": {
      if (!intent.query) return [];
      // Search for the base movie
      const searchRes = await searchMovies(intent.query);
      if (!searchRes.results.length) return [];
      const baseId = searchRes.results[0].id;
      const [similar, recommendations] = await Promise.all([
        getSimilarMovies(baseId),
        getMovieRecommendations(baseId),
      ]);
      const combined = [...similar.results, ...recommendations.results];
      const seen = new Set<number>();
      const unique = combined.filter((m) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });
      return enrichMovies(unique);
    }

    case "discover": {
      const params: Record<string, string | number> = {
        sort_by: intent.sortBy ?? "popularity.desc",
        "vote_count.gte": intent.voteCountGte ?? 200,
        page: 1,
      };
      if (intent.genres?.length) {
        params.with_genres = intent.genres.join(",");
      }
      if (intent.releaseDateLte) {
        params["release_date.lte"] = intent.releaseDateLte;
      }
      if (intent.runtimeLte) {
        params["with_runtime.lte"] = intent.runtimeLte;
      }
      if (intent.runtimeGte) {
        params["with_runtime.gte"] = intent.runtimeGte;
      }

      // If we have a person, first look up their ID
      if (intent.personName) {
        try {
          const personRes = await searchPerson(intent.personName);
          if (personRes.results.length) {
            params.with_people = personRes.results[0].id;
          }
        } catch {
          // ignore
        }
      }

      const res = await discoverMovies(params);
      return enrichMovies(res.results);
    }

    default:
      return [];
  }
}

export default function HomePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [country, setCountry] = useState<string>(DEFAULT_COUNTRY);
  const [isLoading, setIsLoading] = useState(false);
  const [isApiMissing, setIsApiMissing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasMounted = useRef(false);

  // Detect country on mount
  useEffect(() => {
    const stored = localStorage.getItem("pelicula-country");
    if (stored) {
      setCountry(stored);
    } else {
      fetch("https://ipapi.co/json/")
        .then((r) => r.json())
        .then((data) => {
          if (data.country_code) {
            setCountry(data.country_code);
            localStorage.setItem("pelicula-country", data.country_code);
          }
        })
        .catch(() => {/* use default */});
    }
  }, []);

  // Load initial popular movies
  useEffect(() => {
    if (hasMounted.current) return;
    hasMounted.current = true;

    const loadInitial = async () => {
      const loadingId = "initial";
      setMessages([
        {
          id: loadingId,
          role: "assistant",
          content: "Cargando películas populares...",
          isLoading: true,
        },
      ]);

      try {
        const movies = await executeSearch({ type: "popular", message: "Películas populares" });
        setMessages([
          {
            id: loadingId,
            role: "assistant",
            content: "🎬 Películas populares del momento",
            movies,
          },
        ]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("TMDB_API_KEY") || msg.includes("401")) {
          setIsApiMissing(true);
          setMessages([]);
        } else {
          setMessages([
            {
              id: loadingId,
              role: "assistant",
              content: `Error al cargar películas: ${msg}`,
            },
          ]);
        }
      }
    };

    loadInitial();
  }, []);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = useCallback(async (userInput: string) => {
    if (isLoading) return;

    const userId = Date.now().toString();
    const assistantId = `${userId}-reply`;

    // Add user message
    setMessages((prev) => [
      ...prev,
      { id: userId, role: "user", content: userInput },
      { id: assistantId, role: "assistant", content: "Buscando...", isLoading: true },
    ]);
    setIsLoading(true);

    try {
      const intent = await parseUserInput(userInput);
      const movies = await executeSearch(intent);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: `🎬 ${intent.message}`, movies, isLoading: false }
            : m
        )
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: `Error: ${msg}`, isLoading: false }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const handleSimilar = useCallback(async (movie: TMDBMovie) => {
    if (isLoading) return;

    const assistantId = `similar-${movie.id}-${Date.now()}`;

    setMessages((prev) => [
      ...prev,
      {
        id: `user-${assistantId}`,
        role: "user",
        content: `Algo como "${movie.title}"`,
      },
      {
        id: assistantId,
        role: "assistant",
        content: "Buscando películas similares...",
        isLoading: true,
      },
    ]);
    setIsLoading(true);

    try {
      const [similar, recommendations] = await Promise.all([
        getSimilarMovies(movie.id),
        getMovieRecommendations(movie.id),
      ]);

      const combined = [...similar.results, ...recommendations.results];
      const seen = new Set<number>([movie.id]);
      const unique = combined.filter((m) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });

      const enriched = await enrichMovies(unique);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: `🎬 Películas similares a "${movie.title}"`,
                movies: enriched,
                isLoading: false,
              }
            : m
        )
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: `Error: ${msg}`, isLoading: false }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  return (
    <div className="flex flex-col h-dvh bg-gray-950">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-950/95 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎬</span>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">¿Qué película ver?</h1>
            <p className="text-xs text-gray-500 leading-tight hidden sm:block">
              Recomendaciones personalizadas
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 hidden sm:block">Streaming en:</span>
          <CountryPicker currentCountry={country} onCountryChange={setCountry} />
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* API Key missing banner */}
        {isApiMissing && (
          <div className="bg-amber-900/30 border border-amber-700/50 rounded-2xl p-4 text-sm">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-semibold text-amber-300 mb-1">Clave de API no configurada</p>
                <p className="text-amber-400/80 mb-2">
                  Para usar esta app necesitas una clave gratuita de TMDB.
                </p>
                <ol className="text-amber-400/70 space-y-1 list-decimal list-inside text-xs">
                  <li>
                    Regístrate gratis en{" "}
                    <a
                      href="https://www.themoviedb.org/settings/api"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-300 underline"
                    >
                      themoviedb.org
                    </a>
                  </li>
                  <li>Copia tu API Key (v3)</li>
                  <li>
                    Crea el archivo <code className="bg-amber-950/50 px-1 rounded">.env.local</code>{" "}
                    en la raíz del proyecto
                  </li>
                  <li>
                    Agrega:{" "}
                    <code className="bg-amber-950/50 px-1 rounded">TMDB_API_KEY=tu_clave_aqui</code>
                  </li>
                  <li>Reinicia el servidor con <code className="bg-amber-950/50 px-1 rounded">npm run dev</code></li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className="animate-slide-up">
            {/* User message */}
            {message.role === "user" && (
              <div className="flex justify-end mb-2">
                <div className="max-w-xs bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm">
                  {message.content}
                </div>
              </div>
            )}

            {/* Assistant message */}
            {message.role === "assistant" && (
              <div className="space-y-3">
                {/* Label */}
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-700 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs">🎬</span>
                  </div>
                  <p className="text-sm text-gray-300 font-medium">
                    {message.isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="inline-flex gap-1">
                          {[0, 1, 2].map((i) => (
                            <span
                              key={i}
                              className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"
                              style={{ animationDelay: `${i * 0.15}s` }}
                            />
                          ))}
                        </span>
                        {message.content}
                      </span>
                    ) : (
                      message.content
                    )}
                  </p>
                </div>

                {/* Movies grid */}
                {(message.movies || message.isLoading) && (
                  <MovieGrid
                    movies={message.movies ?? []}
                    countryCode={country}
                    onSimilar={handleSimilar}
                    isLoading={message.isLoading}
                  />
                )}
              </div>
            )}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat input */}
      <ChatInput
        onSubmit={handleSubmit}
        isLoading={isLoading}
        placeholder="¿Qué tipo de película quieres ver?"
      />
    </div>
  );
}
