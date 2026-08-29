import { findAppleArtwork } from "./apple";
import { findMusicBrainzArtwork } from "./musicbrainz";
import { findTheAudioDbArtwork } from "./theaudiodb";

const LASTFM_PLACEHOLDER_IMAGE = "2a96cbd8b46e442fc41c2b86b821562f";

export function hasUsableArtwork(url: string | undefined) {
  return Boolean(url?.trim() && !url.includes(LASTFM_PLACEHOLDER_IMAGE));
}

export type ResolvedArtwork = {
  artworkUrl: string;
  artworkStoreUrl?: string;
};

export async function resolveSearchArtwork(
  title: string,
  artist: string,
): Promise<ResolvedArtwork | null> {
  try {
    const artwork = await findAppleArtwork(title, artist);
    if (artwork) {
      return { artworkUrl: artwork.artworkUrl, artworkStoreUrl: artwork.storeUrl };
    }
  } catch {
    // TheAudioDB remains available when Apple Music has an outage.
  }
  try {
    const artwork = await findTheAudioDbArtwork(title, artist);
    if (artwork) return { artworkUrl: artwork };
  } catch {
    // A missing cover does not prevent a usable search result.
  }
  return null;
}

export async function resolveArtwork(title: string, artist: string) {
  const searchArtwork = await resolveSearchArtwork(title, artist);
  if (searchArtwork) return searchArtwork;
  const artworkUrl = await findMusicBrainzArtwork(title, artist);
  return artworkUrl ? { artworkUrl } : null;
}
