import type { CatalogSearchResult, CatalogTrack } from "./types";

type LastFmImage = {
  "#text"?: string;
  size?: string;
};

type LastFmTrack = {
  name?: string;
  artist?: string;
  url?: string;
  mbid?: string;
  image?: LastFmImage[];
};

type LastFmSearchResponse = {
  results?: {
    trackmatches?: {
      track?: LastFmTrack[] | LastFmTrack;
    };
  };
  error?: number;
  message?: string;
};

type LastFmSimilarTrack = {
  name?: string;
  url?: string;
  mbid?: string;
  image?: LastFmImage[];
  artist?: { name?: string };
};

type LastFmSimilarResponse = {
  similartracks?: { track?: LastFmSimilarTrack[] | LastFmSimilarTrack };
  error?: number;
  message?: string;
};

const LASTFM_API_URL = "https://ws.audioscrobbler.com/2.0/";

function getArtwork(images: LastFmImage[] | undefined) {
  return [...(images ?? [])].reverse().find((image) => image["#text"]?.trim())?.[
    "#text"
  ];
}

function normalizeTrack(track: LastFmTrack): CatalogTrack | null {
  const title = track.name?.trim();
  const artist = track.artist?.trim();
  if (!title || !artist) return null;

  const sourceId = track.mbid?.trim() || track.url || `${artist}:${title}`;
  return {
    id: `lastfm:${sourceId}`,
    source: "lastfm",
    sourceId,
    title,
    artist,
    artworkUrl: getArtwork(track.image),
    externalUrl: track.url,
    tags: [],
  };
}

function normalizeSimilarTrack(track: LastFmSimilarTrack): CatalogTrack | null {
  return normalizeTrack({
    name: track.name,
    artist: track.artist?.name,
    url: track.url,
    mbid: track.mbid,
    image: track.image,
  });
}

function attribution(): CatalogSearchResult["attribution"] {
  return { label: "Data and artwork from Last.fm", url: "https://www.last.fm/" };
}

export async function searchLastFmTracks(
  query: string,
  artist?: string,
): Promise<CatalogSearchResult> {
  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) throw new Error("Last.fm is not configured yet.");

  const params = new URLSearchParams({
    method: "track.search",
    track: query,
    api_key: apiKey,
    format: "json",
    limit: "12",
  });
  if (artist?.trim()) params.set("artist", artist.trim());

  const response = await fetch(`${LASTFM_API_URL}?${params}`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Last.fm search is temporarily unavailable.");

  const payload = (await response.json()) as LastFmSearchResponse;
  if (payload.error) throw new Error(payload.message ?? "Last.fm search failed.");

  const matches = payload.results?.trackmatches?.track ?? [];
  const tracks = (Array.isArray(matches) ? matches : [matches])
    .map(normalizeTrack)
    .filter((track): track is CatalogTrack => Boolean(track));

  return {
    tracks,
    attribution: attribution(),
  };
}

export async function findLastFmSimilarTracks(
  title: string,
  artist: string,
): Promise<CatalogSearchResult> {
  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) throw new Error("Last.fm is not configured yet.");

  const params = new URLSearchParams({
    method: "track.getsimilar",
    track: title,
    artist,
    api_key: apiKey,
    format: "json",
    autocorrect: "1",
    limit: "12",
  });
  const response = await fetch(`${LASTFM_API_URL}?${params}`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Last.fm suggestions are temporarily unavailable.");

  const payload = (await response.json()) as LastFmSimilarResponse;
  if (payload.error) throw new Error(payload.message ?? "Last.fm suggestions failed.");
  const matches = payload.similartracks?.track ?? [];
  return {
    tracks: (Array.isArray(matches) ? matches : [matches])
      .map(normalizeSimilarTrack)
      .filter((track): track is CatalogTrack => Boolean(track)),
    attribution: attribution(),
  };
}
