"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import {
  BookmarkSimple,
  Bookmark,
  ArrowsClockwise,
  Info,
  Star,
} from "@phosphor-icons/react";
import {
  TMDBMovie,
  getPosterUrl,
  getBackdropUrl,
  getLogoUrl,
  formatRuntime,
  getYear,
  getStreamingProviders,
} from "@/lib/tmdb";

interface MovieFeedProps {
  movies: TMDBMovie[];
  countryCode: string;
  onWatchlist: (movie: TMDBMovie) => void;
  watchlist: TMDBMovie[];
  isLoading?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  onSimilar: (movie: TMDBMovie) => void;
  onInfo: (movie: TMDBMovie) => void;
}

// Preload image helper
function preloadImage(src: string) {
  if (typeof window === "undefined") return;
  const img = new window.Image();
  img.src = src;
}

interface SlideProps {
  movie: TMDBMovie;
  countryCode: string;
  isSaved: boolean;
  onWatchlist: () => void;
  onSimilar: () => void;
  onInfo: () => void;
}

function MovieSlide({ movie, countryCode, isSaved, onWatchlist, onSimilar, onInfo }: SlideProps) {
  const [overviewExpanded, setOverviewExpanded] = useState(false);

  // Use backdrop for full-screen (better aspect ratio), fallback to poster
  const fullImage = movie.backdrop_path
    ? getBackdropUrl(movie.backdrop_path, "w1280")
    : getPosterUrl(movie.poster_path, "original");
  const year = getYear(movie.release_date);
  const runtime = formatRuntime(movie.runtime);
  const rating = movie.vote_average > 0 ? movie.vote_average.toFixed(1) : null;
  const genres = movie.genres?.slice(0, 3) ?? [];
  const streaming = getStreamingProviders(movie, countryCode);
  const overview = movie.overview ?? "";

  // Truncate to ~2 lines (~120 chars)
  const SHORT_LEN = 120;
  const isLong = overview.length > SHORT_LEN;
  const shortOverview = isLong ? overview.slice(0, SHORT_LEN).trimEnd() + "…" : overview;

  return (
    <div
      className="feed-slide"
      style={{ touchAction: "pan-y" }}
    >
      {/* Full-screen poster */}
      {fullImage ? (
        <Image
          src={fullImage}
          alt={movie.title}
          fill
          sizes="100vw"
          className="object-cover"
          priority={false}
          style={{ zIndex: 0 }}
        />
      ) : (
        <div className="absolute inset-0" style={{ background: "var(--surface)", zIndex: 0 }} />
      )}

      {/* Gradient overlay — bottom to top */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          background:
            "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0.15) 70%, transparent 100%)",
        }}
      />

      {/* Sidebar — right side, vertically centered */}
      <div
        className="absolute right-4 flex flex-col gap-5 items-center"
        style={{
          zIndex: 10,
          bottom: "120px",
        }}
      >
        {/* Bookmark */}
        <button
          onClick={onWatchlist}
          className="flex flex-col items-center gap-1 transition-all active:scale-90"
          aria-label="Guardar"
        >
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{
              background: isSaved ? "var(--accent)" : "rgba(0,0,0,0.5)",
              backdropFilter: "blur(8px)",
              border: isSaved ? "none" : "1px solid rgba(255,255,255,0.15)",
            }}
          >
            {isSaved ? (
              <Bookmark size={20} weight="fill" color="var(--accent-text)" />
            ) : (
              <BookmarkSimple size={20} color="white" />
            )}
          </div>
          <span className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.75)" }}>
            {isSaved ? "Guardada" : "Guardar"}
          </span>
        </button>

        {/* Similares */}
        <button
          onClick={onSimilar}
          className="flex flex-col items-center gap-1 transition-all active:scale-90"
          aria-label="Similares"
        >
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <ArrowsClockwise size={20} color="white" />
          </div>
          <span className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.75)" }}>
            Similares
          </span>
        </button>

        {/* Info */}
        <button
          onClick={onInfo}
          className="flex flex-col items-center gap-1 transition-all active:scale-90"
          aria-label="Info"
        >
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <Info size={20} color="white" />
          </div>
          <span className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.75)" }}>
            Info
          </span>
        </button>
      </div>

      {/* Bottom info overlay */}
      <div
        className="absolute bottom-0 left-0 right-0 flex flex-col gap-2 pb-6 pr-20"
        style={{ zIndex: 10, paddingLeft: "20px", paddingRight: "80px" }}
      >
        {/* Title */}
        <h2
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: "clamp(1.25rem, 5vw, 1.75rem)",
            lineHeight: 1.15,
            color: "#F2F2F2",
            letterSpacing: "-0.03em",
            textShadow: "0 2px 12px rgba(0,0,0,0.5)",
          }}
        >
          {movie.title}
        </h2>

        {/* Meta: year · runtime · rating */}
        <div className="flex items-center gap-2 flex-wrap">
          {year && (
            <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
              {year}
            </span>
          )}
          {runtime && (
            <>
              <span style={{ color: "rgba(255,255,255,0.35)" }}>·</span>
              <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
                {runtime}
              </span>
            </>
          )}
          {rating && (
            <>
              <span style={{ color: "rgba(255,255,255,0.35)" }}>·</span>
              <span className="flex items-center gap-1">
                <Star size={11} weight="fill" color="#F5C518" />
                <span className="text-xs font-semibold" style={{ color: "#F5C518" }}>
                  {rating}
                </span>
                <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                  IMDb
                </span>
              </span>
            </>
          )}
        </div>

        {/* Genre chips */}
        {genres.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {genres.map((g) => (
              <span
                key={g.id}
                className="text-[11px] px-2.5 py-0.5 rounded-full"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  backdropFilter: "blur(6px)",
                  color: "rgba(255,255,255,0.85)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                {g.name}
              </span>
            ))}
          </div>
        )}

        {/* Overview — 2 lines max, tap to expand */}
        {overview && (
          <div>
            <p
              className="text-xs leading-relaxed"
              style={{ color: "rgba(255,255,255,0.65)" }}
            >
              {overviewExpanded ? overview : shortOverview}
            </p>
            {isLong && (
              <button
                onClick={() => setOverviewExpanded((e) => !e)}
                className="text-[11px] font-semibold mt-0.5"
                style={{ color: "var(--accent)" }}
              >
                {overviewExpanded ? "Ver menos" : "Ver más"}
              </button>
            )}
          </div>
        )}

        {/* Streaming logos */}
        {streaming.length > 0 && (
          <div className="flex gap-2 items-center">
            {streaming.slice(0, 5).map((p) => (
              <div
                key={p.provider_id}
                className="relative w-7 h-7 rounded-lg overflow-hidden flex-shrink-0"
                title={p.provider_name}
              >
                <Image
                  src={getLogoUrl(p.logo_path)}
                  alt={p.provider_name}
                  fill
                  sizes="28px"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MovieFeed({
  movies,
  countryCode,
  onWatchlist,
  watchlist,
  isLoading,
  isLoadingMore,
  onLoadMore,
  onSimilar,
  onInfo,
}: MovieFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastSlideRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const watchlistIds = new Set(watchlist.map((m) => m.id));

  // IntersectionObserver: load more when near end
  useEffect(() => {
    if (!onLoadMore || isLoadingMore) return;
    const el = lastSlideRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onLoadMore, isLoadingMore, movies.length]);

  // IntersectionObserver: track active slide for preloading
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const slides = container.querySelectorAll<HTMLElement>("[data-slide-index]");
    if (!slides.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.slideIndex);
            setActiveIndex(idx);
          }
        });
      },
      { root: container, threshold: 0.6 }
    );

    slides.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [movies.length]);

  // Preload N+1 and N+2
  useEffect(() => {
    [activeIndex + 1, activeIndex + 2].forEach((i) => {
      const movie = movies[i];
      if (!movie) return;
      const src = movie.backdrop_path
        ? getBackdropUrl(movie.backdrop_path, "w1280")
        : getPosterUrl(movie.poster_path, "original");
      preloadImage(src);
    });
  }, [activeIndex, movies]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div
        className="feed-container"
        style={{ display: "flex", flexDirection: "column" }}
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="feed-slide skeleton" />
        ))}
      </div>
    );
  }

  if (!movies.length) {
    return (
      <div
        className="feed-container flex items-center justify-center"
        style={{ color: "var(--text-3)", fontSize: "0.875rem" }}
      >
        No hay películas
      </div>
    );
  }

  return (
    <div ref={containerRef} className="feed-container" style={{ display: "flex", flexDirection: "column" }}>
      {movies.map((movie, index) => {
        const isPenultimate = index === movies.length - 2;

        return (
          <div
            key={movie.id}
            data-slide-index={index}
            ref={isPenultimate ? lastSlideRef : undefined}
            style={{ flexShrink: 0 }}
          >
            <MovieSlide
              movie={movie}
              countryCode={countryCode}
              isSaved={watchlistIds.has(movie.id)}
              onWatchlist={() => onWatchlist(movie)}
              onSimilar={() => onSimilar(movie)}
              onInfo={() => onInfo(movie)}
            />
          </div>
        );
      })}

      {/* Loading more indicator */}
      {isLoadingMore && (
        <div
          className="feed-slide flex items-center justify-center"
          style={{ height: "100dvh", flexShrink: 0 }}
        >
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "var(--accent) transparent var(--accent) var(--accent)" }}
            />
            <span className="text-xs" style={{ color: "var(--text-3)" }}>
              Cargando más…
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
