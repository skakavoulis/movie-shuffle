import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import type { User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import {
  getPersonDetails,
  parsePersonIdFromSlug,
  personSlug,
  profileUrl,
  posterUrl,
  movieHref,
  tvHref,
  type TMDBPersonDetails,
} from "@/lib/tmdb";
import Layout from "@/components/Layout";

interface CastPageProps {
  user: User | null;
  person: TMDBPersonDetails;
}

export const getServerSideProps: GetServerSideProps<CastPageProps> = async (
  context,
) => {
  const slug = context.params?.slug as string;
  const personId = parsePersonIdFromSlug(slug);

  if (!personId) {
    return { notFound: true };
  }

  const supabase = createServerSupabaseClient(context);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  try {
    const person = await getPersonDetails(personId);

    const canonicalSlug = personSlug(person);
    if (slug !== canonicalSlug) {
      return {
        redirect: {
          destination: `/cast/${canonicalSlug}`,
          permanent: true,
        },
      };
    }

    return { props: { user, person } };
  } catch {
    return { notFound: true };
  }
};

function formatAge(birthday: string, deathday: string | null) {
  const birth = new Date(birthday);
  const end = deathday ? new Date(deathday) : new Date();
  let age = end.getFullYear() - birth.getFullYear();
  const m = end.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && end.getDate() < birth.getDate())) age--;
  return age;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function CastPage({
  user,
  person,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const credits = person.combined_credits?.cast ?? [];

  const sortedCredits = [...credits]
    .sort((a, b) => {
      // Use release date (or first air date) descending
      const getDate = (credit: any) =>
        credit.media_type === "movie"
          ? credit.release_date
          : credit.first_air_date;
      const aDate = getDate(a) || "";
      const bDate = getDate(b) || "";
      return bDate.localeCompare(aDate);
    })
    .filter(
      (c, i, arr) =>
        arr.findIndex((x) => x.id === c.id && x.media_type === c.media_type) ===
        i,
    );

  const knownFor = [...credits]
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 20);

  return (
    <Layout user={user}>
      <Head>
        <title>{person.name} — JustPickAMovie</title>
        <meta
          name="description"
          content={
            person.biography?.slice(0, 160) ||
            `${person.name} filmography and details`
          }
        />
      </Head>

      <div className="pt-24 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row gap-8 md:gap-12">
          {/* Profile image & quick facts sidebar */}
          <div className="flex-shrink-0 w-full md:w-[300px]">
            <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 bg-bg-card">
              {profileUrl(person.profile_path) ? (
                <Image
                  src={profileUrl(person.profile_path, "h632")!}
                  alt={person.name}
                  fill
                  priority
                  sizes="300px"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-muted text-6xl font-bold">
                  {person.name[0]}
                </div>
              )}
            </div>

            {/* Personal info */}
            <div className="mt-6 space-y-4">
              <h2 className="text-lg font-bold text-text-primary">
                Personal Info
              </h2>

              {person.known_for_department && (
                <div>
                  <p className="text-sm text-text-muted">Known For</p>
                  <p className="text-sm text-text-primary font-medium">
                    {person.known_for_department}
                  </p>
                </div>
              )}

              {person.birthday && (
                <div>
                  <p className="text-sm text-text-muted">Born</p>
                  <p className="text-sm text-text-primary font-medium">
                    {formatDate(person.birthday)}
                    {!person.deathday && (
                      <span className="text-text-muted font-normal">
                        {" "}
                        (age {formatAge(person.birthday, null)})
                      </span>
                    )}
                  </p>
                </div>
              )}

              {person.deathday && person.birthday && (
                <div>
                  <p className="text-sm text-text-muted">Died</p>
                  <p className="text-sm text-text-primary font-medium">
                    {formatDate(person.deathday)}
                    <span className="text-text-muted font-normal">
                      {" "}
                      (age {formatAge(person.birthday, person.deathday)})
                    </span>
                  </p>
                </div>
              )}

              {person.place_of_birth && (
                <div>
                  <p className="text-sm text-text-muted">Place of Birth</p>
                  <p className="text-sm text-text-primary font-medium">
                    {person.place_of_birth}
                  </p>
                </div>
              )}

              {person.also_known_as?.length > 0 && (
                <div>
                  <p className="text-sm text-text-muted">Also Known As</p>
                  <div className="space-y-1 mt-1">
                    {person.also_known_as.slice(0, 5).map((name) => (
                      <p
                        key={name}
                        className="text-sm text-text-primary font-medium"
                      >
                        {name}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* External links */}
              <div className="flex gap-3 pt-2">
                {person.external_ids?.imdb_id && (
                  <a
                    href={`https://www.imdb.com/name/${person.external_ids.imdb_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-yellow-400/10 text-yellow-400 text-xs font-semibold hover:bg-yellow-400/20 transition-colors"
                  >
                    IMDb
                  </a>
                )}
                {person.external_ids?.instagram_id && (
                  <a
                    href={`https://www.instagram.com/${person.external_ids.instagram_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-pink-400/10 text-pink-400 text-xs font-semibold hover:bg-pink-400/20 transition-colors"
                  >
                    Instagram
                  </a>
                )}
                {person.external_ids?.twitter_id && (
                  <a
                    href={`https://twitter.com/${person.external_ids.twitter_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-sky-400/10 text-sky-400 text-xs font-semibold hover:bg-sky-400/20 transition-colors"
                  >
                    Twitter
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
              {person.name}
            </h1>

            {/* Biography */}
            {person.biography && (
              <div className="mt-6">
                <h2 className="text-xl font-bold text-text-primary mb-3">
                  Biography
                </h2>
                <div className="text-base text-text-primary/90 leading-relaxed whitespace-pre-line max-w-3xl">
                  {person.biography}
                </div>
              </div>
            )}

            {/* Known For */}
            {knownFor.length > 0 && (
              <section className="mt-10">
                <h2 className="text-xl font-bold text-text-primary mb-6">
                  Known For
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {knownFor.map((credit) => {
                    const title =
                      credit.media_type === "movie"
                        ? (credit.title ?? "")
                        : (credit.name ?? "");
                    const href =
                      credit.media_type === "movie"
                        ? movieHref({ id: credit.id, title })
                        : tvHref({ id: credit.id, name: title });
                    const year =
                      credit.media_type === "movie"
                        ? credit.release_date?.split("-")[0]
                        : credit.first_air_date?.split("-")[0];

                    return (
                      <Link
                        key={`${credit.media_type}-${credit.id}`}
                        href={href}
                        className="group"
                      >
                        <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-bg-card ring-1 ring-white/5 group-hover:ring-accent/50 transition-all">
                          <Image
                            src={posterUrl(credit.poster_path, "w342")}
                            alt={title}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute top-2 right-2">
                            <span className="px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-semibold text-white uppercase">
                              {credit.media_type === "movie" ? "Film" : "TV"}
                            </span>
                          </div>
                        </div>
                        <p className="mt-2 text-sm font-medium text-text-primary truncate group-hover:text-accent transition-colors">
                          {title}
                        </p>
                        {credit.character && (
                          <p className="text-xs text-text-muted truncate">
                            {credit.character}
                          </p>
                        )}
                        {year && (
                          <p className="text-xs text-text-muted">{year}</p>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Full filmography */}
            {sortedCredits.length > 0 && (
              <section className="mt-10">
                <h2 className="text-xl font-bold text-text-primary mb-4">
                  Filmography
                </h2>
                <div className="bg-bg-card rounded-xl border border-border overflow-hidden">
                  {sortedCredits.map((credit, i) => {
                    const title =
                      credit.media_type === "movie"
                        ? (credit.title ?? "")
                        : (credit.name ?? "");
                    const href =
                      credit.media_type === "movie"
                        ? movieHref({ id: credit.id, title })
                        : tvHref({ id: credit.id, name: title });
                    const year =
                      credit.media_type === "movie"
                        ? credit.release_date?.split("-")[0]
                        : credit.first_air_date?.split("-")[0];

                    return (
                      <Link
                        key={`${credit.media_type}-${credit.id}`}
                        href={href}
                        className={`flex items-center gap-4 px-4 py-3 hover:bg-bg-hover transition-colors ${
                          i > 0 ? "border-t border-border" : ""
                        }`}
                      >
                        <span className="text-sm text-text-muted w-12 flex-shrink-0 text-right">
                          {year || "—"}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] font-semibold text-text-muted uppercase flex-shrink-0">
                          {credit.media_type === "movie" ? "Film" : "TV"}
                        </span>
                        <span className="text-sm text-text-primary font-medium truncate">
                          {title}
                        </span>
                        {credit.character && (
                          <span className="text-sm text-text-muted truncate ml-auto flex-shrink-0">
                            as {credit.character}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
