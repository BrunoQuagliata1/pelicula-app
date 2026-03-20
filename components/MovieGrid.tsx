"use client";

import MovieCard from "./MovieCard";
import { TMDBMovie } from "@/lib/tmdb";

interface MovieGridProps {
  movies: TMDBMovie[];
  countryCode: string;
  onSimilar: (movie: TMDBMovie) => void;
  onWatchlist: (movie: TMDBMovie) => void;
  watchlist: TMDBMovie[];
  isLoading?: boolean;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

export default function MovieGrid({ movies, countryCode, onSimilar, onWatchlist, watchlist, isLoading, hasMore, isLoadingMore, onLoadMore }: MovieGridProps) {
  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2 px-1">
        {Array.from({ length: 6 }).map((_, i) => (
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
          <p className="text-sm">No encontré películas con esos criterios.</p>
          <p className="text-xs mt-1 text-gray-600">Intenta con otras palabras</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 px-1 animate-fade-in">
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

      {/* Load more trigger */}
      {(hasMore || isLoadingMore) && (
        <div className="flex-shrink-0 w-[120px] flex flex-col items-center justify-center gap-3">
          {isLoadingMore ? (
            <>
              <svg className="w-6 h-6 text-indigo-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-xs text-gray-500">Cargando...</span>
            </>
          ) : (
            <button
              onClick={onLoadMore}
              className="flex flex-col items-center gap-2 px-4 py-6 rounded-2xl bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-indigo-700 text-indigo-400 hover:text-indigo-300 transition-all group h-full w-full justify-center"
            >
              <svg className="w-7 h-7 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <span className="text-xs font-medium text-center leading-tight">Ver más</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
