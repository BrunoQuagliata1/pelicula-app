"use client";

import { useState } from "react";
import Image from "next/image";
import { BookmarkSimple, Bookmark } from "@phosphor-icons/react";
import { TMDBMovie, getPosterUrl, getLogoUrl, getStreamingProviders } from "@/lib/tmdb";

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
  const streaming = getStreamingProviders(movie, countryCode);
  const firstProvider = streaming[0] ?? null;

  return (
    <div className="movie-card flex flex-col gap-2 cursor-pointer" onClick={() => onTap(movie)}>
      {/* Poster */}
      <div className="relative w-full aspect-[2/3] rounded-[14px] overflow-hidden bg-[#111]">
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={movie.title}
            fill
            sizes="(max-width: 640px) 47vw, (max-width: 1024px) 32vw, 20vw"
            className="object-cover"
            onError={() => setPosterError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[#111]">
            <span className="text-[#333] text-xs text-center px-3 leading-relaxed">{movie.title}</span>
          </div>
        )}

        {/* Gradient bottom */}
        <div className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)" }} />

        {/* Rating — bottom left */}
        {rating && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="#F5C518">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span className="text-[11px] font-semibold text-white leading-none">{rating}</span>
          </div>
        )}

        {/* Provider — bottom right */}
        {firstProvider && (
          <div className="absolute bottom-2 right-2">
            <div className="relative w-5 h-5 rounded-[5px] overflow-hidden shadow-md" title={firstProvider.provider_name}>
              <Image src={getLogoUrl(firstProvider.logo_path)} alt={firstProvider.provider_name} fill sizes="20px" className="object-cover" />
            </div>
          </div>
        )}

        {/* Bookmark */}
        <button
          onClick={(e) => { e.stopPropagation(); onWatchlist(movie); }}
          className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all"
          style={{
            background: inWatchlist ? "var(--accent)" : "rgba(0,0,0,0.5)",
            color: inWatchlist ? "var(--accent-text)" : "white",
          }}
        >
          {inWatchlist
            ? <Bookmark size={15} weight="fill" />
            : <BookmarkSimple size={15} weight="regular" />
          }
        </button>
      </div>

      {/* Title */}
      <p className="text-[13px] font-medium leading-snug line-clamp-2 px-0.5" style={{ color: "var(--text-1)" }}>
        {movie.title}
      </p>
    </div>
  );
}
