"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import {
  TMDBMovie,
  getPosterUrl,
  getLogoUrl,
  getYear,
  formatRuntime,
  getStreamingProviders,
} from "@/lib/tmdb";

interface SwipeModeProps {
  movies: TMDBMovie[];
  countryCode: string;
  onLike: (movie: TMDBMovie) => void;
  onDislike: () => void;
  onClose: () => void;
  watchlist: TMDBMovie[];
}

export default function SwipeMode({ movies, countryCode, onLike, onDislike, onClose, watchlist }: SwipeModeProps) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);
  const [likedCount, setLikedCount] = useState(0);

  const current = movies[index];

  const handleLike = useCallback(() => {
    if (!current) return;
    setDirection("right");
    setLikedCount((n) => n + 1);
    onLike(current);
    setTimeout(() => {
      setDirection(null);
      setIndex((i) => i + 1);
    }, 320);
  }, [current, onLike]);

  const handleDislike = useCallback(() => {
    if (!current) return;
    setDirection("left");
    onDislike();
    setTimeout(() => {
      setDirection(null);
      setIndex((i) => i + 1);
    }, 320);
  }, [current, onDislike]);

  // End screen
  if (!current || index >= movies.length) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0A0A0A] flex flex-col items-center justify-center gap-6 p-6">
        <span className="text-6xl">🎬</span>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white">¡Listo!</h2>
          <p className="text-[#A3A3A3]">
            Guardaste <span className="text-white font-semibold">{likedCount}</span> película{likedCount !== 1 ? "s" : ""} en tu lista
          </p>
        </div>
        <button
          onClick={onClose}
          className="px-8 py-3.5 bg-[#E50914] hover:bg-[#c2070f] text-white rounded-2xl font-semibold transition-colors min-h-[52px]"
        >
          Ver Mi lista
        </button>
      </div>
    );
  }

  const poster = getPosterUrl(current.poster_path, "w342");
  const year = getYear(current.release_date);
  const runtime = formatRuntime(current.runtime);
  const rating = current.vote_average > 0 ? current.vote_average.toFixed(1) : null;
  const cast = current.credits?.cast?.slice(0, 3) ?? [];
  const genres = current.genres?.slice(0, 3) ?? [];
  const streaming = getStreamingProviders(current, countryCode);
  const inWatchlist = watchlist.some((m) => m.id === current.id);
  const progress = ((index) / movies.length) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0A0A] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-[#141414] flex items-center justify-center text-[#A3A3A3] hover:text-white transition-colors border border-[#262626]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Progress bar */}
        <div className="flex-1 mx-4">
          <div className="w-full h-1 bg-[#262626] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#E50914] rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-xs text-[#525252] mt-1">{index + 1} / {movies.length}</p>
        </div>

        {/* Liked counter */}
        <div className="flex items-center gap-1.5 bg-[#141414] border border-[#262626] px-3 py-1.5 rounded-full">
          <svg className="w-3.5 h-3.5 text-[#E50914]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M5 3h14a1 1 0 011 1v17l-7-3.5L5 21V4a1 1 0 011-1z" />
          </svg>
          <span className="text-xs font-semibold text-white">{likedCount}</span>
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center px-4 overflow-hidden">
        <div
          className={`
            w-full max-w-sm transition-all duration-300 ease-out
            ${direction === "right" ? "translate-x-[120%] rotate-12 opacity-0" :
              direction === "left"  ? "translate-x-[-120%] -rotate-12 opacity-0" :
              "translate-x-0 rotate-0 opacity-100"}
          `}
        >
          <div className="bg-[#141414] rounded-3xl overflow-hidden border border-[#262626] shadow-2xl">
            {/* Poster */}
            <div className="relative w-full bg-[#0A0A0A]" style={{ maxHeight: "52vh", aspectRatio: "2/3" }}>
              {poster ? (
                <Image
                  src={poster}
                  alt={current.title}
                  fill
                  sizes="400px"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-16 h-16 text-[#525252]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                  </svg>
                </div>
              )}

              {/* Already saved badge */}
              {inWatchlist && (
                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-[#E50914] text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5 3h14a1 1 0 011 1v17l-7-3.5L5 21V4a1 1 0 011-1z" />
                  </svg>
                  En tu lista
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-4 space-y-2.5">
              <h2 className="font-display italic text-xl font-bold text-white leading-tight">{current.title}</h2>

              <div className="flex items-center gap-3 flex-wrap">
                {year && <span className="text-sm text-[#A3A3A3]">{year}</span>}
                {runtime && <span className="text-sm text-[#A3A3A3]">{runtime}</span>}
                {rating && (
                  <div className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="#F5C518">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    <span className="text-sm font-semibold" style={{ color: "#F5C518" }}>{rating}</span>
                  </div>
                )}
              </div>

              {genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {genres.map((g) => (
                    <span key={g.id} className="text-xs px-2.5 py-1 rounded-full bg-[#262626] text-[#A3A3A3]">
                      {g.name}
                    </span>
                  ))}
                </div>
              )}

              {cast.length > 0 && (
                <p className="text-xs text-[#525252]">{cast.map((a) => a.name).join(" · ")}</p>
              )}

              {streaming.length > 0 && (
                <div className="flex items-center gap-2">
                  {streaming.slice(0, 5).map((p) => (
                    <div key={p.provider_id} className="relative w-7 h-7 rounded-lg overflow-hidden" title={p.provider_name}>
                      <Image src={getLogoUrl(p.logo_path)} alt={p.provider_name} fill sizes="28px" className="object-cover" />
                    </div>
                  ))}
                </div>
              )}

              {current.overview && (
                <p className="text-xs text-[#525252] leading-relaxed line-clamp-2">{current.overview}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-10 py-6 flex-shrink-0">
        <button
          onClick={handleDislike}
          className="w-16 h-16 rounded-full flex items-center justify-center bg-[#141414] border-2 border-[#262626] text-[#525252] hover:border-[#525252] hover:text-[#A3A3A3] transition-all shadow-lg active:scale-90"
          aria-label="Siguiente"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <button
          onClick={handleLike}
          className="w-20 h-20 rounded-full flex items-center justify-center bg-[#E50914] hover:bg-[#c2070f] text-white transition-all shadow-xl active:scale-90"
          aria-label="Guardar"
        >
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M5 3h14a1 1 0 011 1v17l-7-3.5L5 21V4a1 1 0 011-1z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
