import { lookupGetSongBpmFeatures } from "@/lib/catalog/getsongbpm";
import { lookupSharedFeatures } from "@/lib/sharedFeatures";

type FeatureRequest = { title?: unknown; artist?: unknown };

export async function POST(request: Request) {
  let payload: FeatureRequest;
  try {
    payload = (await request.json()) as FeatureRequest;
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
    const sharedFeatures = await lookupSharedFeatures(title, artist);
    if (sharedFeatures) return Response.json({ features: sharedFeatures });

    const features = await lookupGetSongBpmFeatures(title, artist);
    if (!features) {
      return Response.json(
        { error: "No confident BPM/key match was found for this track." },
        { status: 404 },
      );
    }
    return Response.json({ features });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Track lookup failed.";
    return Response.json(
      { error: message },
      { status: message === "GetSongBPM is not configured yet." ? 503 : 502 },
    );
  }
}
