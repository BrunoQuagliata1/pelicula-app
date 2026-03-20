"use client";

import Image from "next/image";
import { useState } from "react";
import {
  TMDBMovie,
  getPosterUrl,
  getLogoUrl,
  formatRuntime,
  getYear,
  getStreamingProviders,
} from "@/lib/tmdb";

interface MovieCardProps {
  movie: TMDBMovie;
  countryCode: string;
  onSimilar: (movie: TMDBMovie) => void;
}

export default function MovieCard({ movie, countryCode, onSimilar }: MovieCardProps) {
  const [posterError, setPosterError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const year = getYear(movie.release_date);
  const runtime = formatRuntime(movie.runtime);
  const rating = movie.vote_average?.toFixed(1) ?? "–";
  const genres = movie.genres ?? [];
  const cast = movie.credits?.cast?.slice(0, 3) ?? [];
  const streaming = getStreamingProviders(movie, countryCode);

  const posterUrl = posterError ? null : getPosterUrl(movie.poster_path, "w342");

  return (
    <div className="movie-card flex flex-col bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 hover:border-gray-700 w-[185px] flex-shrink-0">
      {/* Poster */}
      <div className="relative w-full aspect-[2/3] bg-gray-800 overflow-hidden group">
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={movie.title}
            fill
            sizes="185px"
            className="object-cover"
            onError={() => setPosterError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
            <svg className="w-12 h-12 text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
            <span className="text-xs text-gray-500 leading-tight">{movie.title}</span>
          </div>
        )}

        {/* Overlay on hover with overview */}
        {movie.overview && (
          <div className="absolute inset-0 bg-gray-950/95 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 overflow-y-auto flex items-start">
            <p className="text-xs text-gray-200 leading-relaxed">{movie.overview}</p>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 p-3 gap-2">
        {/* Title */}
        <div>
          <h3 className="font-semibold text-sm text-white leading-tight line-clamp-2">
            {movie.title}
          </h3>
          {movie.title !== movie.original_title && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{movie.original_title}</p>
          )}
        </div>

        {/* Year + Runtime */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          {year && <span>{year}</span>}
          {runtime && (
            <>
              <span className="text-gray-700">·</span>
              <span>{runtime}</span>
            </>
          )}
        </div>

        {/* Rating */}
        {movie.vote_average > 0 && (
          <div className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="#F5C518">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span className="text-sm font-semibold" style={{ color: "#F5C518" }}>{rating}</span>
            <span className="text-xs text-gray-500">/10</span>
          </div>
        )}

        {/* Genres */}
        {genres.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {genres.slice(0, 3).map((g) => (
              <span
                key={g.id}
                className="text-xs px-1.5 py-0.5 rounded-md bg-gray-800 text-gray-400"
              >
                {g.name}
              </span>
            ))}
          </div>
        )}

        {/* Cast */}
        {cast.length > 0 && (
          <div className="text-xs text-gray-400 space-y-0.5">
            {cast.map((actor) => (
              <div key={actor.id} className="truncate">
                {actor.name}
              </div>
            ))}
          </div>
        )}

        {/* Streaming */}
        <div className="mt-auto pt-2 border-t border-gray-800">
          {streaming.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 items-center">
              {streaming.slice(0, 4).map((provider) => (
                <div key={provider.provider_id} className="relative w-7 h-7 rounded-lg overflow-hidden" title={provider.provider_name}>
                  <Image
                    src={getLogoUrl(provider.logo_path)}
                    alt={provider.provider_name}
                    fill
                    sizes="28px"
                    className="object-cover"
                  />
                </div>
              ))}
              {streaming.length > 4 && (
                <span className="text-xs text-gray-500">+{streaming.length - 4}</span>
              )}
            </div>
          ) : (
            <span className="text-xs text-gray-600">Sin streaming disponible</span>
          )}
        </div>

        {/* Similar button */}
        <button
          onClick={() => onSimilar(movie)}
          className="mt-2 w-full py-2 px-3 rounded-xl bg-indigo-900/40 hover:bg-indigo-800/60 border border-indigo-800/50 hover:border-indigo-700 text-indigo-300 hover:text-indigo-200 text-xs font-medium transition-all flex items-center justify-center gap-1.5"
        >
          Como esta
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
