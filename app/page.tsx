"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import MovieGrid from "@/components/MovieGrid";
import MovieSheet from "@/components/MovieSheet";
import MoodBar from "@/components/MoodBar";
import SearchSheet from "@/components/SearchSheet";
import BottomBar from "@/components/BottomBar";
import CountryPicker from "@/components/CountryPicker";
import SwipeMode from "@/components/SwipeMode";
import {
  TMDBMovie,
  getMovieDetails,
  getSimilarMovies,
  getMovieRecommendations,
  getPopularMovies,
  getTopRatedMovies,
  discoverMovies,
  searchMovies,
  searchPerson,
  getPosterUrl,
  getYear,
} from "@/lib/tmdb";
import { parseUserInput, SearchIntent } from "@/lib/movieSearch";

// ── Types ──────────────────────────────────────────────────
interface FeedState {
  movies: TMDBMovie[];
  intent: SearchIntent;
  page: number;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  label: string;
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
  const fresh = movies.filter((m) => !seenMovieIds.has(m.id)).slice(0, limit);
  const enriched = await Promise.allSettled(fresh.map((m) => getMovieDetails(m.id)));
  const result = enriched
    .filter((r): r is PromiseFulfilledResult<TMDBMovie> => r.status === "fulfilled")
    .map((r) => r.value);
  result.forEach((m) => seenMovieIds.add(m.id));
  return result;
}

