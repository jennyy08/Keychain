import { resolveSearchArtwork, type ResolvedArtwork } from "@/lib/catalog/artwork";

type ArtworkRequest = { id?: unknown; title?: unknown; artist?: unknown };
type ValidTrack = { id: string; title: string; artist: string };

function isValidTrack(value: ArtworkRequest): value is ValidTrack {
  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.artist === "string" &&
    value.id.length <= 300 &&
    value.title.trim().length > 0 &&
    value.title.length <= 150 &&
    value.artist.trim().length > 0 &&
    value.artist.length <= 150
  );
}

export async function POST(request: Request) {
  let payload: { tracks?: unknown };
  try {
    payload = (await request.json()) as { tracks?: unknown };
  } catch {
    return Response.json({ error: "Send valid track details." }, { status: 400 });
  }
  if (!Array.isArray(payload.tracks)) {
    return Response.json({ error: "Send a track list." }, { status: 400 });
  }

  const tracks = payload.tracks.filter(
    (item): item is ArtworkRequest => typeof item === "object" && item !== null,
  );
  if (tracks.length > 12 || !tracks.every(isValidTrack)) {
    return Response.json({ error: "Send up to 12 valid tracks." }, { status: 400 });
  }

  const artworkById: Record<string, ResolvedArtwork> = {};
  let cursor = 0;
  const resolveNext = async () => {
    while (cursor < tracks.length) {
      const track = tracks[cursor++];
      try {
        const artwork = await resolveSearchArtwork(track.title, track.artist);
        if (artwork) artworkById[track.id] = artwork;
      } catch {
        // A missing cover must not fail every other result in the search.
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(3, tracks.length) }, resolveNext));
  return Response.json({ artworkById });
}
