import type { CatalogTrack } from "@/lib/catalog";

export default function CatalogSources({ track }: { track: CatalogTrack }) {
  if (!track.externalUrl && !track.artworkStoreUrl) return null;
  return (
    <details className="catalog-sources">
      <summary>Sources</summary>
      <div>
        {track.externalUrl && (
          <a href={track.externalUrl} target="_blank" rel="noreferrer">
            Last.fm
          </a>
        )}
        {track.artworkStoreUrl && (
          <a href={track.artworkStoreUrl} target="_blank" rel="noreferrer">
            Apple Music
          </a>
        )}
      </div>
    </details>
  );
}
