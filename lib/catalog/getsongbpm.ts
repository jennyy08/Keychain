import { toCamelot } from "@/lib/camelot";
import type { CatalogTrackFeatures } from "./types";

type GetSongBpmSong = {
  title?: string;
  tempo?: string | number;
  key_of?: string;
  danceability?: number;
  artist?: { name?: string } | { name?: string }[];
};

type GetSongBpmSearchResponse = {
  search?: unknown;
  error?: string;
};

const GETSONGBPM_API_URL = "https://api.getsong.co/search/";

function isGetSongBpmSong(value: unknown): value is GetSongBpmSong {
  return (
    typeof value === "object" &&
    value !== null &&
    ("title" in value || "tempo" in value)
  );
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function artistName(song: GetSongBpmSong) {
  const artist = Array.isArray(song.artist) ? song.artist[0] : song.artist;
  return artist?.name ?? "";
}

function matchScore(song: GetSongBpmSong, title: string, artist: string) {
  const wantedTitle = normalizeText(title);
  const wantedArtist = normalizeText(artist);
  const resultTitle = normalizeText(song.title ?? "");
  const resultArtist = normalizeText(artistName(song));
  const titleScore =
    resultTitle === wantedTitle
      ? 2
      : resultTitle.includes(wantedTitle) || wantedTitle.includes(resultTitle)
        ? 1
        : 0;
  const artistScore =
    resultArtist === wantedArtist
      ? 2
      : resultArtist.includes(wantedArtist) || wantedArtist.includes(resultArtist)
        ? 1
        : 0;
  return titleScore + artistScore;
}

function parseKey(value: string | undefined) {
  const compact = value?.trim().replace("♯", "#").replace("♭", "b");
  if (!compact) return null;
  const match = /^([A-G](?:#|b)?)(?:\s*(major|minor|maj|min)|\s*(m))?$/i.exec(compact);
  if (!match) return null;

  const note = match[1].charAt(0).toUpperCase() + match[1].slice(1);
  const flats: Record<string, string> = {
    Db: "C#",
    Eb: "D#",
    Gb: "F#",
    Ab: "G#",
    Bb: "A#",
  };
  const key = flats[note] ?? note;
  const mode =
    match[2]?.toLowerCase().startsWith("min") || Boolean(match[3]) ? "minor" : "major";
  return { key, mode } as const;
}

export async function lookupGetSongBpmFeatures(
  title: string,
  artist: string,
): Promise<CatalogTrackFeatures | null> {
  const apiKey = process.env.GETSONGBPM_API_KEY;
  if (!apiKey) throw new Error("GetSongBPM is not configured yet.");

  const lookup = `song:${title} artist:${artist}`;
  const params = new URLSearchParams({ type: "both", lookup, limit: "5" });
  const response = await fetch(`${GETSONGBPM_API_URL}?${params}`, {
    headers: { "X-API-KEY": apiKey },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("GetSongBPM is temporarily unavailable.");

  const payload = (await response.json()) as GetSongBpmSearchResponse;
  if (payload.error) throw new Error(payload.error);
  const matches: GetSongBpmSong[] = Array.isArray(payload.search)
    ? payload.search.filter(isGetSongBpmSong)
    : isGetSongBpmSong(payload.search)
      ? [payload.search]
      : [];
  const bestMatch = matches
    .map((song) => ({ song, score: matchScore(song, title, artist) }))
    .sort((a, b) => b.score - a.score)[0];
  if (!bestMatch || bestMatch.score < 3) return null;

  const bpm = Number(bestMatch.song.tempo);
  const parsedKey = parseKey(bestMatch.song.key_of);
  if (!Number.isFinite(bpm) || bpm <= 0 || !parsedKey) return null;

  return {
    bpm,
    key: parsedKey.key,
    mode: parsedKey.mode,
    camelot: toCamelot(parsedKey.key, parsedKey.mode),
    danceability:
      typeof bestMatch.song.danceability === "number"
        ? Math.min(1, Math.max(0, bestMatch.song.danceability / 100))
        : undefined,
    confidence: bestMatch.score === 4 ? 0.9 : 0.7,
    source: "catalog",
  };
}