async function executeSearch(
  intent: SearchIntent,
  page = 1
): Promise<{ movies: TMDBMovie[]; hasMore: boolean }> {
  let raw: TMDBMovie[] = [];
  let totalPages = 1;

  const randomOffset = page === 1 ? Math.floor(Math.random() * 8) : 0;
  const effectivePage = page + randomOffset;
  const pagesToLoad = [effectivePage, effectivePage + 1, effectivePage + 2];

  async function fetchPage(p: number): Promise<{ results: TMDBMovie[]; total_pages?: number }> {
    switch (intent.type) {
      case "popular": {
        const [pop, top] = await Promise.all([getPopularMovies(p), getTopRatedMovies(p)]);
        totalPages = Math.max(pop.total_pages ?? 1, top.total_pages ?? 1);
        return { results: shuffle([...pop.results, ...top.results]), total_pages: totalPages };
      }
      case "top_rated":
        return getTopRatedMovies(p);
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
        const [sim, rec] = await Promise.all([
          getSimilarMovies(baseId, p),
          getMovieRecommendations(baseId, p),
        ]);
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
      default:
        return { results: [] };
    }
  }

  const pages = await Promise.allSettled(pagesToLoad.map(fetchPage));
  const allResults = pages
    .filter(
      (r): r is PromiseFulfilledResult<{ results: TMDBMovie[]; total_pages?: number }> =>
        r.status === "fulfilled"
    )
    .flatMap((r) => r.value.results);

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

// ── Component ──────────────────────────────────────────────
export default function HomePage() {
  const [country, setCountry] = useState<string>(DEFAULT_COUNTRY);
  const [watchlist, setWatchlist] = useState<TMDBMovie[]>([]);

  // Feed state
  const [feed, setFeed] = useState<FeedState>({
    movies: [],
    intent: { type: "popular", message: "Películas populares del momento" },
    page: 1,
    hasMore: true,
    isLoading: true,
    isLoadingMore: false,
    label: "🔥 Populares",
  });

  // UI state
  const [activeMoodKey, setActiveMoodKey] = useState("popular");
  const [searchSheetOpen, setSearchSheetOpen] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<TMDBMovie | null>(null);
  const [movieSheetOpen, setMovieSheetOpen] = useState(false);
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [showSwipe, setShowSwipe] = useState(false);
  const [swipeMovies, setSwipeMovies] = useState<TMDBMovie[]>([]);
  const [isApiMissing, setIsApiMissing] = useState(false);
  const [activeTab, setActiveTab] = useState<"home" | "search" | "list">("home");

  const hasMounted = useRef(false);
  const isFetching = useRef(false);

  // ── Country detection ────────────────────────────────────
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
        .catch(() => {});
    }
  }, []);

  // ── Load watchlist ───────────────────────────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem("pelicula-watchlist");
      if (stored) setWatchlist(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  // ── Initial load ─────────────────────────────────────────
  useEffect(() => {
    if (hasMounted.current) return;
    hasMounted.current = true;

    const loadInitial = async () => {
      try {
        const result = await executeSearch({ type: "popular", message: "Películas populares del momento" });
        setFeed((prev) => ({
          ...prev,
          movies: result.movies,
          hasMore: result.hasMore,
          isLoading: false,
        }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("TMDB_API_KEY") || msg.includes("401")) {
          setIsApiMissing(true);
        }
        setFeed((prev) => ({ ...prev, isLoading: false }));
      }
    };

    loadInitial();
  }, []);

  // ── Helpers ──────────────────────────────────────────────
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

  const loadFeed = useCallback(async (intent: SearchIntent, label: string, moodKey: string) => {
    if (isFetching.current) return;
    isFetching.current = true;
    setActiveMoodKey(moodKey);
    setFeed((prev) => ({ ...prev, isLoading: true, movies: [], intent, label, page: 1, hasMore: true }));
    try {
      seenMovieIds.clear();
      const result = await executeSearch(intent);
      setFeed({
        movies: result.movies,
        intent,
        page: 1,
        hasMore: result.hasMore,
        isLoading: false,
        isLoadingMore: false,
        label,
      });
    } catch (err) {
      console.error(err);
      setFeed((prev) => ({ ...prev, isLoading: false }));
    } finally {
      isFetching.current = false;
    }
  }, []);

  const handleMood = useCallback(
    (intent: SearchIntent, label: string, key: string) => {
      loadFeed(intent, `🎬 ${label}`, key);
    },
    [loadFeed]
  );

  const handleSearch = useCallback(
    async (query: string) => {
      const intent = await parseUserInput(query);
      loadFeed(intent, `🔍 "${query}"`, `search-${query}`);
    },
    [loadFeed]
  );

  const handleSimilar = useCallback(
    async (movie: TMDBMovie) => {
      if (isFetching.current) return;
      isFetching.current = true;
      const intent: SearchIntent = {
        type: "similar",
        query: movie.title,
        message: `Similares a "${movie.title}"`,
      };
      setActiveMoodKey(`similar-${movie.id}`);
      setFeed((prev) => ({
        ...prev,
        isLoading: true,
        movies: [],
        intent,
        label: `🎬 Similares a "${movie.title}"`,
        page: 1,
        hasMore: true,
      }));
      try {
        seenMovieIds.clear();
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
        setFeed({
          movies: enriched,
          intent,
          page: 1,
          hasMore: true,
          isLoading: false,
          isLoadingMore: false,
          label: `🎬 Similares a "${movie.title}"`,
        });
      } catch (err) {
        console.error(err);
        setFeed((prev) => ({ ...prev, isLoading: false }));
      } finally {
        isFetching.current = false;
      }
    },
    []
  );

  const handleLoadMore = useCallback(async () => {
    setFeed((prev) => {
      if (prev.isLoadingMore || !prev.hasMore) return prev;
      // Trigger load asynchronously
      const nextPage = prev.page + 3;
      executeSearch(prev.intent, nextPage).then((result) => {
        setFeed((p) => ({
          ...p,
          movies: [...p.movies, ...result.movies],
          page: nextPage,
          hasMore: result.hasMore,
          isLoadingMore: false,
        }));
      }).catch(() => {
        setFeed((p) => ({ ...p, isLoadingMore: false }));
      });
      return { ...prev, isLoadingMore: true };
    });
  }, []);

  const handleCardTap = useCallback((movie: TMDBMovie) => {
    setSelectedMovie(movie);
    setMovieSheetOpen(true);
  }, []);

  const handleOpenSwipe = useCallback(async () => {
    if (isFetching.current) return;
    isFetching.current = true;
    try {
      const [pop, top] = await Promise.all([getPopularMovies(1), getTopRatedMovies(1)]);
      const combined = [...pop.results.slice(0, 10), ...top.results.slice(0, 10)];
      const seen = new Set<number>();
      const unique = combined.filter((m) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });
      const enriched = await enrichMovies(unique, 16);
      setSwipeMovies(enriched);
      setShowSwipe(true);
    } catch { /* ignore */ } finally {
      isFetching.current = false;
    }
  }, []);

  const handleSwipeClose = useCallback(() => {
    setShowSwipe(false);
    setShowWatchlist(true);
  }, []);

  const handleSimilarFromWatchlist = useCallback(
    async (movie: TMDBMovie) => {
      setShowWatchlist(false);
      await handleSimilar(movie);
    },
    [handleSimilar]
  );

  // Bottom bar handlers
  const handleBottomHome = () => {
    setActiveTab("home");
    setSearchSheetOpen(false);
    setShowWatchlist(false);
  };
  const handleBottomSearch = () => {
    setActiveTab("search");
    setSearchSheetOpen(true);
  };
  const handleBottomList = () => {
    setActiveTab("list");
    setShowWatchlist(true);
  };

  return (
    <div className="flex flex-col h-dvh bg-[#0A0A0A] overflow-hidden">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-[#262626] bg-[#0A0A0A]/95 backdrop-blur-sm flex-shrink-0 z-10">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">🎬</span>
          <div>
            <h1 className="text-base font-bold text-white leading-tight tracking-tight">Cineclub</h1>
            <p className="text-[10px] text-[#525252] leading-tight hidden sm:block">Tu próxima película favorita</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search icon button (desktop) */}
          <button
            onClick={() => setSearchSheetOpen(true)}
            className="hidden sm:flex w-9 h-9 items-center justify-center rounded-xl bg-[#141414] border border-[#262626] text-[#A3A3A3] hover:text-white hover:border-[#525252] transition-all"
            aria-label="Buscar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          {/* Swipe mode button */}
          <button
            onClick={handleOpenSwipe}
            disabled={feed.isLoading}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#141414] border border-[#262626] text-[#A3A3A3] hover:text-white hover:border-[#525252] transition-all text-xs font-medium disabled:opacity-40"
            aria-label="Modo swipe"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
            </svg>
            Swipe
          </button>

          <CountryPicker currentCountry={country} onCountryChange={setCountry} />
        </div>
      </header>

      {/* ── Mood bar ────────────────────────────────────────── */}
      <MoodBar
        activeMood={activeMoodKey}
        onMood={handleMood}
        isLoading={feed.isLoading}
      />

      {/* ── Feed label ──────────────────────────────────────── */}
      {feed.label && !feed.isLoading && (
        <div className="px-4 pt-3 pb-1 flex-shrink-0">
          <p className="text-xs text-[#525252] font-medium">{feed.label}</p>
        </div>
      )}

      {/* ── Main feed ───────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        {isApiMissing && (
          <div className="mx-4 mt-4 bg-amber-950/30 border border-amber-700/40 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="font-semibold text-amber-300 text-sm mb-1">Clave de API no configurada</p>
                <p className="text-amber-400/80 text-xs mb-2">Necesitás una clave gratuita de TMDB.</p>
                <ol className="text-amber-400/60 space-y-1 list-decimal list-inside text-xs">
                  <li>Regístrate en <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer" className="text-amber-300 underline">themoviedb.org</a></li>
                  <li>Copiá tu API Key (v3)</li>
                  <li>Creá <code className="bg-amber-950/50 px-1 rounded">.env.local</code> y agregá <code className="bg-amber-950/50 px-1 rounded">TMDB_API_KEY=tu_clave</code></li>
                  <li>Reiniciá con <code className="bg-amber-950/50 px-1 rounded">npm run dev</code></li>
                </ol>
              </div>
            </div>
          </div>
        )}

        <MovieGrid
          movies={feed.movies}
          countryCode={country}
          onCardTap={handleCardTap}
          onWatchlist={handleWatchlist}
          watchlist={watchlist}
          isLoading={feed.isLoading}
          isLoadingMore={feed.isLoadingMore}
          onLoadMore={feed.hasMore ? handleLoadMore : undefined}
        />
      </main>

      {/* ── Bottom bar ──────────────────────────────────────── */}
      <BottomBar
        activeTab={activeTab}
        watchlistCount={watchlist.length}
        onHome={handleBottomHome}
        onSearch={handleBottomSearch}
        onList={handleBottomList}
      />

      {/* ── Movie detail sheet ──────────────────────────────── */}
      <MovieSheet
        movie={selectedMovie}
        isOpen={movieSheetOpen}
        countryCode={country}
        inWatchlist={watchlist.some((m) => m.id === selectedMovie?.id)}
        onClose={() => { setMovieSheetOpen(false); setActiveTab("home"); }}
        onWatchlist={handleWatchlist}
        onSimilar={handleSimilar}
      />

      {/* ── Search sheet ────────────────────────────────────── */}
      <SearchSheet
        isOpen={searchSheetOpen}
        onClose={() => { setSearchSheetOpen(false); setActiveTab("home"); }}
        onSearch={handleSearch}
        isLoading={feed.isLoading}
      />

      {/* ── Swipe mode ──────────────────────────────────────── */}
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

      {/* ── Watchlist panel ─────────────────────────────────── */}
      {showWatchlist && (
        <div className="fixed inset-0 z-50 flex">
          {/* Desktop backdrop */}
          <div
            className="hidden sm:block flex-1 bg-black/60 backdrop-blur-sm"
            onClick={() => { setShowWatchlist(false); setActiveTab("home"); }}
          />

          {/* Panel */}
          <div className="fixed inset-0 sm:static sm:w-full sm:max-w-sm bg-[#0A0A0A] sm:border-l border-[#262626] flex flex-col h-full overflow-hidden animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-[#262626] flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <svg className="w-5 h-5 text-[#E50914]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 3h14a1 1 0 011 1v17l-7-3.5L5 21V4a1 1 0 011-1z" />
                </svg>
                <h2 className="font-semibold text-white">Mi lista</h2>
                <span className="text-xs text-[#525252]">
                  {watchlist.length} película{watchlist.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {watchlist.length > 0 && (
                  <button
                    onClick={handleClearWatchlist}
                    className="text-xs text-[#525252] hover:text-[#E50914] transition-colors px-2 py-1"
                  >
                    Limpiar
                  </button>
                )}
                <button
                  onClick={() => { setShowWatchlist(false); setActiveTab("home"); }}
                  className="w-8 h-8 rounded-xl bg-[#141414] border border-[#262626] flex items-center justify-center text-[#A3A3A3] hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {watchlist.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                  <svg className="w-16 h-16 text-[#262626]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3h14a1 1 0 011 1v17l-7-3.5L5 21V4a1 1 0 011-1z" />
                  </svg>
                  <div>
                    <p className="text-[#A3A3A3] font-medium">Tu lista está vacía</p>
                    <p className="text-[#525252] text-sm mt-1">Guardá películas tocando el 🔖</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {watchlist.map((movie) => {
                    const poster = getPosterUrl(movie.poster_path, "w342");
                    const year = getYear(movie.release_date);
                    const rating = movie.vote_average > 0 ? movie.vote_average.toFixed(1) : null;
                    return (
                      <div
                        key={movie.id}
                        className="flex gap-3 bg-[#141414] rounded-2xl overflow-hidden border border-[#262626] hover:border-[#525252] transition-colors cursor-pointer"
                        onClick={() => { handleCardTap(movie); setShowWatchlist(false); }}
                      >
                        {/* Mini poster */}
                        <div className="relative w-14 h-20 flex-shrink-0 bg-[#0A0A0A]">
                          {poster && (
                            <Image src={poster} alt={movie.title} fill sizes="56px" className="object-cover" />
                          )}
                        </div>
                        {/* Info */}
                        <div className="flex flex-col flex-1 py-2.5 pr-2 gap-1 min-w-0">
                          <p className="font-medium text-sm text-white leading-tight line-clamp-2">{movie.title}</p>
                          <div className="flex items-center gap-1.5 text-xs text-[#525252]">
                            {year && <span>{year}</span>}
                            {rating && (
                              <>
                                <span>·</span>
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="#F5C518">
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                </svg>
                                <span style={{ color: "#F5C518" }}>{rating}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-auto pt-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleSimilarFromWatchlist(movie); }}
                              className="text-xs px-2.5 py-1 rounded-lg bg-[#1C1C1C] hover:bg-[#E50914]/20 border border-[#262626] hover:border-[#E50914]/50 text-[#A3A3A3] hover:text-[#E50914] transition-all min-h-[32px]"
                            >
                              Como esta →
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleWatchlist(movie); }}
                              className="text-xs px-2.5 py-1 rounded-lg bg-[#1C1C1C] border border-[#262626] text-[#525252] hover:text-[#E50914] hover:border-[#E50914]/50 transition-all min-h-[32px]"
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
