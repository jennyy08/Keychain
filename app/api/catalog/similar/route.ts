import { findLastFmSimilarTracks } from "@/lib/catalog/lastfm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title")?.trim() ?? "";
  const artist = searchParams.get("artist")?.trim() ?? "";
  if (!title || !artist || title.length > 150 || artist.length > 150) {
    return Response.json(
      { error: "A track title and artist are required." },
      { status: 400 },
    );
  }

  try {
    return Response.json(await findLastFmSimilarTracks(title, artist));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Suggestions failed.";
    return Response.json(
      { error: message },
      { status: message === "Last.fm is not configured yet." ? 503 : 502 },
    );
  }
}
