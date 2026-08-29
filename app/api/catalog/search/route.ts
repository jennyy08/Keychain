import { searchLastFmTracks } from "@/lib/catalog/lastfm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const artist = searchParams.get("artist")?.trim() ?? "";

  if (query.length < 2) {
    return Response.json(
      { error: "Enter at least two characters to search." },
      { status: 400 },
    );
  }
  if (query.length > 100 || artist.length > 100) {
    return Response.json({ error: "Search terms are too long." }, { status: 400 });
  }

  try {
    return Response.json(await searchLastFmTracks(query, artist));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Catalog search failed.";
    const status = message === "Last.fm is not configured yet." ? 503 : 502;
    return Response.json({ error: message }, { status });
  }
}
