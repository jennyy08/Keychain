import { resolveArtwork } from "@/lib/catalog/artwork";

type ArtworkRequest = { title?: unknown; artist?: unknown };

export async function POST(request: Request) {
  let payload: ArtworkRequest;
  try {
    payload = (await request.json()) as ArtworkRequest;
  } catch {
    return Response.json({ error: "Send a valid track request." }, { status: 400 });
  }

  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const artist = typeof payload.artist === "string" ? payload.artist.trim() : "";
  if (!title || !artist || title.length > 150 || artist.length > 150) {
    return Response.json(
      { error: "A track title and artist are required." },
      { status: 400 },
    );
  }

  try {
    return Response.json(await resolveArtwork(title, artist));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Artwork lookup failed.";
    return Response.json({ error: message }, { status: 502 });
  }
}
