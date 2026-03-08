export function pickCulture(acceptLanguageHeader?: string): string {
  const values = acceptLanguageHeader
    ?.split(",")
    .map((v) => v.split(";")[0].trim());
  if (!values) return "US";

  const validCultures = values
    .filter((v) => /^[a-zA-Z]{2}-[a-zA-Z]{2}$/i.test(v.trim()))
    .map((v) => v.split("-")[1]);

  const culture = validCultures.find((v) => v.toUpperCase() !== "US");

  if (!culture) return "US";
  return culture.toUpperCase();
}
