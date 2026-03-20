// Movie search logic — parses natural language into TMDB query params
// No LLM needed: pure keyword extraction

export interface SearchIntent {
  type: "discover" | "search" | "similar" | "popular" | "top_rated" | "now_playing" | "random";
  query?: string;         // for type=search or type=similar
  genres?: number[];      // TMDB genre IDs
  sortBy?: string;
  voteCountGte?: number;
  withoutGenres?: number[];
  releaseDateLte?: string;
  runtimeLte?: number;
  runtimeGte?: number;
  withPeople?: number;    // actor ID
  personName?: string;
  message: string;        // human-readable description of what we're searching
}

// TMDB Genre IDs
const GENRE_MAP: Record<string, number> = {
  acción: 28,
  action: 28,
  aventura: 12,
  adventure: 12,
  animación: 16,
  animation: 16,
  anime: 16,
  comedia: 35,
  comedy: 35,
  cómica: 35,
  cómic: 35,
  reír: 35,
  risa: 35,
  chistosa: 35,
  crimen: 80,
  crime: 80,
  policial: 80,
  documental: 99,
  documentary: 99,
  drama: 18,
  fantasía: 14,
  fantasia: 14,
  fantasy: 14,
  terror: 27,
  horror: 27,
  miedo: 27,
  susto: 27,
  romance: 10749,
  romántica: 10749,
  romantica: 10749,
  amor: 10749,
  "ciencia ficción": 878,
  "sci-fi": 878,
  scifi: 878,
  space: 878,
  espacio: 878,
  thriller: 53,
  suspenso: 53,
  suspense: 53,
  intriga: 53,
  guerra: 10752,
  war: 10752,
  western: 37,
  misterio: 9648,
  mystery: 9648,
  música: 10402,
  musical: 10402,
  historia: 36,
  histórica: 36,
  historical: 36,
  familia: 10751,
  familiar: 10751,
  family: 10751,
  niños: 10751,
};

// Keywords that indicate a "similar to X" intent
const SIMILAR_TRIGGERS = [
  "como ", "parecida a ", "parecido a ", "similar a ", "del estilo de ",
  "estilo ", "tipo ", "al estilo ", "como la de ", "como el de ",
];

// Keywords for a named actor search
const ACTOR_TRIGGERS = [
  "con ", "protagonizada por ", "de ", "actuada por ", "film de ",
  "película de ", "actor ", "actriz ",
];

// Well-known actors/directors to detect "con [person]" pattern
// We detect "con [Name]" where Name has capital letter
function extractPersonSearch(input: string): string | null {
  // Pattern: "con [Nombre Apellido]" — two capitalized words after "con"
  const conMatch = input.match(/\bcon\s+([A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+(?:\s+[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+)*)/);
  if (conMatch) return conMatch[1];
  
  // Pattern: "protagonizada por [Name]" or "actuada por [Name]"
  const actrizMatch = input.match(/(?:protagonizada?|actua[dr]a?) por\s+([A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+(?:\s+[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+)*)/i);
  if (actrizMatch) return actrizMatch[1];

  return null;
}

function extractSimilarTitle(input: string): string | null {
  for (const trigger of SIMILAR_TRIGGERS) {
    const idx = input.toLowerCase().indexOf(trigger);
    if (idx !== -1) {
      const after = input.slice(idx + trigger.length).trim();
      // Remove common trailing words
      const title = after
        .replace(/\s+(pero|solo|nada|please|gracias|por favor).*$/i, "")
        .trim();
      if (title.length > 1) return title;
    }
  }
  return null;
}

function detectGenres(input: string): number[] {
  const lower = input.toLowerCase();
  const found: Set<number> = new Set();

  for (const [keyword, genreId] of Object.entries(GENRE_MAP)) {
    if (lower.includes(keyword)) {
      found.add(genreId);
    }
  }

  return Array.from(found);
}

export async function parseUserInput(input: string): Promise<SearchIntent> {
  const lower = input.toLowerCase();

  // 1. "algo como [title]" — similar movies
  const similarTitle = extractSimilarTitle(input);
  if (similarTitle) {
    return {
      type: "similar",
      query: similarTitle,
      message: `Películas similares a "${similarTitle}"`,
    };
  }

  // 2. "con [Actor]" — search by actor
  const personName = extractPersonSearch(input);
  if (personName) {
    return {
      type: "discover",
      personName,
      message: `Películas con ${personName}`,
    };
  }

  // 3. Check for discover filters
  const genres = detectGenres(input);
  
  let sortBy = "popularity.desc";
  let voteCountGte = 200;
  let releaseDateLte: string | undefined;
  let runtimeLte: number | undefined;
  let runtimeGte: number | undefined;

  // Sort/quality modifiers
  if (/\b(buena|bueno|mejor|top|calidad|bien valorad|bien calificad|excelente|recomendad)\b/i.test(lower)) {
    sortBy = "vote_average.desc";
    voteCountGte = 1000;
  } else if (/\b(popular|famosa|famoso|conocida|conocido|taquillera)\b/i.test(lower)) {
    sortBy = "popularity.desc";
    voteCountGte = 500;
  } else if (/\b(nueva|nuevo|reciente|estreno|estrenos|actual|actu[ae]l)\b/i.test(lower)) {
    sortBy = "release_date.desc";
    voteCountGte = 50;
  } else if (/\b(vieja|viejo|antigua|antiguo|clásica|clasica|clásico|clasico)\b/i.test(lower)) {
    sortBy = "vote_average.desc";
    voteCountGte = 1000;
    releaseDateLte = "1999-12-31";
  }

  // Runtime filters
  if (/\b(corta|corto|breve|rapidita|rapida|rápida|rápido)\b/i.test(lower)) {
    runtimeLte = 100;
  }
  if (/\b(larga|largo|épica|epica|extensa|extenso)\b/i.test(lower)) {
    runtimeGte = 140;
  }

  // Tonight / general watch intent with no other context → popular mix
  if (
    genres.length === 0 &&
    !personName &&
    /\b(ver esta noche|ver hoy|para hoy|para esta noche|no sé|no se|cualquier|algo)\b/i.test(lower) &&
    sortBy === "popularity.desc"
  ) {
    return {
      type: "popular",
      message: "Películas populares para ver esta noche",
    };
  }

  // If we have genres or modifiers, use discover
  if (genres.length > 0 || runtimeLte || runtimeGte || releaseDateLte) {
    const genreLabel = genres.length > 0
      ? `de ${getGenreLabel(genres[0])}`
      : "";
    const qualityLabel =
      sortBy === "vote_average.desc" ? " bien valoradas" :
      sortBy === "release_date.desc" ? " recientes" : "";
    const runtimeLabel = runtimeLte ? " cortas" : runtimeGte ? " largas" : "";

    return {
      type: "discover",
      genres,
      sortBy,
      voteCountGte,
      releaseDateLte,
      runtimeLte,
      runtimeGte,
      message: `Películas${genreLabel}${qualityLabel}${runtimeLabel}`,
    };
  }

  // Fallback to popular
  return {
    type: "popular",
    message: "Películas populares del momento",
  };
}

function getGenreLabel(genreId: number): string {
  const labels: Record<number, string> = {
    28: "acción",
    12: "aventura",
    16: "animación",
    35: "comedia",
    80: "crimen",
    99: "documental",
    18: "drama",
    14: "fantasía",
    27: "terror",
    10749: "romance",
    878: "ciencia ficción",
    53: "thriller",
    10752: "guerra",
    37: "western",
    9648: "misterio",
    10751: "familia",
    10402: "música",
    36: "historia",
  };
  return labels[genreId] ?? "género";
}
