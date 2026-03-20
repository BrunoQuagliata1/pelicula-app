"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { TMDBMovie, getPosterUrl, getLogoUrl, getYear, formatRuntime, getStreamingProviders } from "@/lib/tmdb";

interface SwipeModeProps {
  movies: TMDBMovie[];
  countryCode: string;
  onLike: (movie: TMDBMovie) => void;   // adds to watchlist
  onDislike: () => void;                // next movie
  onClose: () => void;
  watchlist: TMDBMovie[];
}

export default function SwipeMode({ movies, countryCode, onLike, onDislike, onClose, watchlist }: SwipeModeProps) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);
  const [likedThisSession, setLikedThisSession] = useState<number[]>([]);

  const current = movies[index];

  const handleLike = useCallback(() => {
    if (!current) return;
    setDirection("right");
    setLikedThisSession((prev) => [...prev, current.id]);
    onLike(current);
    setTimeout(() => {
      setDirection(null);
      setIndex((i) => i + 1);
    }, 350);
  }, [current, onLike]);

  const handleDislike = useCallback(() => {
    if (!current) return;
    setDirection("left");
    onDislike();
    setTimeout(() => {
      setDirection(null);
      setIndex((i) => i + 1);
    }, 350);
  }, [current, onDislike]);

  if (!current || index >= movies.length) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col items-center justify-center gap-6 p-6">
        <span className="text-5xl">🎬</span>
        <h2 className="text-xl font-bold text-white text-center">Se acabaron las películas</h2>
        <p className="text-gray-400 text-sm text-center">
          Guardaste {likedThisSession.length} película{likedThisSession.length !== 1 ? "s" : ""} en tu lista
        </p>
        <button
          onClick={onClose}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-medium transition-colors"
        >
          Ver Mi lista
        </button>
      </div>
    );
  }

  const poster = getPosterUrl(current.poster_path, "w342");
  const year = getYear(current.release_date);
  const runtime = formatRuntime(current.runtime);
  const rating = current.vote_average?.toFixed(1);
  const cast = current.credits?.cast?.slice(0, 3) ?? [];
  const genres = current.genres?.slice(0, 3) ?? [];
  const streaming = getStreamingProviders(current, countryCode);
  const inWatchlist = watchlist.some((m) => m.id === current.id);

  return (
    <div className="fixed inset-0 z-50 bg-gray-950/98 backdrop-blur-md flex flex-col items-center justify-between p-4 pt-6 pb-8">
      {/* Header */}
      <div className="w-full flex items-center justify-between max-w-sm">
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="text-center">
          <p className="text-xs text-gray-500">{index + 1} / {movies.length}</p>
          <div className="w-32 h-1 bg-gray-800 rounded-full mt-1 overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${((index + 1) / movies.length) * 100}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-1 text-yellow-400 text-xs font-medium">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M5 3h14a1 1 0 011 1v17l-7-3.5L5 21V4a1 1 0 011-1z" />
          </svg>
          {likedThisSession.length}
        </div>
      </div>

      {/* Card */}
      <div
        className={`w-full max-w-sm transition-all duration-300 ${
          direction === "right" ? "translate-x-full rotate-12 opacity-0" :
          direction === "left"  ? "-translate-x-full -rotate-12 opacity-0" :
          "translate-x-0 rotate-0 opacity-100"
        }`}
      >
        <div className="bg-gray-900 rounded-3xl overflow-hidden border border-gray-800 shadow-2xl">
          {/* Poster */}
          <div className="relative w-full aspect-[2/3] bg-gray-800 max-h-[45vh]">
            {poster ? (
              <Image src={poster} alt={current.title} fill sizes="400px" className="object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-16 h-16 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
              </div>
            )}
            {/* Already in watchlist badge */}
            {inWatchlist && (
              <div className="absolute top-3 right-3 bg-yellow-400 text-gray-900 text-xs font-bold px-2 py-1 rounded-full">
                En tu lista ✓
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-4 space-y-2">
            <h2 className="text-lg font-bold text-white leading-tight">{current.title}</h2>
            <div className="flex items-center gap-3 text-sm text-gray-400 flex-wrap">
              {year && <span>{year}</span>}
              {runtime && <span>{runtime}</span>}
              {rating && parseFloat(rating) > 0 && (
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="#F5C518">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <span style={{ color: "#F5C518" }} className="font-semibold">{rating}</span>
                </span>
              )}
            </div>
            {genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {genres.map((g) => (
                  <span key={g.id} className="text-xs px-2 py-0.5 rounded-md bg-gray-800 text-gray-400">{g.name}</span>
                ))}
              </div>
            )}
            {cast.length > 0 && (
              <p className="text-xs text-gray-500">{cast.map((a) => a.name).join(" · ")}</p>
            )}
            {streaming.length > 0 && (
              <div className="flex items-center gap-1.5 pt-1">
                {streaming.slice(0, 5).map((p) => (
                  <div key={p.provider_id} className="relative w-6 h-6 rounded-md overflow-hidden" title={p.provider_name}>
                    <Image src={getLogoUrl(p.logo_path)} alt={p.provider_name} fill sizes="24px" className="object-cover" />
                  </div>
                ))}
                <span className="text-xs text-gray-500 ml-1">disponible</span>
              </div>
            )}
            {current.overview && (
              <p className="text-xs text-gray-500 leading-relaxed line-clamp-3 pt-1">{current.overview}</p>
            )}
          </div>
        </div>
      </div>

      {/* Swipe buttons */}
      <div className="flex items-center gap-8">
        <button
          onClick={handleDislike}
          className="w-16 h-16 rounded-full bg-gray-800 hover:bg-red-900/60 border-2 border-gray-700 hover:border-red-700 text-gray-400 hover:text-red-400 transition-all flex items-center justify-center shadow-lg active:scale-95"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-xs text-gray-600 text-center leading-tight">
          <span className="block">✕ Siguiente</span>
          <span className="block mt-0.5">♥ Guardar</span>
        </div>

        <button
          onClick={handleLike}
          className="w-16 h-16 rounded-full bg-yellow-400/10 hover:bg-yellow-400/30 border-2 border-yellow-700/50 hover:border-yellow-400 text-yellow-500 hover:text-yellow-300 transition-all flex items-center justify-center shadow-lg active:scale-95"
        >
          <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
            <path d="M5 3h14a1 1 0 011 1v17l-7-3.5L5 21V4a1 1 0 011-1z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
