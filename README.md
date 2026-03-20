# 🎬 ¿Qué película ver?

App de recomendaciones de películas con interfaz de chat. Descubre tu próxima película favorita basándote en géneros, actores, o películas similares.

## Características

- 💬 **Chat natural** — escribe en español qué quieres ver
- 🎭 **Tarjetas de películas** — poster, año, duración, rating, actores, géneros
- 📺 **Disponibilidad en streaming** — detecta tu país automáticamente
- 🔁 **"Como esta →"** — busca películas similares con un clic
- 🌍 **Selector de país** — cambia para ver qué hay disponible en tu región

## Ejemplos de búsqueda

- "Quiero algo de acción"
- "Algo como Inception"
- "Comedia para reír esta noche"
- "Algo corto y bueno"
- "Terror psicológico"
- "Película nueva de ciencia ficción"
- "Algo con Tom Hanks"
- "Clásico bien valorado"

## Setup

### 1. Obtener clave de TMDB (gratis)

1. Regístrate en [themoviedb.org](https://www.themoviedb.org)
2. Ve a Settings → API
3. Crea una clave de API v3

### 2. Configurar variables de entorno

```bash
cp .env.local.example .env.local
# Edita .env.local y pega tu clave:
# TMDB_API_KEY=tu_clave_aqui
```

### 3. Instalar y ejecutar

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Tech Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS v4**
- **TMDB API** (base de datos de películas, gratis)

## Estructura

```
app/
  page.tsx              — Página principal (chat UI)
  layout.tsx            — Layout con tema oscuro
  api/movie/route.ts    — Proxy para TMDB (oculta la API key)
components/
  MovieCard.tsx         — Tarjeta de película
  MovieGrid.tsx         — Grid horizontal de tarjetas
  ChatInput.tsx         — Input de chat con sugerencias
  CountryPicker.tsx     — Selector de país
lib/
  tmdb.ts              — Cliente TMDB
  movieSearch.ts       — Parser de lenguaje natural → parámetros TMDB
```
