Execution Plan

- Execution details
    - Whenever you add a new feature, add it to the task-list.md file with markdown format
    - When a new feature is planned, add it to the plan-list.md with markdown format

- High-level structure 
    - Set up a new Next.js app (pages router, TypeScript) and install dependencies for Supabase JS client, TMDB fetch, and UI (e.g. Tailwind CSS or styled-components) while keeping the layout visually close to Vayvo's home-video page (dark streaming-style UI, hero banner, carousels). 
    - Configure environment variables for Supabase (URL, anon key) and TMDB (API key), and wire a typed config helper for safe server/client use. 


 - Supabase configuration & auth
    - Create a new Supabase project in the dashboard and enable Google OAuth; copy the Supabase URL, anon key, and redirect URL into .env.local. 
    - In Supabase, create a profiles table with a 1:1 relation to auth.users (columns: id uuid PK referencing auth.users, username/display_name, avatar_url, timestamps) and row-level security policies that allow users to read/write only their own profile. 
    - Add a small SQL snippet or dashboard steps in the README so the profiles schema/policies can be reproduced easily. 
    - In the Next.js app, add a Supabase client factory (lib/supabaseClient.ts) for browser usage and a server-side helper (lib/supabaseServer.ts using @supabase/auth-helpers-nextjs or a custom cookie-based helper) for SSR. 
    - Implement authentication flows: 
    - A pages/api/auth/callback or similar route (if needed) to support Supabase OAuth redirects. 
    - A login page pages/auth.tsx (or pages/login.tsx) with buttons for email magic link (optional) and Google sign-in that calls Supabase's signInWithOAuth. 
    - A logout endpoint or button that calls supabase.auth.signOut and redirects to the homepage. 
 
 
 - Auth state & protected routes 
 
    - Use either @supabase/auth-helpers-nextjs or a simple custom wrapper to fetch the current user in getServerSideProps for pages that require auth. 
    - Implement a lightweight layout component (components/Layout.tsx) that reads auth state (via server props or client context) to render header navigation (logo, search input, profile/avatar dropdown, login/logout links) similar to Vayvo. 
    - Add a small AuthGuard helper (HOC or wrapper) that redirects unauthenticated users from /profile (and any future protected pages) to the login page. 
 
 
 - TMDB integration & SSR homepage 
 
    - Add a lib/tmdb.ts helper for calling TMDB (base URL, API key, typed fetchers) and document where to insert the TMDB key in .env.local. 
    - Implement a function that fetches one or more lists of movies/TV shows (e.g. popular, top_rated, now_playing) and then randomly samples a subset on each request. 
    - In pages/index.tsx, use getServerSideProps to call the TMDB helper, construct a random set of movies, and pass them down as props for SSR rendering (no client-side fetch needed for the initial view). 
    - Handle minimal error states from TMDB (fallback message or empty UI when API fails). 
 
 
 - UI & Vayvo-style layout 
 
    - Establish global styling: dark background, primary accent color, typography, and spacing consistent with the Vayvo home-video aesthetic via a global CSS/Tailwind config. 
    - Create core UI components inspired by Vayvo: 
    - HeroBanner to show a featured/random movie with backdrop image, title, short overview, call-to-action buttons. 
    - CarouselSection that renders horizontal scrolling rows of poster cards with section titles (e.g. "Random Picks", "Trending Now"). 
    - MovieCard for individual movie posters with hover effects and basic metadata (title, rating, year). 
    - Wire the SSR-random movie list into one or more carousels on the homepage and ensure layout is responsive (desktop, tablet, mobile) and keyboard accessible. 
 
 
 - Profile page & user integration 
 
    - Implement /profile as a protected page using getServerSideProps that loads the current user and the corresponding profiles row from Supabase; if no profile exists, create a default one on first visit. 
    - Render basic editable profile fields (display name, avatar URL) and a save button that updates the Supabase profiles table via a simple API route (pages/api/profile.ts) or direct client call, with minimal validation and success/error feedback. 
    - Show read-only Supabase auth info like email and provider (e.g. "Logged in with Google"). 
 
 
 - Navigation & misc 
 
    - Add a top navigation bar matching the Vayvo style with logo/title, menu links (Home, Profile), and login/logout/profile avatar. 
    - Add a minimal pages/\_app.tsx to inject global styles, layout, and Supabase context/provider if needed. 
    - Configure basic SEO: default meta tags in pages/\_document.tsx and/or page-level <Head> fields (title, description, Open Graph tags). 
 
 
 - README & configuration 
 
    - Write a concise README.md explaining setup: environment variables (Supabase + TMDB), running the dev server, and Supabase SQL for profiles/policies. 
    - Document how to switch TMDB queries (e.g. from movies to TV) and how to add more carousels in the future.
