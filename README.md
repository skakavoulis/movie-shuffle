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
3. Run the following SQL in the Supabase SQL Editor to create the `profiles` table and RLS policies:

```sql
-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Auto-update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

4. In the Supabase dashboard under Authentication → URL Configuration, add your app's URL (e.g. `http://localhost:3000`) to the Redirect URLs.

### Running the App

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
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
