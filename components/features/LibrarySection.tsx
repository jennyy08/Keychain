import Icon from "@/components/ui/Icon";
import type { SavedComparison, SavedTrack, TrackResult } from "@/lib/types";

function SavedComparisonCard({
  item,
  onDelete,
}: {
  item: SavedComparison;
  onDelete: () => void;
}) {
  const date = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(item.savedAt));
  return (
    <article className="saved-card">
      <div>
        <p className="saved-date">{date}</p>
        <p className="saved-names">
          {item.trackA.fileName} <span>→</span> {item.trackB.fileName}
        </p>
        <p
          className={
            item.compatible ? "saved-status saved-status--good" : "saved-status"
          }
        >
          {item.reason}
        </p>
        {item.note && <p className="saved-note">{item.note}</p>}
        {item.tags?.length ? (
          <div className="saved-tags">
            {item.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        ) : null}
        <div className="saved-metrics">
          <span>
            {item.trackA.bpm.toFixed(1)} BPM · {item.trackA.camelot}
          </span>
          <span>
            {item.trackB.bpm.toFixed(1)} BPM · {item.trackB.camelot}
          </span>
        </div>
      </div>
      <button
        className="icon-button"
        type="button"
        aria-label="Remove saved comparison"
        onClick={onDelete}
      >
        <Icon name="close" />
      </button>
    </article>
  );
}
function SavedTrackCard({
  item,
  onDelete,
}: {
  item: SavedTrack;
  onDelete: () => void;
}) {
  const date = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(item.savedAt));
  const { track } = item;
  return (
    <article className="saved-track-card">
      <div>
        <p className="saved-date">{date}</p>
        <p className="saved-track-name" title={track.fileName}>
          {track.fileName}
        </p>
        <div className="saved-track-metrics">
          <span>{track.bpm.toFixed(1)} BPM</span>
          <span>
            {track.key} {track.mode}
          </span>
          <b>{track.camelot}</b>
        </div>
      </div>
      <button
        className="icon-button"
        type="button"
        aria-label={`Remove ${track.fileName} from collection`}
        onClick={onDelete}
      >
        <Icon name="close" />
      </button>
    </article>
  );
}

export default function LibrarySection({
  library,
  tracks,
  resultA,
  resultB,
  tracksSaved,
  query,
  filter,
  message,
  onQueryChange,
  onFilterChange,
  onDeleteComparison,
  onDeleteTrack,
  onImport,
  onExport,
  onSaveTracks,
}: {
  library: SavedComparison[];
  tracks: SavedTrack[];
  resultA: TrackResult | null;
  resultB: TrackResult | null;
  tracksSaved: boolean;
  query: string;
  filter: "all" | "compatible";
  message: string | null;
  onQueryChange: (value: string) => void;
  onFilterChange: (filter: "all" | "compatible") => void;
  onDeleteComparison: (id: string) => void;
  onDeleteTrack: (id: string) => void;
  onImport: (file: File) => void;
  onExport: (format: "csv" | "json") => void;
  onSaveTracks: () => void;
}) {
  const visible = library.filter(
    (item) =>
      [
        item.trackA.fileName,
        item.trackB.fileName,
        item.trackA.camelot,
        item.trackB.camelot,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query.trim().toLowerCase()) &&
      (filter === "all" || item.compatible),
  );
  return (
    <>
      {library.length > 0 && (
        <section className="library" aria-labelledby="library-title">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Your local library</p>
              <h2 id="library-title">Saved comparisons</h2>
            </div>
            <div className="library-heading-actions">
              <span className="library-count">{library.length} saved</span>
              <div className="export-actions">
                <label className="quiet-button file-import">
                  Import JSON
                  <input
                    type="file"
                    accept="application/json,.json"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) onImport(file);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                <button
                  className="quiet-button"
                  type="button"
                  onClick={() => onExport("csv")}
                >
                  Export CSV
                </button>
                <button
                  className="quiet-button"
                  type="button"
                  onClick={() => onExport("json")}
                >
                  Backup JSON
                </button>
              </div>
            </div>
          </div>
          {message && (
            <p className="library-message" role="status">
              {message}
            </p>
          )}
          <div className="library-tools">
            <label className="library-search">
              <span className="sr-only">Search saved comparisons</span>
              <input
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Search track or Camelot key"
              />
            </label>
            <div className="library-filters" aria-label="Comparison filters">
              <button
                type="button"
                className={
                  filter === "all"
                    ? "filter-button filter-button--active"
                    : "filter-button"
                }
                onClick={() => onFilterChange("all")}
              >
                All
              </button>
              <button
                type="button"
                className={
                  filter === "compatible"
                    ? "filter-button filter-button--active"
                    : "filter-button"
                }
                onClick={() => onFilterChange("compatible")}
              >
                Good matches
              </button>
            </div>
          </div>
          {visible.length ? (
            <div className="saved-list">
              {visible.map((item) => (
                <SavedComparisonCard
                  key={item.id}
                  item={item}
                  onDelete={() => onDeleteComparison(item.id)}
                />
              ))}
            </div>
          ) : (
            <p className="empty-library">No saved comparisons match that search.</p>
          )}
        </section>
      )}
      {resultA && resultB && (
        <section className="track-save-strip">
          <div>
            <p className="section-kicker">Build your collection</p>
            <p>Save these individual tracks to use in future recommendations.</p>
          </div>
          <button
            className="save-button"
            type="button"
            disabled={tracksSaved}
            onClick={onSaveTracks}
          >
            {tracksSaved ? "Tracks saved" : "Save both tracks"}
          </button>
        </section>
      )}
      {tracks.length > 0 && (
        <section className="track-collection" aria-labelledby="track-collection-title">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Your local collection</p>
              <h2 id="track-collection-title">Saved tracks</h2>
            </div>
            <span className="library-count">{tracks.length} tracks</span>
          </div>
          <div className="saved-track-list">
            {tracks.map((item) => (
              <SavedTrackCard
                key={item.id}
                item={item}
                onDelete={() => onDeleteTrack(item.id)}
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
