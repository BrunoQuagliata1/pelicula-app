"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import {
  TMDBMovie,
  TMDBVideo,
  TMDBImage,
  getPosterUrl,
  getBackdropUrl,
  getLogoUrl,
  formatRuntime,
  getYear,
  getStreamingProviders,
  getMovieVideos,
  getMovieImages,
} from "@/lib/tmdb";

interface MovieCardProps {
  movie: TMDBMovie;
  countryCode: string;
  onSimilar: (movie: TMDBMovie) => void;
  onWatchlist: (movie: TMDBMovie) => void;
  inWatchlist: boolean;
}

// Cache fetched trailer/images per movie id to avoid redundant API calls
const mediaCache = new Map<number, { trailerKey: string | null; backdrops: string[] }>();

// Detect touch device
function isTouchDevice() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

export default function MovieCard({ movie, countryCode, onSimilar, onWatchlist, inWatchlist }: MovieCardProps) {
  const [posterError, setPosterError] = useState(false);

  // Hover / interaction state
  const [isHovered, setIsHovered] = useState(false);
  const [trailerKey, setTrailerKey] = useState<string | null>(movie.trailerKey ?? null);
  const [backdrops, setBackdrops] = useState<string[]>(movie.backdrops ?? []);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  // Mobile tap: show overview overlay
  const [showMobileOverview, setShowMobileOverview] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFetching = useRef(false);

  const year = getYear(movie.release_date);
  const runtime = formatRuntime(movie.runtime);
  const rating = movie.vote_average?.toFixed(1) ?? "–";
  const genres = movie.genres ?? [];
  const cast = movie.credits?.cast?.slice(0, 3) ?? [];
  const streaming = getStreamingProviders(movie, countryCode);
  const posterUrl = posterError ? null : getPosterUrl(movie.poster_path, "w342");

  // Lazily fetch trailer + backdrops on first hover
  const fetchMedia = useCallback(async () => {
    if (mediaLoaded || isFetching.current) return;
    if (mediaCache.has(movie.id)) {
      const cached = mediaCache.get(movie.id)!;
      setTrailerKey(cached.trailerKey);
      setBackdrops(cached.backdrops);
      setMediaLoaded(true);
      return;
    }
    isFetching.current = true;
    try {
      const [videosRes, imagesRes] = await Promise.allSettled([
        getMovieVideos(movie.id),
        getMovieImages(movie.id),
      ]);

      // Best trailer: official YouTube trailer first, then teaser
      let key: string | null = null;
      if (videosRes.status === "fulfilled") {
        const vids: TMDBVideo[] = videosRes.value.results ?? [];
        const trailer =
          vids.find((v) => v.site === "YouTube" && v.type === "Trailer" && v.official) ??
          vids.find((v) => v.site === "YouTube" && v.type === "Trailer") ??
          vids.find((v) => v.site === "YouTube" && v.type === "Teaser");
        key = trailer?.key ?? null;
      }

      // Top backdrops (up to 6, sorted by vote)
      let bdps: string[] = [];
      if (imagesRes.status === "fulfilled") {
        const imgs: TMDBImage[] = imagesRes.value.backdrops ?? [];
        bdps = imgs
          .sort((a, b) => b.vote_average - a.vote_average)
          .slice(0, 6)
          .map((img) => getBackdropUrl(img.file_path, "w780"));
      }

      // Fallback: use backdrop_path from movie data
      if (bdps.length === 0 && movie.backdrop_path) {
        bdps = [getBackdropUrl(movie.backdrop_path, "w780")];
      }

      mediaCache.set(movie.id, { trailerKey: key, backdrops: bdps });
      setTrailerKey(key);
      setBackdrops(bdps);
    } finally {
      isFetching.current = false;
      setMediaLoaded(true);
    }
  }, [movie.id, movie.backdrop_path, mediaLoaded]);

  const handleMouseEnter = useCallback(() => {
    if (isTouchDevice()) return;
    setIsHovered(true);
    // Start fetch immediately on hover, show trailer after 600ms so fast scrollers don't trigger it
    fetchMedia();
    hoverTimer.current = setTimeout(() => setShowTrailer(true), 600);
  }, [fetchMedia]);

  const handleMouseLeave = useCallback(() => {
    if (isTouchDevice()) return;
    setIsHovered(false);
    setShowTrailer(false);
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
  }, []);

  // Mobile tap on poster area — toggle overview
  const handlePosterTap = useCallback(() => {
    if (!isTouchDevice()) return;
    setShowMobileOverview((v) => !v);
  }, []);

  useEffect(() => {
    return () => { if (hoverTimer.current) clearTimeout(hoverTimer.current); };
  }, []);

  // Gallery keyboard nav
  const nextPhoto = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setGalleryIndex((i) => (i + 1) % backdrops.length);
  }, [backdrops.length]);

  const prevPhoto = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setGalleryIndex((i) => (i - 1 + backdrops.length) % backdrops.length);
  }, [backdrops.length]);

  return (
    <div
      className="movie-card flex flex-col bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 hover:border-gray-600 w-[85vw] max-w-[220px] flex-shrink-0 relative transition-all duration-200 hover:shadow-xl hover:shadow-black/40 hover:-translate-y-0.5"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* ── Poster / Trailer / Gallery area ─────────────────────────── */}
      <div
        className="relative w-full aspect-[2/3] bg-gray-800 overflow-hidden"
        onClick={handlePosterTap}
      >

        {/* Poster (base layer) */}
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={movie.title}
            fill
            sizes="(max-width: 640px) 85vw, 220px"
            className={`object-cover transition-opacity duration-300 ${showTrailer ? "opacity-0" : "opacity-100"}`}
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

        {/* Trailer iframe — only mounts after hover delay + trailer key exists (desktop only) */}
        {showTrailer && trailerKey && (
          <div className="absolute inset-0 z-10">
            <iframe
              src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&loop=1&playlist=${trailerKey}`}
              allow="autoplay; encrypted-media"
              className="w-full h-full border-0"
              title={`Trailer ${movie.title}`}
            />
            {/* Gradient overlay so bottom info stays readable */}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none" />
          </div>
        )}

        {/* Overview overlay:
            - Desktop: shows on hover when no trailer or before trailer loads
            - Mobile: shows on tap */}
        {((isHovered && !showTrailer) || showMobileOverview) && movie.overview && (
          <div className="absolute inset-0 bg-gray-950/90 p-3 z-10 overflow-y-auto flex items-start transition-opacity duration-150">
            <p className="text-xs text-gray-200 leading-relaxed">{movie.overview}</p>
          </div>
        )}

        {/* Watchlist button */}
        <button
          onClick={(e) => { e.stopPropagation(); onWatchlist(movie); }}
          className={`absolute top-2 right-2 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-lg ${
            inWatchlist
              ? "bg-yellow-400 text-gray-900 scale-110"
              : "bg-gray-900/80 text-gray-400 hover:bg-gray-800 hover:text-yellow-400"
          }`}
          title={inWatchlist ? "Quitar de Mi lista" : "Agregar a Mi lista"}
        >
          <svg className="w-4 h-4" fill={inWatchlist ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 3h14a1 1 0 011 1v17l-7-3.5L5 21V4a1 1 0 011-1z" />
          </svg>
        </button>

        {/* Trailer indicator badge (desktop hover only) */}
        {trailerKey && !showTrailer && isHovered && (
          <div className="absolute bottom-2 left-2 z-20 flex items-center gap-1 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
            <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            Trailer
          </div>
        )}

        {/* Mobile tap hint — visible on touch devices when overview is hidden */}
        {!showMobileOverview && movie.overview && (
          <div className="absolute bottom-2 left-2 z-20 sm:hidden flex items-center gap-1 bg-black/60 text-white text-[10px] px-2 py-1 rounded-full pointer-events-none">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Ver info
          </div>
        )}
      </div>

      {/* ── Info area ────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 p-3 gap-2">
        <div>
          <h3 className="font-semibold text-sm text-white leading-tight line-clamp-2">{movie.title}</h3>
          {movie.title !== movie.original_title && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{movie.original_title}</p>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          {year && <span>{year}</span>}
          {runtime && <><span className="text-gray-700">·</span><span>{runtime}</span></>}
        </div>

        {movie.vote_average > 0 && (
          <div className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="#F5C518">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span className="text-sm font-semibold" style={{ color: "#F5C518" }}>{rating}</span>
            <span className="text-xs text-gray-500">/10</span>
          </div>
        )}

        {genres.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {genres.slice(0, 3).map((g) => (
              <span key={g.id} className="text-xs px-1.5 py-0.5 rounded-md bg-gray-800 text-gray-400">{g.name}</span>
            ))}
          </div>
        )}

        {cast.length > 0 && (
          <div className="text-xs text-gray-400 space-y-0.5">
            {cast.map((actor) => (
              <div key={actor.id} className="truncate">{actor.name}</div>
            ))}
          </div>
        )}

        {/* ── Photo gallery strip ─────────────────────────────────────── */}
        {backdrops.length > 0 && (
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); fetchMedia(); setShowGallery((v) => !v); }}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {backdrops.length} fotos
            </button>

            {/* Expanded gallery */}
            {showGallery && (
              <div className="mt-1.5 relative rounded-lg overflow-hidden bg-gray-950 aspect-video">
                <Image
                  src={backdrops[galleryIndex]}
                  alt={`${movie.title} - foto ${galleryIndex + 1}`}
                  fill
                  sizes="194px"
                  className="object-cover"
                />
                {backdrops.length > 1 && (
                  <>
                    <button
                      onClick={prevPhoto}
                      className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white text-xs transition-colors z-10"
                    >‹</button>
                    <button
                      onClick={nextPhoto}
                      className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white text-xs transition-colors z-10"
                    >›</button>
                    <div className="absolute bottom-1 inset-x-0 flex justify-center gap-1">
                      {backdrops.map((_, i) => (
                        <button
                          key={i}
                          onClick={(e) => { e.stopPropagation(); setGalleryIndex(i); }}
                          className={`w-1.5 h-1.5 rounded-full transition-colors ${i === galleryIndex ? "bg-white" : "bg-white/30"}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Streaming providers */}
        <div className="mt-auto pt-2 border-t border-gray-800">
          {streaming.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 items-center">
              {streaming.slice(0, 4).map((provider) => (
                <div key={provider.provider_id} className="relative w-7 h-7 rounded-lg overflow-hidden" title={provider.provider_name}>
                  <Image src={getLogoUrl(provider.logo_path)} alt={provider.provider_name} fill sizes="28px" className="object-cover" />
                </div>
              ))}
              {streaming.length > 4 && <span className="text-xs text-gray-500">+{streaming.length - 4}</span>}
            </div>
          ) : (
            <span className="text-xs text-gray-600">Sin streaming disponible</span>
          )}
        </div>

        <button
          onClick={() => onSimilar(movie)}
          className="mt-2 w-full min-h-[44px] py-2 px-3 rounded-xl bg-indigo-900/40 hover:bg-indigo-800/60 border border-indigo-800/50 hover:border-indigo-700 text-indigo-300 hover:text-indigo-200 text-xs font-medium transition-all flex items-center justify-center gap-1.5"
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
