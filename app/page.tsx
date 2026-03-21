"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import ChatInput from "@/components/ChatInput";
import MovieGrid from "@/components/MovieGrid";
import CountryPicker from "@/components/CountryPicker";
import SwipeMode from "@/components/SwipeMode";
import {
  TMDBMovie, getMovieDetails, getSimilarMovies, getMovieRecommendations,
  getPopularMovies, getTopRatedMovies, discoverMovies, searchMovies, searchPerson,
  getPosterUrl, getYear,
} from "@/lib/tmdb";
import { parseUserInput, SearchIntent } from "@/lib/movieSearch";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  movies?: TMDBMovie[];
  isLoading?: boolean;
  // for infinite scroll
  intent?: SearchIntent;
  page?: number;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

const DEFAULT_COUNTRY = "ES";

// Track seen movie IDs globally per session to avoid repeats
const seenMovieIds = new Set<number>();

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function enrichMovies(movies: TMDBMovie[], limit = 16): Promise<TMDBMovie[]> {
  // Deduplicate against seen IDs
  const fresh = movies.filter((m) => !seenMovieIds.has(m.id)).slice(0, limit);
  const enriched = await Promise.allSettled(fresh.map((m) => getMovieDetails(m.id)));
  const result = enriched
    .filter((r): r is PromiseFulfilledResult<TMDBMovie> => r.status === "fulfilled")
    .map((r) => r.value);
  result.forEach((m) => seenMovieIds.add(m.id));
  return result;
}

async function executeSearch(intent: SearchIntent, page = 1): Promise<{ movies: TMDBMovie[]; hasMore: boolean }> {
  let raw: TMDBMovie[] = [];
  let totalPages = 1;

  // Randomize starting page (within safe range) to always show different results
  const randomOffset = page === 1 ? Math.floor(Math.random() * 8) : 0;
  const effectivePage = page + randomOffset;

  // Preload 3 pages in parallel for smooth infinite scroll
  const pagesToLoad = [effectivePage, effectivePage + 1, effectivePage + 2];

  async function fetchPage(p: number): Promise<{ results: TMDBMovie[]; total_pages?: number }> {
    switch (intent.type) {
      case "popular": {
        const [pop, top] = await Promise.all([getPopularMovies(p), getTopRatedMovies(p)]);
        totalPages = Math.max(pop.total_pages ?? 1, top.total_pages ?? 1);
        return { results: shuffle([...pop.results, ...top.results]), total_pages: totalPages };
      }
      case "top_rated": return getTopRatedMovies(p);
      case "now_playing": {
        const { getNowPlayingMovies } = await import("@/lib/tmdb");
        return getNowPlayingMovies(p);
      }
      case "search": {
        if (!intent.query) return { results: [] };
        return searchMovies(intent.query, p);
      }
      case "similar": {
        if (!intent.query) return { results: [] };
        const searchRes = await searchMovies(intent.query);
        if (!searchRes.results.length) return { results: [] };
        const baseId = searchRes.results[0].id;
        const [sim, rec] = await Promise.all([getSimilarMovies(baseId, p), getMovieRecommendations(baseId, p)]);
        totalPages = Math.max(sim.total_pages ?? 1, rec.total_pages ?? 1);
        return { results: [...sim.results, ...rec.results], total_pages: totalPages };
      }
      case "discover": {
        const params: Record<string, string | number> = {
          sort_by: intent.sortBy ?? "popularity.desc",
          "vote_count.gte": intent.voteCountGte ?? 200,
          page: p,
        };
        if (intent.genres?.length) params.with_genres = intent.genres.join(",");
        if (intent.releaseDateLte) params["release_date.lte"] = intent.releaseDateLte;
        if (intent.runtimeLte) params["with_runtime.lte"] = intent.runtimeLte;
        if (intent.runtimeGte) params["with_runtime.gte"] = intent.runtimeGte;
        if (intent.personName) {
          try {
            const personRes = await searchPerson(intent.personName);
            if (personRes.results.length) params.with_people = personRes.results[0].id;
          } catch { /* ignore */ }
        }
        const res = await discoverMovies(params);
        totalPages = res.total_pages ?? 1;
        return res;
      }
      default: return { results: [] };
    }
  }

  // Fetch all 3 pages in parallel
  const pages = await Promise.allSettled(pagesToLoad.map(fetchPage));
  const allResults = pages
    .filter((r): r is PromiseFulfilledResult<{ results: TMDBMovie[]; total_pages?: number }> => r.status === "fulfilled")
    .flatMap((r) => r.value.results);

  // Deduplicate by ID
  const seen = new Set<number>();
  raw = shuffle(allResults).filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });

  if (pages[0].status === "fulfilled") {
    totalPages = pages[0].value.total_pages ?? totalPages;
  }

  const movies = await enrichMovies(raw, 18);
  return { movies, hasMore: effectivePage + 3 < Math.min(totalPages, 50) };
}

