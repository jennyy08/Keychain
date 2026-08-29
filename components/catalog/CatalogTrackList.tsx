import Image from "next/image";
import CatalogSources from "@/components/catalog/CatalogSources";
import type { CatalogTrack } from "@/lib/catalog";

export default function CatalogTrackList({
  tracks,
  savedSourceIds,
  onAdd,
}: {
  tracks: CatalogTrack[];
  savedSourceIds: Set<string>;
  onAdd: (track: CatalogTrack) => Promise<void>;
}) {
  return tracks.map((track) => {
    const saved = savedSourceIds.has(`${track.source}:${track.sourceId}`);
    return (
      <article className="catalog-result" key={track.id}>
        {track.artworkUrl ? (
          <Image src={track.artworkUrl} alt="" width={38} height={38} unoptimized />
        ) : (
          <span className="catalog-artwork-placeholder" aria-hidden="true">
            ♪
          </span>
        )}
        <div>
          <h3>{track.title}</h3>
          <p>{track.artist}</p>
        </div>
        <div className="catalog-result-actions">
          <CatalogSources track={track} />
          <button
            className="quiet-button"
            type="button"
            disabled={saved}
            onClick={() => void onAdd(track)}
          >
            {saved ? "In collection" : "Add"}
          </button>
        </div>
      </article>
    );
  });
}
