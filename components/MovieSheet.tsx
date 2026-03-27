"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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

interface MovieSheetProps {
  movie: TMDBMovie | null;
  isOpen: boolean;
  countryCode: string;
  inWatchlist: boolean;
  onClose: () => void;
  onWatchlist: (movie: TMDBMovie) => void;
  onSimilar: (movie: TMDBMovie) => void;
}

const mediaCache = new Map<number, { trailerKey: string | null; backdrops: string[] }>();

export default function MovieSheet({
  movie,
  isOpen,
  countryCode,
  inWatchlist,
  onClose,
  onWatchlist,
  onSimilar,
}: MovieSheetProps) {
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [backdrops, setBackdrops] = useState<string[]>([]);
  const [showTrailer, setShowTrailer] = useState(false);
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch media when movie changes
  useEffect(() => {
    if (!movie) return;
    setTrailerKey(movie.trailerKey ?? null);
    setBackdrops(movie.backdrops ?? []);
    setShowTrailer(false);
    setOverviewExpanded(false);

    if (mediaCache.has(movie.id)) {
      const cached = mediaCache.get(movie.id)!;
      setTrailerKey(cached.trailerKey);
      setBackdrops(cached.backdrops);
      return;
    }

    const fetchMedia = async () => {
      try {
        const [videosRes, imagesRes] = await Promise.allSettled([
          getMovieVideos(movie.id),
          getMovieImages(movie.id),
        ]);

        let key: string | null = null;
        if (videosRes.status === "fulfilled") {
          const vids: TMDBVideo[] = videosRes.value.results ?? [];
          const trailer =
            vids.find((v) => v.site === "YouTube" && v.type === "Trailer" && v.official) ??
            vids.find((v) => v.site === "YouTube" && v.type === "Trailer") ??
            vids.find((v) => v.site === "YouTube" && v.type === "Teaser");
          key = trailer?.key ?? null;
        }

        let bdps: string[] = [];
        if (imagesRes.status === "fulfilled") {
          const imgs: TMDBImage[] = imagesRes.value.backdrops ?? [];
          bdps = imgs
            .sort((a, b) => b.vote_average - a.vote_average)
            .slice(0, 3)
            .map((img) => getBackdropUrl(img.file_path, "w1280"));
        }
        if (bdps.length === 0 && movie.backdrop_path) {
          bdps = [getBackdropUrl(movie.backdrop_path, "w1280")];
        }

        mediaCache.set(movie.id, { trailerKey: key, backdrops: bdps });
        setTrailerKey(key);
        setBackdrops(bdps);
      } catch { /* ignore */ }
    };

    fetchMedia();
  }, [movie]);

  // Close on backdrop click or Escape
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!movie) return null;

  const posterUrl = getPosterUrl(movie.poster_path, "w342");
  const backdropUrl = backdrops[0] ?? (movie.backdrop_path ? getBackdropUrl(movie.backdrop_path, "w1280") : null);
  const year = getYear(movie.release_date);
  const runtime = formatRuntime(movie.runtime);
  const rating = movie.vote_average > 0 ? movie.vote_average.toFixed(1) : null;
  const genres = movie.genres ?? [];
  const cast = movie.credits?.cast?.slice(0, 5) ?? [];
  const streaming = getStreamingProviders(movie, countryCode);

  const overviewText = movie.overview ?? "";
  const overviewWords = overviewText.split(" ");
  const isLongOverview = overviewWords.length > 45;
  const shortOverview = isLongOverview && !overviewExpanded
    ? overviewWords.slice(0, 45).join(" ") + "…"
    : overviewText;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`sheet-backdrop transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={handleBackdropClick}
        aria-hidden
      />

      {/* Sheet panel */}
      <div
        ref={panelRef}
        className={`sheet-panel ${isOpen ? "sheet-open" : "sheet-closed"} flex flex-col overflow-hidden`}
        style={{ maxHeight: "88dvh" }}
        role="dialog"
        aria-modal="true"
        aria-label={movie.title}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0 md:hidden">
          <div className="w-10 h-1 rounded-full bg-[#525252]" />
        </div>

        {/* Close button (desktop / always available) */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-[#A3A3A3] hover:text-white transition-colors"
          aria-label="Cerrar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Scrollable content */}
        <div className="overflow-y-auto overscroll-contain flex-1">
          {/* Hero — backdrop + gradient + title overlay */}
          <div className="relative w-full aspect-video bg-[#141414] flex-shrink-0">
            {showTrailer && trailerKey ? (
              <iframe
                src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=0&controls=1&modestbranding=1&rel=0`}
                allow="autoplay; encrypted-media; fullscreen"
                className="w-full h-full border-0"
                title={`Trailer ${movie.title}`}
              />
            ) : (
              backdropUrl ? (
                <Image
                  src={backdropUrl}
                  alt={movie.title}
                  fill
                  sizes="100vw"
                  className="object-cover"
                  priority
                />
              ) : posterUrl ? (
                <Image
                  src={posterUrl}
                  alt={movie.title}
                  fill
                  sizes="100vw"
                  className="object-cover object-top"
                  priority
                />
              ) : null
            )}

            {/* Gradient overlay */}
            {!showTrailer && (
              <div className="absolute inset-0 bg-gradient-to-t from-[#1C1C1C] via-[#1C1C1C]/30 to-transparent" />
            )}

            {/* Title + meta over gradient */}
            {!showTrailer && (
              <div className="absolute bottom-0 inset-x-0 p-4">
                <h2 className="font-display italic text-2xl font-bold text-white leading-tight line-clamp-2 drop-shadow-lg">
                  {movie.title}
                </h2>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
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
              </div>
            )}
          </div>

          {/* Body content */}
          <div className="px-4 pb-6 space-y-4 mt-1">
            {/* Genres */}
            {genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {genres.map((g) => (
                  <span
                    key={g.id}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-[#262626] text-[#A3A3A3] border border-[#262626]"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            )}

            {/* Overview */}
            {overviewText && (
              <div>
                <p className="text-sm text-[#A3A3A3] leading-relaxed">
                  {shortOverview}
                  {isLongOverview && !overviewExpanded && (
                    <button
                      onClick={() => setOverviewExpanded(true)}
                      className="text-white font-medium ml-1 hover:text-[#E50914] transition-colors"
                    >
                      Ver más
                    </button>
                  )}
                </p>
              </div>
            )}

            {/* Cast */}
            {cast.length > 0 && (
              <div>
                <p className="text-xs text-[#525252] uppercase tracking-wider font-medium mb-2">Reparto</p>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {cast.map((actor) => (
                    <span
                      key={actor.id}
                      className="flex-shrink-0 px-3 py-1.5 rounded-full bg-[#141414] border border-[#262626] text-xs text-[#A3A3A3] whitespace-nowrap"
                    >
                      {actor.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Streaming platforms */}
            {streaming.length > 0 && (
              <div>
                <p className="text-xs text-[#525252] uppercase tracking-wider font-medium mb-2">Disponible en</p>
                <div className="flex flex-wrap gap-2 items-center">
                  {streaming.slice(0, 6).map((provider) => (
                    <div
                      key={provider.provider_id}
                      className="relative w-9 h-9 rounded-xl overflow-hidden"
                      title={provider.provider_name}
                    >
                      <Image
                        src={getLogoUrl(provider.logo_path)}
                        alt={provider.provider_name}
                        fill
                        sizes="36px"
                        className="object-cover"
                      />
                    </div>
                  ))}
                  {streaming.length > 6 && (
                    <span className="text-xs text-[#525252]">+{streaming.length - 6}</span>
                  )}
                </div>
              </div>
            )}

            {/* Trailer button */}
            {trailerKey && !showTrailer && (
              <button
                onClick={() => setShowTrailer(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-[#262626] text-[#A3A3A3] hover:text-white hover:border-[#525252] text-sm font-medium transition-all min-h-[48px]"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Ver trailer
              </button>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { onSimilar(movie); onClose(); }}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#E50914] hover:bg-[#c2070f] text-white font-semibold text-sm transition-colors min-h-[52px]"
              >
                Como esta
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>

              <button
                onClick={() => onWatchlist(movie)}
                className={`
                  flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl font-semibold text-sm
                  transition-all min-h-[52px] border-2
                  ${inWatchlist
                    ? "bg-[#E50914]/10 border-[#E50914] text-[#E50914]"
                    : "bg-transparent border-[#262626] text-[#A3A3A3] hover:border-[#525252] hover:text-white"
                  }
                `}
              >
                <svg className="w-5 h-5" fill={inWatchlist ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 3h14a1 1 0 011 1v17l-7-3.5L5 21V4a1 1 0 011-1z" />
                </svg>
                {inWatchlist ? "Guardada" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
