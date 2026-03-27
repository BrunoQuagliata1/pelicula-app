"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import MovieFeed from "@/components/MovieFeed";
import MovieSheet from "@/components/MovieSheet";
import MoodBar from "@/components/MoodBar";
import SearchSheet from "@/components/SearchSheet";
import BottomBar from "@/components/BottomBar";
import CountryPicker from "@/components/CountryPicker";
import SwipeMode from "@/components/SwipeMode";
import { X } from "@phosphor-icons/react";
import {
  TMDBMovie, getMovieDetails, getSimilarMovies, getMovieRecommendations,
  getPopularMovies, getTopRatedMovies, discoverMovies, searchMovies,
  searchPerson, getPosterUrl, getYear,
} from "@/lib/tmdb";
import { parseUserInput, SearchIntent } from "@/lib/movieSearch";

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

async function executeSearch(intent: SearchIntent, page = 1): Promise<{ movies: TMDBMovie[]; hasMore: boolean }> {
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

  const pages = await Promise.allSettled(pagesToLoad.map(fetchPage));
  const allResults = pages
    .filter((r): r is PromiseFulfilledResult<{ results: TMDBMovie[]; total_pages?: number }> => r.status === "fulfilled")
    .flatMap((r) => r.value.results);

  const seen = new Set<number>();
  const raw = shuffle(allResults).filter((m) => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });
  if (pages[0].status === "fulfilled") totalPages = pages[0].value.total_pages ?? totalPages;

  const movies = await enrichMovies(raw, 18);
  return { movies, hasMore: effectivePage + 3 < Math.min(totalPages, 50) };
}

