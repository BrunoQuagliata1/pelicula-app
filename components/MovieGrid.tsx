"use client";

import { useRef, useEffect, useCallback } from "react";
import MovieCard from "./MovieCard";
import { TMDBMovie } from "@/lib/tmdb";

interface MovieGridProps {
  movies: TMDBMovie[];
  countryCode: string;
  onSimilar: (movie: TMDBMovie) => void;
  onWatchlist: (movie: TMDBMovie) => void;
  watchlist: TMDBMovie[];
  isLoading?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

export default function MovieGrid({ movies, countryCode, onSimilar, onWatchlist, watchlist, isLoading, isLoadingMore, onLoadMore }: MovieGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-trigger load more when user is 2 cards from the end
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !onLoadMore || isLoadingMore) return;
    const threshold = el.scrollWidth - el.clientWidth - 400; // 400px before end
    if (el.scrollLeft >= threshold) {
      onLoadMore();
    }
  }, [onLoadMore, isLoadingMore]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2 px-1 no-scrollbar">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-[185px] rounded-2xl bg-gray-900 border border-gray-800 overflow-hidden animate-pulse">
            <div className="w-full aspect-[2/3] bg-gray-800" />
            <div className="p-3 space-y-2">
              <div className="h-4 bg-gray-800 rounded w-3/4" />
              <div className="h-3 bg-gray-800 rounded w-1/2" />
              <div className="h-3 bg-gray-800 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 px-4">
        <div className="text-center text-gray-500">
          <svg className="w-10 h-10 mx-auto mb-2 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm">No encontré películas.</p>
          <p className="text-xs mt-1 text-gray-600">Probá con otras palabras</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-2 px-1 animate-fade-in no-scrollbar">
      {movies.map((movie) => (
        <MovieCard
          key={movie.id}
          movie={movie}
          countryCode={countryCode}
          onSimilar={onSimilar}
          onWatchlist={onWatchlist}
          inWatchlist={watchlist.some((m) => m.id === movie.id)}
        />
      ))}

      {/* Skeleton cards while loading more — appear at the end seamlessly */}
      {isLoadingMore && Array.from({ length: 4 }).map((_, i) => (
        <div key={`skeleton-${i}`} className="flex-shrink-0 w-[185px] rounded-2xl bg-gray-900 border border-gray-800 overflow-hidden animate-pulse">
          <div className="w-full aspect-[2/3] bg-gray-800" />
          <div className="p-3 space-y-2">
            <div className="h-4 bg-gray-800 rounded w-3/4" />
            <div className="h-3 bg-gray-800 rounded w-1/2" />
            <div className="h-3 bg-gray-800 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
