// TMDB API client — all calls go through the /api/movie proxy route

export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  runtime?: number;
  credits?: {
    cast: { id: number; name: string; character: string; profile_path: string | null }[];
    crew: { id: number; name: string; job: string }[];
  };
  "watch/providers"?: {
    results: Record<string, {
      flatrate?: { provider_id: number; provider_name: string; logo_path: string }[];
      rent?: { provider_id: number; provider_name: string; logo_path: string }[];
      buy?: { provider_id: number; provider_name: string; logo_path: string }[];
      link?: string;
    }>;
  };
}

export interface TMDBResponse<T> {
  results: T[];
  total_results?: number;
  total_pages?: number;
  page?: number;
}

async function callProxy(endpoint: string, params: Record<string, string | number> = {}): Promise<unknown> {
  const res = await fetch("/api/movie", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint, params }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error ${res.status}: ${err}`);
  }
  return res.json();
}

export async function getPopularMovies(page = 1): Promise<TMDBResponse<TMDBMovie>> {
  return callProxy("/movie/popular", { page }) as Promise<TMDBResponse<TMDBMovie>>;
}

export async function getTopRatedMovies(page = 1): Promise<TMDBResponse<TMDBMovie>> {
  return callProxy("/movie/top_rated", { page }) as Promise<TMDBResponse<TMDBMovie>>;
}

export async function getNowPlayingMovies(page = 1): Promise<TMDBResponse<TMDBMovie>> {
  return callProxy("/movie/now_playing", { page }) as Promise<TMDBResponse<TMDBMovie>>;
}

export async function searchMovies(query: string, page = 1): Promise<TMDBResponse<TMDBMovie>> {
  return callProxy("/search/movie", { query, page }) as Promise<TMDBResponse<TMDBMovie>>;
}

export async function getMovieDetails(id: number): Promise<TMDBMovie> {
  return callProxy(`/movie/${id}`, {
    append_to_response: "credits,watch/providers",
  }) as Promise<TMDBMovie>;
}

export async function getSimilarMovies(id: number, page = 1): Promise<TMDBResponse<TMDBMovie>> {
  return callProxy(`/movie/${id}/similar`, { page }) as Promise<TMDBResponse<TMDBMovie>>;
}

export async function getMovieRecommendations(id: number, page = 1): Promise<TMDBResponse<TMDBMovie>> {
  return callProxy(`/movie/${id}/recommendations`, { page }) as Promise<TMDBResponse<TMDBMovie>>;
}

export async function discoverMovies(params: Record<string, string | number>): Promise<TMDBResponse<TMDBMovie>> {
  return callProxy("/discover/movie", params) as Promise<TMDBResponse<TMDBMovie>>;
}

export async function searchPerson(name: string): Promise<{ results: { id: number; name: string }[] }> {
  return callProxy("/search/person", { query: name }) as Promise<{ results: { id: number; name: string }[] }>;
}

export function getPosterUrl(path: string | null, size: "w342" | "w780" | "original" = "w342"): string {
  if (!path) return "/placeholder-poster.svg";
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function getLogoUrl(path: string): string {
  return `${TMDB_IMAGE_BASE}/original${path}`;
}

export function formatRuntime(minutes: number | undefined): string {
  if (!minutes) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export function getYear(releaseDate: string | undefined): string {
  if (!releaseDate) return "";
  return releaseDate.slice(0, 4);
}

export function getStreamingProviders(
  movie: TMDBMovie,
  countryCode: string
): { provider_id: number; provider_name: string; logo_path: string }[] {
  const providers = movie["watch/providers"];
  if (!providers?.results) return [];
  const countryData = providers.results[countryCode.toUpperCase()];
  return countryData?.flatrate ?? [];
}
