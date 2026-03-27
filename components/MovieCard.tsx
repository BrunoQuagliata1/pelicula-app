"use client";

import { useState } from "react";
import Image from "next/image";
import {
  TMDBMovie,
  getPosterUrl,
  getLogoUrl,
  getStreamingProviders,
} from "@/lib/tmdb";

interface MovieCardProps {
  movie: TMDBMovie;
  countryCode: string;
  onTap: (movie: TMDBMovie) => void;
  onWatchlist: (movie: TMDBMovie) => void;
  inWatchlist: boolean;
}

export default function MovieCard({ movie, countryCode, onTap, onWatchlist, inWatchlist }: MovieCardProps) {
  const [posterError, setPosterError] = useState(false);

  const posterUrl = posterError ? null : getPosterUrl(movie.poster_path, "w342");
  const rating = movie.vote_average > 0 ? movie.vote_average.toFixed(1) : null;
  const primaryGenre = movie.genres?.[0]?.name ?? null;
  const streaming = getStreamingProviders(movie, countryCode);
  const firstProvider = streaming[0] ?? null;

  return (
    <div
      className="flex flex-col cursor-pointer group animate-fade-in"
      onClick={() => onTap(movie)}
    >
      {/* Poster */}
      <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-[#141414]">
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={movie.title}
            fill
            sizes="(max-width: 640px) 48vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setPosterError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-[#141414]">
            <svg className="w-10 h-10 text-[#525252] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
            <span className="text-xs text-[#525252] leading-tight line-clamp-3">{movie.title}</span>
          </div>
        )}

        {/* Overlay gradient at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

        {/* Streaming provider badge — bottom left */}
        {firstProvider && (
          <div className="absolute bottom-2 left-2 z-10">
            <div className="relative w-6 h-6 rounded-md overflow-hidden shadow-lg" title={firstProvider.provider_name}>
              <Image
                src={getLogoUrl(firstProvider.logo_path)}
                alt={firstProvider.provider_name}
                fill
                sizes="24px"
                className="object-cover"
              />
            </div>
          </div>
        )}

        {/* Bookmark button — top right */}
        <button
          onClick={(e) => { e.stopPropagation(); onWatchlist(movie); }}
          className={`
            absolute top-2 right-2 z-10 w-9 h-9 rounded-full flex items-center justify-center
            transition-all duration-200 shadow-lg
            ${inWatchlist
              ? "bg-[#E50914] text-white scale-110"
              : "bg-black/60 text-[#A3A3A3] hover:bg-black/80 hover:text-white"
            }
          `}
          aria-label={inWatchlist ? "Quitar de Mi lista" : "Guardar en Mi lista"}
        >
          <svg className="w-4 h-4" fill={inWatchlist ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 3h14a1 1 0 011 1v17l-7-3.5L5 21V4a1 1 0 011-1z" />
          </svg>
        </button>

        {/* Genre badge — top left, only if genre available */}
        {primaryGenre && (
          <div className="absolute top-2 left-2 z-10">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/60 text-[#A3A3A3] backdrop-blur-sm">
              {primaryGenre}
            </span>
          </div>
        )}
      </div>

      {/* Info below poster */}
      <div className="mt-2 px-0.5">
        <h3 className="text-sm font-medium text-white leading-tight line-clamp-2 mb-1">
          {movie.title}
        </h3>
        {rating && (
          <div className="flex items-center gap-1">
            <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="#F5C518">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span className="text-xs font-semibold" style={{ color: "#F5C518" }}>{rating}</span>
          </div>
        )}
      </div>
    </div>
  );
}
