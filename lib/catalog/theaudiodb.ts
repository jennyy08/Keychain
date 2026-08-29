type TheAudioDbTrack = {
  strTrack?: string;
  strArtist?: string;
  strTrackThumb?: string;
};

type TheAudioDbResponse = {
  track?: TheAudioDbTrack[];
};

const THEAUDIODB_API_URL = "https://www.theaudiodb.com/api/v1/json";
const PUBLIC_DEVELOPMENT_KEY = "123";

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export async function findTheAudioDbArtwork(
  title: string,
  artist: string,
): Promise<string | null> {
  const apiKey = process.env.THEAUDIODB_API_KEY || PUBLIC_DEVELOPMENT_KEY;
  const params = new URLSearchParams({ s: artist, t: title });
  const response = await fetch(
    `${THEAUDIODB_API_URL}/${apiKey}/searchtrack.php?${params}`,
    { cache: "no-store" },
  );
  if (!response.ok) throw new Error("TheAudioDB is temporarily unavailable.");

  const payload = (await response.json()) as TheAudioDbResponse;
  const wantedTitle = normalize(title);
  const wantedArtist = normalize(artist);
  const match = payload.track?.find(
    (track) =>
      normalize(track.strTrack ?? "") === wantedTitle &&
      normalize(track.strArtist ?? "") === wantedArtist,
  );
  return match?.strTrackThumb?.trim() || null;
}
