import type { NextApiRequest, NextApiResponse } from "next";
import { getPersonImages, getTitleImages, type TMDBImage } from "@/lib/tmdb";
import { CDN_LONG } from "@/lib/cdnCache";

export type GalleryImage = Pick<TMDBImage, "file_path" | "width" | "height">;

export type ImagesBody = {
  backdrops: GalleryImage[];
  posters: GalleryImage[];
  logos: GalleryImage[];
  profiles: GalleryImage[];
};

/** Drops the fields the gallery doesn't render, which roughly halves the payload. */
function slim(images: TMDBImage[] = []): GalleryImage[] {
  return images.map(({ file_path, width, height }) => ({
    file_path,
    width,
    height,
  }));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ImagesBody | { error: string }>,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const mediaType = req.query.mediaType as string;
  const id = Number(req.query.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Invalid id" });
  }
  if (mediaType !== "movie" && mediaType !== "tv" && mediaType !== "person") {
    return res
      .status(400)
      .json({ error: "mediaType must be movie, tv or person" });
  }

  try {
    let body: ImagesBody;
    if (mediaType === "person") {
      const images = await getPersonImages(id);
      body = {
        backdrops: [],
        posters: [],
        logos: [],
        profiles: slim(images.profiles),
      };
    } else {
      const images = await getTitleImages(mediaType, id);
      body = {
        backdrops: slim(images.backdrops),
        posters: slim(images.posters),
        logos: slim(images.logos),
        profiles: [],
      };
    }
    res.setHeader("Cache-Control", CDN_LONG);
    return res.status(200).json(body);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load images";
    return res.status(500).json({ error: msg });
  }
}
