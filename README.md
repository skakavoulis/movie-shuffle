# MovieShuffle

A streaming-style web app that surfaces random movies via the TMDB API, with Supabase authentication and user profiles. Built with Next.js (Pages Router), TypeScript, and Tailwind CSS.

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [TMDB](https://www.themoviedb.org/settings/api) API key

### Environment Variables

Copy the example file and fill in your keys:

```bash
cp .env.local.example .env.local
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key |
| `TMDB_API_KEY` | Your TMDB v3 API key |

### Supabase Setup

1. Create a new Supabase project.
2. Enable **Google** as an OAuth provider under Authentication → Providers, adding your Google OAuth credentials.
3. Apply database migrations. You have two options:

   **Option A — Supabase CLI** (recommended):

   ```bash
   npx supabase db push
   ```

   **Option B — Manual SQL**: Copy and paste the contents of `supabase/migrations/20260306120000_create_profiles.sql` into the Supabase SQL Editor and run it.

4. In the Supabase dashboard under Authentication → URL Configuration, add your app's URL (e.g. `http://localhost:3000`) to the Redirect URLs.

### Database Migrations

Migrations live in `supabase/migrations/` and are applied in timestamp order:

| Migration | Description |
|---|---|
| `20260306120000_create_profiles.sql` | Creates the `profiles` table (1:1 with `auth.users`), enables RLS with per-user read/insert/update policies, and adds an `updated_at` auto-trigger |

### Running the App

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
supabase/
├── config.toml                              # Supabase local config
└── migrations/
    └── 20260306120000_create_profiles.sql   # Profiles table + RLS + trigger
src/
├── components/
│   ├── AuthGuard.tsx        # SSR auth protection wrapper
│   ├── CarouselSection.tsx  # Horizontal scrolling movie row
│   ├── HeroBanner.tsx       # Featured movie hero section
│   ├── Layout.tsx           # Page layout with nav & footer
│   └── MovieCard.tsx        # Individual movie poster card
├── lib/
│   ├── config.ts            # Typed env config helper
│   ├── supabaseClient.ts    # Browser Supabase client
│   ├── supabaseServer.ts    # Server-side Supabase client
│   └── tmdb.ts              # TMDB API fetchers & helpers
├── pages/
│   ├── api/
│   │   ├── auth/callback.ts # OAuth code exchange
│   │   └── profile.ts       # Profile CRUD endpoint
│   ├── _app.tsx             # App wrapper
│   ├── _document.tsx        # HTML document wrapper
│   ├── auth.tsx             # Login page
│   ├── index.tsx            # Homepage with SSR movie data
│   └── profile.tsx          # Protected profile page
└── styles/
    └── globals.css          # Global styles & Tailwind theme
```

## Customization

### Switching TMDB Queries

The homepage fetches four categories from `src/lib/tmdb.ts`:

- `getPopularMovies()` — Popular movies
- `getTopRatedMovies()` — Top rated
- `getNowPlayingMovies()` — Now playing in theaters
- `getTrendingMovies()` — Trending this week

To switch to TV shows, you can add similar functions calling `/tv/popular`, `/tv/top_rated`, etc. and wire them into `pages/index.tsx`.

### Adding More Carousels

In `pages/index.tsx`, add a new entry to the `sections` array in `getServerSideProps`:

```ts
{ title: "Your Section", movies: sampleMovies(yourData.results, 15) }
```