export default function HomePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [country, setCountry] = useState<string>(DEFAULT_COUNTRY);
  const [isLoading, setIsLoading] = useState(false);
  const [isApiMissing, setIsApiMissing] = useState(false);
  const [watchlist, setWatchlist] = useState<TMDBMovie[]>([]);
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [swipeMovies, setSwipeMovies] = useState<TMDBMovie[]>([]);
  const [showSwipe, setShowSwipe] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasMounted = useRef(false);

  // Country detection
  useEffect(() => {
    const stored = localStorage.getItem("pelicula-country");
    if (stored) {
      setCountry(stored);
    } else {
      fetch("https://ipapi.co/json/")
        .then((r) => r.json())
        .then((data) => { if (data.country_code) { setCountry(data.country_code); localStorage.setItem("pelicula-country", data.country_code); } })
        .catch(() => {});
    }
  }, []);

  // Load watchlist from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("pelicula-watchlist");
      if (stored) setWatchlist(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  // Load initial movies
  useEffect(() => {
    if (hasMounted.current) return;
    hasMounted.current = true;
    const loadInitial = async () => {
      const loadingId = "initial";
      setMessages([{ id: loadingId, role: "assistant", content: "Cargando películas populares...", isLoading: true }]);
      try {
        const movies = await executeSearch({ type: "popular", message: "Películas populares" });
        setMessages([{ id: loadingId, role: "assistant", content: "🎬 Películas populares del momento", movies: movies.movies, intent: { type: "popular", message: "Películas populares" }, page: 1, hasMore: movies.hasMore }]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("TMDB_API_KEY") || msg.includes("401")) {
          setIsApiMissing(true);
          setMessages([]);
        } else {
          setMessages([{ id: loadingId, role: "assistant", content: `Error al cargar películas: ${msg}` }]);
        }
      }
    };
    loadInitial();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Watchlist handlers
  const handleWatchlist = useCallback((movie: TMDBMovie) => {
    setWatchlist((prev) => {
      const exists = prev.some((m) => m.id === movie.id);
      const next = exists ? prev.filter((m) => m.id !== movie.id) : [...prev, movie];
      localStorage.setItem("pelicula-watchlist", JSON.stringify(next));
      return next;
    });
  }, []);

  const handleClearWatchlist = useCallback(() => {
    setWatchlist([]);
    localStorage.removeItem("pelicula-watchlist");
  }, []);

  const handleSimilarFromWatchlist = useCallback(async (movie: TMDBMovie) => {
    setShowWatchlist(false);
    if (isLoading) return;
    const assistantId = `similar-wl-${movie.id}-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: `user-${assistantId}`, role: "user", content: `Algo como "${movie.title}" (desde Mi lista)` },
      { id: assistantId, role: "assistant", content: "Buscando películas similares...", isLoading: true },
    ]);
    setIsLoading(true);
    try {
      const [similar, recommendations] = await Promise.all([getSimilarMovies(movie.id), getMovieRecommendations(movie.id)]);
      const combined = [...similar.results, ...recommendations.results];
      const seen = new Set<number>([movie.id]);
      const unique = combined.filter((m) => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });
      const enriched = await enrichMovies(unique);
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: `🎬 Similares a "${movie.title}"`, movies: enriched, intent: { type: "similar" as const, query: movie.title, message: `Similares a "${movie.title}"` }, page: 1, hasMore: true, isLoading: false } : m));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: `Error: ${msg}`, isLoading: false } : m));
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const handleSurprise = useCallback(async () => {
    if (isLoading) return;
    const assistantId = `surprise-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: `user-${assistantId}`, role: "user", content: "🎲 Sorprendeme" },
      { id: assistantId, role: "assistant", content: "Eligiendo...", isLoading: true },
    ]);
    setIsLoading(true);
    try {
      // Load 5 random pages simultaneously from a 50-page pool
      const pages = Array.from({ length: 5 }, () => Math.floor(Math.random() * 50) + 1);
      const results = await Promise.allSettled(
        pages.map((p) => discoverMovies({ sort_by: "vote_average.desc", "vote_count.gte": 300, page: p }))
      );
      const allMovies = results
        .filter((r): r is PromiseFulfilledResult<{ results: TMDBMovie[] }> => r.status === "fulfilled")
        .flatMap((r) => r.value.results)
        .filter((m: TMDBMovie) => m.vote_average >= 6.5);
      const seen = new Set<number>();
      const unique = shuffle(allMovies).filter((m: TMDBMovie) => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });
      const enriched = await enrichMovies(unique, 18);
      setMessages((prev) => prev.map((m) => m.id === assistantId ? {
        ...m, content: "🎲 Películas al azar — mezcladas de todo TMDB", movies: enriched,
        intent: { type: "discover" as const, sortBy: "vote_average.desc", voteCountGte: 300, message: "Random" },
        page: 1, hasMore: true, isLoading: false,
      } : m));
    } catch {
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: "Error. Intentá de nuevo.", isLoading: false } : m));
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const handleMood = useCallback(async (intent: SearchIntent, label: string) => {
    if (isLoading) return;
    const assistantId = `mood-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: `user-${assistantId}`, role: "user", content: `🎭 ${label}` },
      { id: assistantId, role: "assistant", content: "Buscando...", isLoading: true },
    ]);
    setIsLoading(true);
    try {
      const movies = await executeSearch(intent);
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: `🎬 ${intent.message}`, movies: movies.movies, intent, page: 1, hasMore: movies.hasMore, isLoading: false } : m));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: `Error: ${msg}`, isLoading: false } : m));
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const handleOpenSwipe = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      // Load a good mix for swipe mode
      const [pop, top] = await Promise.all([getPopularMovies(1), getTopRatedMovies(1)]);
      const combined = [...pop.results.slice(0, 10), ...top.results.slice(0, 10)];
      const seen = new Set<number>();
      const unique = combined.filter((m) => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });
      const enriched = await enrichMovies(unique, 16);
      setSwipeMovies(enriched);
      setShowSwipe(true);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const handleSwipeClose = useCallback(() => {
    setShowSwipe(false);
    setShowWatchlist(true); // show watchlist after swipe so they can see what they saved
  }, []);

  const handleLoadMore = useCallback(async (messageId: string) => {
    // Use a ref-like pattern: capture intent/page from latest state inside setMessages
    let capturedIntent: SearchIntent | undefined;
    let capturedPage: number = 1;

    setMessages((prev) => {
      const msg = prev.find((m) => m.id === messageId);
      if (!msg?.intent || msg.isLoadingMore) return prev;
      capturedIntent = msg.intent;
      capturedPage = msg.page ?? 1;
      return prev.map((m) => m.id === messageId ? { ...m, isLoadingMore: true } : m);
    });

    // Give React a tick to flush the state read above
    await new Promise((r) => setTimeout(r, 0));

    if (!capturedIntent) return;
    const nextPage = capturedPage + 3;
    try {
      const result = await executeSearch(capturedIntent, nextPage);
      setMessages((prev) => prev.map((m) => m.id === messageId ? {
        ...m,
        movies: [...(m.movies ?? []), ...result.movies],
        page: nextPage,
        hasMore: result.hasMore,
        isLoadingMore: false,
      } : m));
    } catch {
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, isLoadingMore: false } : m));
    }
  }, []);

  const handleSubmit = useCallback(async (userInput: string) => {
    if (isLoading) return;
    const userId = Date.now().toString();
    const assistantId = `${userId}-reply`;
    setMessages((prev) => [
      ...prev,
      { id: userId, role: "user", content: userInput },
      { id: assistantId, role: "assistant", content: "Buscando...", isLoading: true },
    ]);
    setIsLoading(true);
    try {
      const intent = await parseUserInput(userInput);
      const result = await executeSearch(intent);
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: `🎬 ${intent.message}`, movies: result.movies, intent, page: 1, hasMore: result.hasMore, isLoading: false } : m));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: `Error: ${msg}`, isLoading: false } : m));
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const handleSimilar = useCallback(async (movie: TMDBMovie) => {
    if (isLoading) return;
    const assistantId = `similar-${movie.id}-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: `user-${assistantId}`, role: "user", content: `Algo como "${movie.title}"` },
      { id: assistantId, role: "assistant", content: "Buscando películas similares...", isLoading: true },
    ]);
    setIsLoading(true);
    try {
      const [similar, recommendations] = await Promise.all([getSimilarMovies(movie.id), getMovieRecommendations(movie.id)]);
      const combined = [...similar.results, ...recommendations.results];
      const seen = new Set<number>([movie.id]);
      const unique = combined.filter((m) => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });
      const enriched = await enrichMovies(unique);
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: `🎬 Películas similares a "${movie.title}"`, movies: enriched, intent: { type: "similar" as const, query: movie.title, message: `Similares a "${movie.title}"` }, page: 1, hasMore: true, isLoading: false } : m));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: `Error: ${msg}`, isLoading: false } : m));
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
            <p className="text-xs text-gray-500 leading-tight hidden sm:block">Recomendaciones personalizadas</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 hidden sm:block">Streaming en:</span>
          <CountryPicker currentCountry={country} onCountryChange={setCountry} />

          {/* Watchlist button */}
          <button
            onClick={() => setShowWatchlist(true)}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-sm text-gray-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 3h14a1 1 0 011 1v17l-7-3.5L5 21V4a1 1 0 011-1z" />
            </svg>
            <span className="hidden sm:inline">Mi lista</span>
            {watchlist.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-yellow-400 text-gray-900 text-xs font-bold flex items-center justify-center">
                {watchlist.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {isApiMissing && (
          <div className="bg-amber-900/30 border border-amber-700/50 rounded-2xl p-4 text-sm">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-semibold text-amber-300 mb-1">Clave de API no configurada</p>
                <p className="text-amber-400/80 mb-2">Para usar esta app necesitas una clave gratuita de TMDB.</p>
                <ol className="text-amber-400/70 space-y-1 list-decimal list-inside text-xs">
                  <li>Regístrate gratis en <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer" className="text-amber-300 underline">themoviedb.org</a></li>
                  <li>Copia tu API Key (v3)</li>
                  <li>Crea el archivo <code className="bg-amber-950/50 px-1 rounded">.env.local</code> en la raíz del proyecto</li>
                  <li>Agrega: <code className="bg-amber-950/50 px-1 rounded">TMDB_API_KEY=tu_clave_aqui</code></li>
                  <li>Reinicia el servidor con <code className="bg-amber-950/50 px-1 rounded">npm run dev</code></li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className="animate-slide-up">
            {message.role === "user" && (
              <div className="flex justify-end mb-2">
                <div className="max-w-xs bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm">{message.content}</div>
              </div>
            )}
            {message.role === "assistant" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-700 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs">🎬</span>
                  </div>
                  <p className="text-sm text-gray-300 font-medium">
                    {message.isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="inline-flex gap-1">
                          {[0, 1, 2].map((i) => (
                            <span key={i} className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                          ))}
                        </span>
                        {message.content}
                      </span>
                    ) : message.content}
                  </p>
                </div>
                {(message.movies || message.isLoading) && (
                  <MovieGrid
                    movies={message.movies ?? []}
                    countryCode={country}
                    onSimilar={handleSimilar}
                    onWatchlist={handleWatchlist}
                    watchlist={watchlist}
                    isLoading={message.isLoading}
                    isLoadingMore={message.isLoadingMore}
                    onLoadMore={message.hasMore ? () => handleLoadMore(message.id) : undefined}
                  />
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <ChatInput
        onSubmit={handleSubmit}
        onMood={handleMood}
        onSurprise={handleSurprise}
        onSwipe={handleOpenSwipe}
        isLoading={isLoading}
        placeholder="¿Qué tipo de película quieres ver?"
      />

      {/* Swipe mode */}
      {showSwipe && (
        <SwipeMode
          movies={swipeMovies}
          countryCode={country}
          onLike={handleWatchlist}
          onDislike={() => {}}
          onClose={handleSwipeClose}
          watchlist={watchlist}
        />
      )}

      {/* Watchlist panel (slide-over) */}
      {showWatchlist && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setShowWatchlist(false)} />

          {/* Panel */}
          <div className="w-full max-w-sm bg-gray-950 border-l border-gray-800 flex flex-col h-full overflow-hidden animate-slide-up">
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 3h14a1 1 0 011 1v17l-7-3.5L5 21V4a1 1 0 011-1z" />
                </svg>
                <h2 className="font-semibold text-white">Mi lista</h2>
                <span className="text-xs text-gray-500">{watchlist.length} película{watchlist.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex items-center gap-2">
                {watchlist.length > 0 && (
                  <button onClick={handleClearWatchlist} className="text-xs text-gray-500 hover:text-red-400 transition-colors">
                    Limpiar
                  </button>
                )}
                <button onClick={() => setShowWatchlist(false)} className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Panel content */}
            <div className="flex-1 overflow-y-auto p-4">
              {watchlist.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <svg className="w-14 h-14 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3h14a1 1 0 011 1v17l-7-3.5L5 21V4a1 1 0 011-1z" />
                  </svg>
                  <p className="text-gray-500 text-sm">Tu lista está vacía</p>
                  <p className="text-gray-600 text-xs">Guardá películas tocando el 🔖 en cada card</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {watchlist.map((movie) => {
                    const poster = getPosterUrl(movie.poster_path, "w342");
                    const year = getYear(movie.release_date);
                    const rating = movie.vote_average?.toFixed(1);
                    return (
                      <div key={movie.id} className="flex gap-3 bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-gray-700 transition-colors">
                        {/* Mini poster */}
                        <div className="relative w-14 h-20 flex-shrink-0 bg-gray-800">
                          {poster && <Image src={poster} alt={movie.title} fill sizes="56px" className="object-cover" />}
                        </div>
                        {/* Info */}
                        <div className="flex flex-col flex-1 py-2 pr-2 gap-1 min-w-0">
                          <p className="font-medium text-sm text-white leading-tight line-clamp-2">{movie.title}</p>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            {year && <span>{year}</span>}
                            {rating && parseFloat(rating) > 0 && (
                              <>
                                <span>·</span>
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="#F5C518"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                                <span style={{ color: "#F5C518" }}>{rating}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-auto">
                            <button
                              onClick={() => handleSimilarFromWatchlist(movie)}
                              className="text-xs px-2 py-1 rounded-lg bg-indigo-900/50 hover:bg-indigo-800/70 border border-indigo-800/50 text-indigo-300 hover:text-indigo-200 transition-all"
                            >
                              Como esta →
                            </button>
                            <button
                              onClick={() => handleWatchlist(movie)}
                              className="text-xs px-2 py-1 rounded-lg bg-gray-800 hover:bg-red-900/40 border border-gray-700 hover:border-red-800/50 text-gray-400 hover:text-red-400 transition-all"
                            >
                              Quitar
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
