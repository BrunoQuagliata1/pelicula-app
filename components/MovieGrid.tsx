"use client";

import { useRef, useEffect, useCallback } from "react";
import MovieCard from "./MovieCard";
import { TMDBMovie } from "@/lib/tmdb";

interface MovieGridProps {
  movies: TMDBMovie[];
  countryCode: string;
  onTap: (movie: TMDBMovie) => void;
  onWatchlist: (movie: TMDBMovie) => void;
  watchlist: TMDBMovie[];
  isLoading?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

export default function MovieGrid({
  movies, countryCode, onTap, onWatchlist, watchlist,
  isLoading, isLoadingMore, onLoadMore,
}: MovieGridProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!onLoadMore || !sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && !isLoadingMore) onLoadMore(); },
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [onLoadMore, isLoadingMore]);

  const SkeletonCard = () => (
    <div className="flex flex-col gap-2">
      <div className="w-full aspect-[2/3] rounded-[14px] skeleton" />
      <div className="h-3 rounded-full skeleton w-3/4" />
      <div className="h-3 rounded-full skeleton w-1/2" />
    </div>
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 px-4 pb-4">
        {Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <span className="text-4xl">¯\_(ツ)_/¯</span>
        <p className="text-sm" style={{ color: "var(--text-2)" }}>Sin resultados. Probá con otra búsqueda.</p>
      </div>
    );
  }

  return (
    <div className="pb-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 px-4">
        {movies.map((movie) => (
          <MovieCard
            key={movie.id}
            movie={movie}
            countryCode={countryCode}
            onTap={onTap}
            onWatchlist={onWatchlist}
            inWatchlist={watchlist.some((m) => m.id === movie.id)}
          />
        ))}
        {isLoadingMore && Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={`sk-${i}`} />)}
      </div>
      {onLoadMore && <div ref={sentinelRef} className="h-8" />}
    </div>
  );
}
