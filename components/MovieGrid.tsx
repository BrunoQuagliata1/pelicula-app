"use client";

import MovieCard from "./MovieCard";
import { TMDBMovie } from "@/lib/tmdb";

interface MovieGridProps {
  movies: TMDBMovie[];
  countryCode: string;
  onSimilar: (movie: TMDBMovie) => void;
  isLoading?: boolean;
}

export default function MovieGrid({ movies, countryCode, onSimilar, isLoading }: MovieGridProps) {
  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2 px-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-[185px] rounded-2xl bg-gray-900 border border-gray-800 overflow-hidden animate-pulse"
          >
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
        />
      ))}
    </div>
  );
}
