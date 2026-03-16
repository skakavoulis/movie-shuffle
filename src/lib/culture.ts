export function pickCulture(acceptLanguageHeader?: string): string {
  const values = acceptLanguageHeader
    ?.split(",")
    .map((v) => v.split(";")[0].trim());
  if (!values) return "US";

  const validCultures = values
    .filter((v) => /^[a-zA-Z]{2}-[a-zA-Z]{2}$/i.test(v.trim()))
    .map((v) => v.split("-")[1]);

  const culture = validCultures[0] ?? validCultures.find((v) => v.toUpperCase() !== "US");
  if (!culture) return "US";
  return culture.toUpperCase();
}

/** Get region from request: cookie first, then Accept-Language. */
export function getRegionFromRequest(req: {
  cookies?: Partial<Record<string, string>>;
  headers?: Record<string, string | string[] | undefined>;
}): string {
  const cookie = req.cookies?.["watch-region"];
  if (cookie && /^[A-Z]{2}$/i.test(cookie)) return cookie.toUpperCase();
  const acceptLanguage =
    typeof req.headers?.["accept-language"] === "string"
      ? req.headers["accept-language"]
      : undefined;
  return pickCulture(acceptLanguage);
}