export default function HomePage() {
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [watchlist, setWatchlist] = useState<TMDBMovie[]>([]);
  const [feed, setFeed] = useState<FeedState>({
    movies: [], intent: { type: "popular", message: "Populares" },
    page: 1, hasMore: true, isLoading: true, isLoadingMore: false, label: "Populares",
  });
  const [activeMoodKey, setActiveMoodKey] = useState("popular");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<TMDBMovie | null>(null);
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [showSwipe, setShowSwipe] = useState(false);
  const [swipeMovies, setSwipeMovies] = useState<TMDBMovie[]>([]);
  const [isApiMissing, setIsApiMissing] = useState(false);
  const [activeTab, setActiveTab] = useState<"home" | "search" | "list">("home");

  const hasMounted = useRef(false);
  const isFetching = useRef(false);

  // Country
  useEffect(() => {
    const stored = localStorage.getItem("pelicula-country");
    if (stored) { setCountry(stored); return; }
    fetch("https://ipapi.co/json/").then(r => r.json()).then(d => {
      if (d.country_code) { setCountry(d.country_code); localStorage.setItem("pelicula-country", d.country_code); }
    }).catch(() => {});
  }, []);

  // Watchlist
  useEffect(() => {
    try { const s = localStorage.getItem("pelicula-watchlist"); if (s) setWatchlist(JSON.parse(s)); } catch {}
  }, []);

  // Initial load
  useEffect(() => {
    if (hasMounted.current) return;
    hasMounted.current = true;
    executeSearch({ type: "popular", message: "Populares" }).then(result => {
      setFeed(p => ({ ...p, movies: result.movies, hasMore: result.hasMore, isLoading: false }));
    }).catch(err => {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("TMDB_API_KEY") || msg.includes("401")) setIsApiMissing(true);
      setFeed(p => ({ ...p, isLoading: false }));
    });
  }, []);

  const handleWatchlist = useCallback((movie: TMDBMovie) => {
    setWatchlist(prev => {
      const next = prev.some(m => m.id === movie.id) ? prev.filter(m => m.id !== movie.id) : [...prev, movie];
      localStorage.setItem("pelicula-watchlist", JSON.stringify(next));
      return next;
    });
  }, []);

  const handleClearWatchlist = useCallback(() => {
    setWatchlist([]); localStorage.removeItem("pelicula-watchlist");
  }, []);

  const loadFeed = useCallback(async (intent: SearchIntent, label: string, moodKey: string) => {
    if (isFetching.current) return;
    isFetching.current = true;
    setActiveMoodKey(moodKey);
    seenMovieIds.clear();
    setFeed(p => ({ ...p, isLoading: true, movies: [], intent, label, page: 1, hasMore: true }));
    try {
      const result = await executeSearch(intent);
      setFeed({ movies: result.movies, intent, page: 1, hasMore: result.hasMore, isLoading: false, isLoadingMore: false, label });
    } catch { setFeed(p => ({ ...p, isLoading: false })); }
    finally { isFetching.current = false; }
  }, []);

  const handleMoodSelect = useCallback((key: string, intent: SearchIntent, label: string) => {
    loadFeed(intent, label, key);
  }, [loadFeed]);

  const handleSearch = useCallback(async (query: string) => {
    const intent = await parseUserInput(query);
    loadFeed(intent, `"${query}"`, `search-${query}`);
  }, [loadFeed]);

  const handleSimilar = useCallback(async (movie: TMDBMovie) => {
    if (isFetching.current) return;
    isFetching.current = true;
    const intent: SearchIntent = { type: "similar", query: movie.title, message: `Similares a "${movie.title}"` };
    setActiveMoodKey(`similar-${movie.id}`);
    seenMovieIds.clear();
    setFeed(p => ({ ...p, isLoading: true, movies: [], intent, label: `Similares a "${movie.title}"`, page: 1, hasMore: true }));
    try {
      const [sim, rec] = await Promise.all([getSimilarMovies(movie.id), getMovieRecommendations(movie.id)]);
      const combined = [...sim.results, ...rec.results];
      const seen = new Set<number>([movie.id]);
      const unique = combined.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });
      const enriched = await enrichMovies(unique);
      setFeed({ movies: enriched, intent, page: 1, hasMore: true, isLoading: false, isLoadingMore: false, label: `Similares a "${movie.title}"` });
    } catch { setFeed(p => ({ ...p, isLoading: false })); }
    finally { isFetching.current = false; }
  }, []);

  const handleLoadMore = useCallback(() => {
    setFeed(prev => {
      if (prev.isLoadingMore || !prev.hasMore) return prev;
      const nextPage = prev.page + 3;
      executeSearch(prev.intent, nextPage).then(result => {
        setFeed(p => ({ ...p, movies: [...p.movies, ...result.movies], page: nextPage, hasMore: result.hasMore, isLoadingMore: false }));
      }).catch(() => setFeed(p => ({ ...p, isLoadingMore: false })));
      return { ...prev, isLoadingMore: true };
    });
  }, []);

  const handleCardTap = useCallback((movie: TMDBMovie) => {
    setSelectedMovie(movie);
  }, []);

  const handleOpenSwipe = useCallback(async () => {
    if (isFetching.current) return;
    isFetching.current = true;
    try {
      const [pop, top] = await Promise.all([getPopularMovies(1), getTopRatedMovies(1)]);
      const combined = [...pop.results.slice(0, 10), ...top.results.slice(0, 10)];
      const seen = new Set<number>();
      const unique = combined.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });
      const enriched = await enrichMovies(unique, 16);
      setSwipeMovies(enriched);
      setShowSwipe(true);
    } catch {} finally { isFetching.current = false; }
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: "var(--bg)", overflow: "hidden" }}>

      {/* Header */}
      <header style={{ flexShrink: 0, borderBottom: "1px solid var(--border)", background: "rgba(8,8,8,0.95)", backdropFilter: "blur(12px)" }}
        className="flex items-center justify-between px-4 py-3 z-10">
        <div className="flex items-center gap-2">
          <span className="font-display text-lg tracking-tight" style={{ color: "var(--text-1)", letterSpacing: "-0.03em" }}>
            cineclub
          </span>
          {feed.label && !feed.isLoading && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--surface)", color: "var(--text-3)" }}>
              {feed.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <CountryPicker currentCountry={country} onCountryChange={setCountry} />
        </div>
      </header>

      {/* Mood bar */}
      <MoodBar activeMood={activeMoodKey} onSelect={handleMoodSelect} />

      {/* Feed — flex-1 + overflow hidden, scroll is inside MovieFeed */}
      <main style={{ flex: 1, overflow: "hidden" }}>
        {isApiMissing && (
          <div className="mx-4 mt-4 p-4 rounded-2xl" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <p className="text-sm font-semibold text-red-400 mb-1">API key no configurada</p>
            <p className="text-xs text-red-400/70">Agregá <code>TMDB_API_KEY</code> en <code>.env.local</code> y reiniciá.</p>
          </div>
        )}
        <MovieFeed
          movies={feed.movies}
          countryCode={country}
          onWatchlist={handleWatchlist}
          watchlist={watchlist}
          isLoading={feed.isLoading}
          isLoadingMore={feed.isLoadingMore}
          onLoadMore={feed.hasMore ? handleLoadMore : undefined}
          onSimilar={handleSimilar}
          onInfo={(m) => setSelectedMovie(m)}
        />
      </main>

      {/* Bottom bar — flexShrink 0 siempre al fondo */}
      <BottomBar
        activeTab={activeTab}
        watchlistCount={watchlist.length}
        onHome={() => { setActiveTab("home"); setSearchOpen(false); setShowWatchlist(false); }}
        onSearch={() => { setActiveTab("search"); setSearchOpen(true); }}
        onList={() => { setActiveTab("list"); setShowWatchlist(true); }}
      />

      {/* Movie sheet */}
      {selectedMovie && (
        <MovieSheet
          movie={selectedMovie}
          countryCode={country}
          onClose={() => setSelectedMovie(null)}
          onSimilar={(m) => { setSelectedMovie(null); handleSimilar(m); }}
          onWatchlist={handleWatchlist}
          inWatchlist={watchlist.some(m => m.id === selectedMovie.id)}
        />
      )}

      {/* Search sheet */}
      {searchOpen && (
        <SearchSheet
          onClose={() => { setSearchOpen(false); setActiveTab("home"); }}
          onSearch={handleSearch}
        />
      )}

      {/* Swipe mode */}
      {showSwipe && (
        <SwipeMode
          movies={swipeMovies}
          countryCode={country}
          onLike={handleWatchlist}
          onDislike={() => {}}
          onClose={() => { setShowSwipe(false); setShowWatchlist(true); }}
          watchlist={watchlist}
        />
      )}

      {/* Watchlist panel */}
      {showWatchlist && (
        <div className="fixed inset-0 z-50 flex">
          <div className="hidden sm:block flex-1 bg-black/60" style={{ backdropFilter: "blur(6px)" }}
            onClick={() => { setShowWatchlist(false); setActiveTab("home"); }} />
          <div className="w-full sm:max-w-sm flex flex-col h-full"
            style={{ background: "var(--surface)", borderLeft: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between px-4 py-4 flex-shrink-0"
              style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm" style={{ color: "var(--text-1)" }}>Mi lista</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--overlay)", color: "var(--text-3)" }}>
                  {watchlist.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {watchlist.length > 0 && (
                  <button onClick={handleClearWatchlist} className="text-xs px-2 py-1 rounded-lg"
                    style={{ color: "var(--text-3)" }}>
                    Limpiar
                  </button>
                )}
                <button onClick={() => { setShowWatchlist(false); setActiveTab("home"); }}
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: "var(--overlay)", color: "var(--text-2)" }}>
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {watchlist.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <span className="text-4xl">🔖</span>
                  <p className="text-sm" style={{ color: "var(--text-2)" }}>Tu lista está vacía</p>
                  <p className="text-xs" style={{ color: "var(--text-3)" }}>Guardá películas tocando el bookmark</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {watchlist.map((movie) => {
                    const poster = getPosterUrl(movie.poster_path, "w342");
                    const year = getYear(movie.release_date);
                    const rating = movie.vote_average > 0 ? movie.vote_average.toFixed(1) : null;
                    return (
                      <div key={movie.id}
                        className="flex gap-3 rounded-xl overflow-hidden cursor-pointer"
                        style={{ background: "var(--elevated)", border: "1px solid var(--border)" }}
                        onClick={() => { handleCardTap(movie); setShowWatchlist(false); }}>
                        <div className="relative w-12 h-[72px] flex-shrink-0" style={{ background: "var(--overlay)" }}>
                          {poster && <Image src={poster} alt={movie.title} fill sizes="48px" className="object-cover" />}
                        </div>
                        <div className="flex flex-col justify-center py-2 pr-3 gap-0.5 min-w-0">
                          <p className="text-sm font-medium line-clamp-1" style={{ color: "var(--text-1)" }}>{movie.title}</p>
                          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-3)" }}>
                            {year && <span>{year}</span>}
                            {rating && (
                              <span className="flex items-center gap-1">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="#F5C518">
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                </svg>
                                {rating}
                              </span>
                            )}
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
