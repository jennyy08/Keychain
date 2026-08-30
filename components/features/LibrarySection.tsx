import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import CatalogSources from "@/components/catalog/CatalogSources";
import Icon from "@/components/ui/Icon";
import { toCamelot } from "@/lib/camelot";
import type { SavedComparison, SavedTrack, TrackResult } from "@/lib/types";

type ManualTransitionData = {
  bpm: number;
  key: string;
  mode: "major" | "minor";
};

const MUSICAL_KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

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

function TrackActionsMenu({
  title,
  catalog,
  track,
  rating,
  editingTransitionData,
  onFindSimilar,
  onEditTransitionData,
  onRate,
}: {
  title: string;
  catalog: SavedTrack["catalog"];
  track: TrackResult;
  rating?: number;
  editingTransitionData: boolean;
  onFindSimilar: () => void;
  onEditTransitionData: () => void;
  onRate: (rating: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="track-actions-menu" ref={menuRef}>
      <button
        type="button"
        className="track-actions-trigger"
        aria-label={`More actions for ${title}`}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        •••
      </button>
      {open && (
        <div>
          {catalog && (
            <button
              type="button"
              onClick={() => {
                onFindSimilar();
                setOpen(false);
              }}
            >
              Find similar vibe
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onEditTransitionData();
              setOpen(false);
            }}
          >
            {editingTransitionData
              ? "Cancel data edit"
              : track.bpm > 0
                ? "Correct BPM & key"
                : "Add data manually"}
          </button>
          <div className="rating-control" aria-label={`Rating for ${track.fileName}`}>
            <span>Rating</span>
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                aria-label={`Rate ${value} out of 5`}
                aria-pressed={rating === value}
                className={
                  value <= (rating ?? 0)
                    ? "rating-star rating-star--active"
                    : "rating-star"
                }
                onClick={() => onRate(value)}
              >
                ★
              </button>
            ))}
          </div>
          {catalog && <CatalogSources track={catalog} inline />}
        </div>
      )}
    </div>
  );
}

