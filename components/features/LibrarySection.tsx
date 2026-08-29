import { useState } from "react";
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
  onUpdate,
  onAddTransitionData,
  onFindSimilar,
}: {
  item: SavedTrack;
  onDelete: () => void;
  onUpdate: (patch: Partial<SavedTrack>) => void;
  onAddTransitionData: (item: SavedTrack) => Promise<void>;
  onFindSimilar: (catalog: NonNullable<SavedTrack["catalog"]>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(item.note ?? "");
  const [addingTransitionData, setAddingTransitionData] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const date = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(item.savedAt));
  const { track } = item;
  const isCatalogTrack = Boolean(item.catalog);
  const title = item.catalog?.title ?? track.fileName;
  const artist = item.catalog?.artist;
  return (
    <article className="saved-track-card">
      <div>
        <p className="saved-date">{date}</p>
        <p className="saved-track-name" title={title}>
          {title}
        </p>
        {artist && <p className="catalog-track-artist">{artist}</p>}
        {isCatalogTrack && track.bpm <= 0 ? (
          <div className="catalog-track-data-action">
            <p className="catalog-track-status">
              Catalog track · no transition data yet
            </p>
            <button
              className="quiet-button"
              type="button"
              disabled={addingTransitionData}
              onClick={async () => {
                setAddingTransitionData(true);
                setTransitionError(null);
                try {
                  await onAddTransitionData(item);
                } catch (error) {
                  setTransitionError(
                    error instanceof Error
                      ? error.message
                      : "Couldn’t add transition data.",
                  );
                } finally {
                  setAddingTransitionData(false);
                }
              }}
            >
              {addingTransitionData ? "Checking…" : "Add transition data"}
            </button>
          </div>
        ) : (
          <div className="saved-track-metrics">
            <span>{track.bpm.toFixed(1)} BPM</span>
            <span>
              {track.key} {track.mode}
            </span>
            <b>{track.camelot}</b>
          </div>
        )}
        {transitionError && (
          <p className="catalog-track-error" role="alert">
            {transitionError}
          </p>
        )}
        <div className="track-details">
          {item.catalog && (
            <button
              className="track-note-button"
              type="button"
              onClick={() => onFindSimilar(item.catalog!)}
            >
              Find similar vibe
            </button>
          )}
          <button
            className={
              item.favorite
                ? "favorite-button favorite-button--active"
                : "favorite-button"
            }
            type="button"
            aria-pressed={item.favorite}
            onClick={() => onUpdate({ favorite: !item.favorite })}
          >
            {item.favorite ? "★ Favorite" : "☆ Favorite"}
          </button>
          <div className="rating-control" aria-label={`Rating for ${track.fileName}`}>
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                aria-label={`Rate ${rating} out of 5`}
                aria-pressed={item.rating === rating}
                className={
                  rating <= (item.rating ?? 0)
                    ? "rating-star rating-star--active"
                    : "rating-star"
                }
                onClick={() =>
                  onUpdate({ rating: item.rating === rating ? undefined : rating })
                }
              >
                ★
              </button>
            ))}
          </div>
          <button
            className="track-note-button"
            type="button"
            onClick={() => setEditing(!editing)}
          >
            {editing ? "Done" : item.note ? "Edit note" : "Add note"}
          </button>
        </div>
        {editing && (
          <form
            className="track-note-form"
            onSubmit={(event) => {
              event.preventDefault();
              onUpdate({ note: note.trim() || undefined });
              setEditing(false);
            }}
          >
            <label>
              <span className="sr-only">Personal note for {track.fileName}</span>
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Great opener, save for a drive…"
                maxLength={160}
              />
            </label>
            <button type="submit">Save note</button>
          </form>
        )}
        {item.note && !editing && <p className="track-note">{item.note}</p>}
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
  onUpdateTrack,
  onAddTransitionData,
  onFindSimilar,
  onAddTracks,
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
  onUpdateTrack: (id: string, patch: Partial<SavedTrack>) => void;
  onAddTransitionData: (item: SavedTrack) => Promise<void>;
  onFindSimilar: (catalog: NonNullable<SavedTrack["catalog"]>) => void;
  onAddTracks: (files: File[]) => Promise<string>;
  onImport: (file: File) => void;
  onExport: (format: "csv" | "json") => void;
  onSaveTracks: () => void;
}) {
  const [addingTracks, setAddingTracks] = useState(false);
  const [collectionMessage, setCollectionMessage] = useState<string | null>(null);
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
      <section className="track-collection" aria-labelledby="track-collection-title">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Your local collection</p>
            <h2 id="track-collection-title">Saved tracks</h2>
          </div>
          <span className="library-count">{tracks.length} tracks</span>
        </div>
        <div className="collection-upload-panel">
          <div>
            <p>Add music directly to your private collection.</p>
            <small>Keychain reads BPM, key, and duration on this device.</small>
            <small className="catalog-data-attribution">
              Catalog transition data from{" "}
              <a href="https://getsongbpm.com/" target="_blank" rel="noreferrer">
                GetSongBPM
              </a>
              .
            </small>
          </div>
          <label className="save-button collection-upload">
            {addingTracks ? "Analyzing tracks…" : "Add tracks"}
            <input
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
              multiple
              disabled={addingTracks}
              onChange={async (event) => {
                const input = event.currentTarget;
                const files = Array.from(input.files ?? []);
                input.value = "";
                if (!files.length) return;
                setAddingTracks(true);
                setCollectionMessage(await onAddTracks(files));
                setAddingTracks(false);
              }}
            />
          </label>
        </div>
        {collectionMessage && (
          <p className="collection-message" role="status">
            {collectionMessage}
          </p>
        )}
        {tracks.length ? (
          <div className="saved-track-list">
            {tracks.map((item) => (
              <SavedTrackCard
                key={item.id}
                item={item}
                onDelete={() => onDeleteTrack(item.id)}
                onUpdate={(patch) => onUpdateTrack(item.id, patch)}
                onAddTransitionData={onAddTransitionData}
                onFindSimilar={onFindSimilar}
              />
            ))}
          </div>
        ) : (
          <p className="empty-library">
            Add tracks here, or save tracks from a comparison above.
          </p>
        )}
      </section>
    </>
  );
}
