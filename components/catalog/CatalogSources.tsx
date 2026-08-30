import type { CatalogTrack } from "@/lib/catalog";

export default function CatalogSources({
  track,
  inline = false,
}: {
  track: CatalogTrack;
  inline?: boolean;
}) {
  if (!track.externalUrl && !track.artworkStoreUrl) return null;
  const links = (
    <>
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
    </>
  );
  if (inline) return <div className="catalog-source-links">{links}</div>;
  return (
    <details className="catalog-sources">
      <summary>Sources</summary>
      <div>{links}</div>
    </details>
  );
}