function SavedTrackCard({
  item,
  onDelete,
  onUpdate,
  onAddTransitionData,
  onSetManualTransitionData,
  onFindSimilar,
}: {
  item: SavedTrack;
  onDelete: () => void;
  onUpdate: (patch: Partial<SavedTrack>) => void;
  onAddTransitionData: (item: SavedTrack) => Promise<void>;
  onSetManualTransitionData: (item: SavedTrack, data: ManualTransitionData) => void;
  onFindSimilar: (catalog: NonNullable<SavedTrack["catalog"]>) => void;
}) {
  const [addingTransitionData, setAddingTransitionData] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [editingTransitionData, setEditingTransitionData] = useState(false);
  const [manualBpm, setManualBpm] = useState("");
  const [manualKey, setManualKey] = useState("C");
  const [manualMode, setManualMode] = useState<"major" | "minor">("major");
  const date = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(item.savedAt));
  const { track } = item;
  const isCatalogTrack = Boolean(item.catalog);
  const title = item.catalog?.title ?? track.fileName;
  const artist = item.catalog?.artist;
  const dataSource = item.catalog?.features?.source;
  const sourceLabel =
    dataSource === "manual"
      ? "Manual values"
      : dataSource === "catalog"
        ? "GetSongBPM match"
        : track.manuallyVerified
          ? "Manually verified"
          : "Analyzed on this device";
  const startEditingTransitionData = () => {
    setManualBpm(track.bpm > 0 ? String(track.bpm) : "");
    setManualKey(MUSICAL_KEYS.includes(track.key) ? track.key : "C");
    setManualMode(track.mode === "minor" ? "minor" : "major");
    setTransitionError(null);
    setEditingTransitionData(true);
  };
  return (
    <article className="saved-track-card">
      {item.catalog && item.catalog.artworkUrl && (
        <Image
          className="saved-track-artwork"
          src={item.catalog.artworkUrl}
          alt=""
          width={48}
          height={48}
          unoptimized
        />
      )}
      <div>
        <p className="saved-date">{date}</p>
        <p className="saved-track-name" title={title}>
          {title}
        </p>
        {artist && <p className="catalog-track-artist">{artist}</p>}
        <div className="track-data-row">
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
          <TrackActionsMenu
            title={title}
            catalog={item.catalog}
            track={track}
            rating={item.rating}
            editingTransitionData={editingTransitionData}
            onFindSimilar={() => item.catalog && onFindSimilar(item.catalog)}
            onEditTransitionData={() =>
              editingTransitionData
                ? setEditingTransitionData(false)
                : startEditingTransitionData()
            }
            onRate={(rating) =>
              onUpdate({ rating: item.rating === rating ? undefined : rating })
            }
          />
        </div>
        {track.bpm > 0 && <p className="transition-data-source">{sourceLabel}</p>}
        {transitionError && (
          <p className="catalog-track-error" role="alert">
            {transitionError}
          </p>
        )}
        {editingTransitionData && (
          <form
            className="transition-data-form"
            onSubmit={(event) => {
              event.preventDefault();
              const bpm = Number(manualBpm);
              if (!Number.isFinite(bpm) || bpm < 40 || bpm > 300) {
                setTransitionError("Enter a BPM between 40 and 300.");
                return;
              }
              onSetManualTransitionData(item, {
                bpm,
                key: manualKey,
                mode: manualMode,
              });
              setEditingTransitionData(false);
              setTransitionError(null);
            }}
          >
            <label>
              <span>BPM</span>
              <input
                type="number"
                min="40"
                max="300"
                step="0.1"
                value={manualBpm}
                onChange={(event) => setManualBpm(event.target.value)}
                required
              />
            </label>
            <label>
              <span>Key</span>
              <select
                value={manualKey}
                onChange={(event) => setManualKey(event.target.value)}
              >
                {MUSICAL_KEYS.map((key) => (
                  <option key={key}>{key}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Mode</span>
              <select
                value={manualMode}
                onChange={(event) =>
                  setManualMode(event.target.value as "major" | "minor")
                }
              >
                <option value="major">Major</option>
                <option value="minor">Minor</option>
              </select>
            </label>
            <output>{toCamelot(manualKey, manualMode)}</output>
            <button type="submit">Save data</button>
          </form>
        )}
      </div>
      <div className="saved-track-card-controls">
        <button
          className={
            item.favorite ? "favorite-icon favorite-icon--active" : "favorite-icon"
          }
          type="button"
          aria-label={item.favorite ? "Remove favorite" : "Add favorite"}
          aria-pressed={item.favorite}
          onClick={() => onUpdate({ favorite: !item.favorite })}
        >
          ★
        </button>
        <button
          className="icon-button"
          type="button"
          aria-label={`Remove ${track.fileName} from collection`}
          onClick={onDelete}
        >
          <Icon name="close" />
        </button>
      </div>
    </article>
  );
}

export default function LibrarySection({
  library,
  tracks,
  query,
  filter,
  message,
  onQueryChange,
  onFilterChange,
  onDeleteComparison,
  onDeleteTrack,
  onUpdateTrack,
  onAddTransitionData,
  onSetManualTransitionData,
  onFindSimilar,
  onAddTracks,
  onImport,
  onExport,
}: {
  library: SavedComparison[];
  tracks: SavedTrack[];
  query: string;
  filter: "all" | "compatible";
  message: string | null;
  onQueryChange: (value: string) => void;
  onFilterChange: (filter: "all" | "compatible") => void;
  onDeleteComparison: (id: string) => void;
  onDeleteTrack: (id: string) => void;
  onUpdateTrack: (id: string, patch: Partial<SavedTrack>) => void;
  onAddTransitionData: (item: SavedTrack) => Promise<void>;
  onSetManualTransitionData: (item: SavedTrack, data: ManualTransitionData) => void;
  onFindSimilar: (catalog: NonNullable<SavedTrack["catalog"]>) => void;
  onAddTracks: (files: File[]) => Promise<string>;
  onImport: (file: File) => void;
  onExport: (format: "csv" | "json") => void;
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
                onSetManualTransitionData={onSetManualTransitionData}
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
