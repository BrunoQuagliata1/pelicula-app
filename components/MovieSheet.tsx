"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { X, ArrowRight, Bookmark, BookmarkSimple, Star, Play, CaretLeft, CaretRight } from "@phosphor-icons/react";
import {
  TMDBMovie, getPosterUrl, getBackdropUrl, getLogoUrl,
  formatRuntime, getYear, getStreamingProviders,
  getMovieVideos, getMovieImages, TMDBVideo, TMDBImage,
} from "@/lib/tmdb";

interface MovieSheetProps {
  movie: TMDBMovie;
  countryCode: string;
  onClose: () => void;
  onSimilar: (movie: TMDBMovie) => void;
  onWatchlist: (movie: TMDBMovie) => void;
  inWatchlist: boolean;
}

export default function MovieSheet({
  movie, countryCode, onClose, onSimilar, onWatchlist, inWatchlist,
}: MovieSheetProps) {
  const [expanded, setExpanded] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [trailerKey, setTrailerKey] = useState<string | null>(movie.trailerKey ?? null);
  const [backdrops, setBackdrops] = useState<string[]>(() => {
    const initial = movie.backdrop_path ? [getBackdropUrl(movie.backdrop_path, "w780")] : [];
    return initial;
  });
  const [photoIndex, setPhotoIndex] = useState(0);
  const [mediaLoaded, setMediaLoaded] = useState(false);

  const poster = getPosterUrl(movie.poster_path, "w342");
  const year = getYear(movie.release_date);
  const runtime = formatRuntime(movie.runtime);
  const rating = movie.vote_average > 0 ? movie.vote_average.toFixed(1) : null;
  const genres = movie.genres?.slice(0, 3) ?? [];
  const cast = movie.credits?.cast?.slice(0, 5) ?? [];
  const streaming = getStreamingProviders(movie, countryCode);
  const overview = movie.overview ?? "";
  const shortOverview = overview.length > 150 ? overview.slice(0, 150).trimEnd() + "…" : overview;

  // Fetch trailer + extra backdrops
  useEffect(() => {
    if (mediaLoaded) return;
    setMediaLoaded(true);
    Promise.allSettled([
      getMovieVideos(movie.id),
      getMovieImages(movie.id),
    ]).then(([videosRes, imagesRes]) => {
      if (videosRes.status === "fulfilled") {
        const vids: TMDBVideo[] = videosRes.value.results ?? [];
        const trailer =
          vids.find(v => v.site === "YouTube" && v.type === "Trailer" && v.official) ??
          vids.find(v => v.site === "YouTube" && v.type === "Trailer") ??
          vids.find(v => v.site === "YouTube" && v.type === "Teaser");
        if (trailer?.key) setTrailerKey(trailer.key);
      }
      if (imagesRes.status === "fulfilled") {
        const imgs: TMDBImage[] = imagesRes.value.backdrops ?? [];
        const bdps = imgs
          .sort((a, b) => b.vote_average - a.vote_average)
          .slice(0, 8)
          .map(img => getBackdropUrl(img.file_path, "w780"));
        if (bdps.length > 0) setBackdrops(bdps);
      }
    }).catch(() => {});
  }, [movie.id, mediaLoaded]);

  const currentPhoto = showTrailer ? null : (backdrops[photoIndex] ?? poster);
  const totalPhotos = backdrops.length;

  return (
    <>
      {/* Overlay */}
      <div
        className="sheet-overlay"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="sheet-panel no-scrollbar">

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-0 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--text-3)" }} />
        </div>

        {/* ── Media area (foto/trailer) ── */}
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/9" }}>
          {showTrailer && trailerKey ? (
            <iframe
              src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&controls=1&rel=0`}
              allow="autoplay; encrypted-media"
              className="w-full h-full border-0"
              title={`Trailer ${movie.title}`}
            />
          ) : (
            <>
              {currentPhoto ? (
                <Image
                  key={currentPhoto}
                  src={currentPhoto}
                  alt={movie.title}
                  fill
                  sizes="640px"
                  className="object-cover"
                  style={{ transition: "opacity 0.2s ease" }}
                />
              ) : (
                <div className="absolute inset-0" style={{ background: "var(--surface)" }} />
              )}

              {/* Gradient bottom */}
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: "linear-gradient(to bottom, transparent 50%, var(--elevated) 100%)" }} />

              {/* Nav arrows — solo si hay más de 1 foto */}
              {totalPhotos > 1 && (
                <>
                  <button
                    onClick={() => setPhotoIndex(i => (i - 1 + totalPhotos) % totalPhotos)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center z-10"
                    style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
                  >
                    <CaretLeft size={14} weight="bold" color="white" />
                  </button>
                  <button
                    onClick={() => setPhotoIndex(i => (i + 1) % totalPhotos)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center z-10"
                    style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
                  >
                    <CaretRight size={14} weight="bold" color="white" />
                  </button>

                  {/* Dots */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                    {backdrops.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setPhotoIndex(i)}
                        className="rounded-full transition-all"
                        style={{
                          width: i === photoIndex ? "16px" : "5px",
                          height: "5px",
                          background: i === photoIndex ? "var(--accent)" : "rgba(255,255,255,0.4)",
                        }}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Play trailer button */}
              {trailerKey && (
                <button
                  onClick={() => setShowTrailer(true)}
                  className="absolute top-2 right-2 flex items-center gap-1.5 px-3 py-1.5 rounded-full z-10 text-xs font-semibold"
                  style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", color: "white" }}
                >
                  <Play size={12} weight="fill" />
                  Trailer
                </button>
              )}
            </>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center z-10"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
          >
            <X size={14} weight="bold" color="white" />
          </button>
        </div>

        {/* ── Contenido ── */}
        <div className="px-5 pb-10 pt-4 flex flex-col gap-4">

          {/* Título + meta + bookmark */}
          <div className="flex gap-3 items-start">
            <div className="flex-1 min-w-0">
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1.25rem", lineHeight: 1.2, color: "var(--text-1)", letterSpacing: "-0.02em" }}>
                {movie.title}
              </h2>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                {year && <span className="text-xs" style={{ color: "var(--text-2)" }}>{year}</span>}
                {runtime && <><span style={{ color: "var(--text-3)" }}>·</span><span className="text-xs" style={{ color: "var(--text-2)" }}>{runtime}</span></>}
                {rating && (
                  <>
                    <span style={{ color: "var(--text-3)" }}>·</span>
                    <span className="flex items-center gap-1">
                      <Star size={11} weight="fill" color="#F5C518" />
                      <span className="text-xs font-semibold" style={{ color: "#F5C518" }}>{rating}</span>
                      <span className="text-[10px]" style={{ color: "var(--text-3)" }}>IMDb</span>
                    </span>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={() => onWatchlist(movie)}
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
              style={{
                background: inWatchlist ? "var(--accent)" : "var(--surface)",
                color: inWatchlist ? "var(--accent-text)" : "var(--text-2)",
                border: "1px solid var(--border)",
              }}
            >
              {inWatchlist ? <Bookmark size={17} weight="fill" /> : <BookmarkSimple size={17} />}
            </button>
          </div>

          {/* Géneros */}
          {genres.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {genres.map(g => (
                <span key={g.id} className="text-[11px] px-2.5 py-1 rounded-full"
                  style={{ background: "var(--surface)", color: "var(--text-2)", border: "1px solid var(--border)" }}>
                  {g.name}
                </span>
              ))}
            </div>
          )}

          {/* Overview */}
          {overview && (
            <div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
                {expanded ? overview : shortOverview}
              </p>
              {overview.length > 150 && (
                <button
                  onClick={() => setExpanded(e => !e)}
                  className="text-xs font-medium mt-1.5"
                  style={{ color: "var(--accent)" }}
                >
                  {expanded ? "Ver menos" : "Ver más"}
                </button>
              )}
            </div>
          )}

          {/* Reparto */}
          {cast.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest mb-2.5" style={{ color: "var(--text-3)" }}>Reparto</p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {cast.map(actor => (
                  <span key={actor.id}
                    className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full"
                    style={{ background: "var(--surface)", color: "var(--text-2)", border: "1px solid var(--border)" }}>
                    {actor.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Streaming */}
          {streaming.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest mb-2.5" style={{ color: "var(--text-3)" }}>Disponible en</p>
              <div className="flex gap-2.5 items-center flex-wrap">
                {streaming.slice(0, 6).map(p => (
                  <div key={p.provider_id} className="relative w-9 h-9 rounded-xl overflow-hidden" title={p.provider_name}>
                    <Image src={getLogoUrl(p.logo_path)} alt={p.provider_name} fill sizes="36px" className="object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {!streaming.length && (
            <p className="text-xs" style={{ color: "var(--text-3)" }}>No disponible en streaming en tu región</p>
          )}

          {/* CTA */}
          <div className="pt-1">
            <button
              onClick={() => { onSimilar(movie); onClose(); }}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-semibold transition-all active:scale-95"
              style={{ background: "var(--accent)", color: "var(--accent-text)", fontFamily: "'Syne', sans-serif" }}
            >
              Películas similares
              <ArrowRight size={16} weight="bold" />
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
