const MUSICBRAINZ_API_URL = "https://musicbrainz.org/ws/2/recording";
const COVER_ART_ARCHIVE_URL = "https://coverartarchive.org/release";

type MusicBrainzRelease = {
  id?: string;
  status?: string;
};

type MusicBrainzRecording = {
  score?: number;
  releases?: MusicBrainzRelease[];
};

type MusicBrainzSearchResponse = {
  recordings?: MusicBrainzRecording[];
};

function phrase(value: string) {
  return `"${value.replace(/["\\]/g, " ").trim()}"`;
}

export async function findMusicBrainzArtwork(
  title: string,
  artist: string,
): Promise<string | null> {
  const query = `recording:${phrase(title)} AND artist:${phrase(artist)}`;
  const params = new URLSearchParams({ query, fmt: "json", limit: "3" });
  const response = await fetch(`${MUSICBRAINZ_API_URL}?${params}`, {
    headers: {
      "User-Agent": "Keychain/1.0 (https://keychain-five.vercel.app)",
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("MusicBrainz is temporarily unavailable.");

  const payload = (await response.json()) as MusicBrainzSearchResponse;
  const recording = payload.recordings?.find((item) => (item.score ?? 0) >= 90);
  const release = recording?.releases?.find((item) => item.status === "Official");
  if (!release?.id) return null;

  const artworkUrl = `${COVER_ART_ARCHIVE_URL}/${release.id}/front-250`;
  const artworkResponse = await fetch(artworkUrl, {
    method: "HEAD",
    redirect: "manual",
    cache: "no-store",
  });
  return artworkResponse.status >= 300 && artworkResponse.status < 400
    ? artworkUrl
    : null;
}
