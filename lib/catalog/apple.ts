export type AppleArtwork = {
  artworkUrl: string;
  storeUrl: string;
};

type AppleTrack = {
  trackName?: string;
  artistName?: string;
  artworkUrl100?: string;
  trackViewUrl?: string;
};

type AppleSearchResponse = {
  results?: AppleTrack[];
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function score(track: AppleTrack, title: string, artist: string) {
  const trackTitle = normalize(track.trackName ?? "");
  const trackArtist = normalize(track.artistName ?? "");
  const wantedTitle = normalize(title);
  const wantedArtist = normalize(artist);
  const titleScore = trackTitle === wantedTitle ? 2 : 0;
  const artistScore =
    trackArtist === wantedArtist
      ? 2
      : trackArtist.includes(wantedArtist) || wantedArtist.includes(trackArtist)
        ? 1
        : 0;
  return titleScore + artistScore;
}

export async function findAppleArtwork(
  title: string,
  artist: string,
): Promise<AppleArtwork | null> {
  const params = new URLSearchParams({
    term: `${artist} ${title}`,
    entity: "song",
    limit: "5",
  });
  const response = await fetch(`https://itunes.apple.com/search?${params}`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Apple Music is temporarily unavailable.");

  const payload = (await response.json()) as AppleSearchResponse;
  const bestMatch = [...(payload.results ?? [])]
    .map((track) => ({ track, score: score(track, title, artist) }))
    .sort((a, b) => b.score - a.score)[0];
  if (!bestMatch || bestMatch.score < 3) return null;
  const { artworkUrl100, trackViewUrl } = bestMatch.track;
  if (!artworkUrl100 || !trackViewUrl) return null;
  return {
    artworkUrl: artworkUrl100.replace(/\/100x100bb\.jpg$/, "/300x300bb.jpg"),
    storeUrl: trackViewUrl,
  };
}
