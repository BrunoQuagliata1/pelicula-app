"use client";

import { useRef, useEffect, useCallback } from "react";
import MovieCard from "./MovieCard";
import { TMDBMovie } from "@/lib/tmdb";

interface MovieGridProps {
  movies: TMDBMovie[];
  countryCode: string;
  onCardTap: (movie: TMDBMovie) => void;
  onWatchlist: (movie: TMDBMovie) => void;
  watchlist: TMDBMovie[];
  isLoading?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

function SkeletonCard() {
  return (
    <div className="flex flex-col animate-pulse">
      <div className="w-full aspect-[2/3] rounded-xl skeleton" />
      <div className="mt-2 px-0.5 space-y-1.5">
        <div className="h-3.5 skeleton rounded w-4/5" />
        <div className="h-3 skeleton rounded w-2/5" />
      </div>
    </div>
  );
}

export default function MovieGrid({
  movies,
  countryCode,
  onCardTap,
  onWatchlist,
  watchlist,
  isLoading,
  isLoadingMore,
  onLoadMore,
}: MovieGridProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for infinite scroll at 80% scroll depth
  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && onLoadMore && !isLoadingMore) {
        onLoadMore();
      }
    },
    [onLoadMore, isLoadingMore]
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: "300px",
      threshold: 0,
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleIntersect]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 px-4 py-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <svg className="w-12 h-12 text-[#525252] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-[#A3A3A3] font-medium">No encontré películas</p>
        <p className="text-[#525252] text-sm mt-1">Probá con otras palabras</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 animate-fade-in">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {movies.map((movie) => (
          <MovieCard
            key={movie.id}
            movie={movie}
            countryCode={countryCode}
            onTap={onCardTap}
            onWatchlist={onWatchlist}
            inWatchlist={watchlist.some((m) => m.id === movie.id)}
          />
        ))}

        {/* Skeleton cards while loading more */}
        {isLoadingMore &&
          Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={`skel-more-${i}`} />
          ))
        }
      </div>

      {/* Infinite scroll sentinel */}
      {onLoadMore && <div ref={sentinelRef} className="h-1" />}
    </div>
  );
}
