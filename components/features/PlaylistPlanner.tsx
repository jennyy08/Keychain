import { Fragment } from "react";
import Icon from "@/components/ui/Icon";
import { camelotCompatibility, tempoAdjustment } from "@/lib/camelot";
import type { PlaylistProject, SavedTrack } from "@/lib/types";

type TrackSuggestion = {
  item: SavedTrack;
  detail: string;
  score: number;
};

function trackName(item: SavedTrack) {
  return item.catalog
    ? `${item.catalog.title} — ${item.catalog.artist}`
    : item.track.fileName;
}

function hasTransitionData(item: SavedTrack) {
  return item.track.bpm > 0 && item.track.camelot !== "?";
}

function PlaylistCard({
  project,
  selected,
  onOpen,
  onDelete,
}: {
  project: PlaylistProject;
  selected: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <article
      className={selected ? "playlist-card playlist-card--selected" : "playlist-card"}
    >
      <div>
        <p className="saved-date">
          {(project.context ?? project.occasion) || "Personal playlist"}
          {project.mood ? ` · ${project.mood}` : ""}
        </p>
        <h3>{project.name}</h3>
        <p>
          {project.trackIds?.length ?? 0} tracks · {project.duration} min ·{" "}
          {project.startEnergy} to {project.endEnergy}
        </p>
      </div>
      <div className="playlist-card-actions">
        <button className="quiet-button" type="button" onClick={onOpen}>
          {selected ? "Open" : "Edit"}
        </button>
        <button
          className="icon-button"
          type="button"
          onClick={onDelete}
          aria-label={`Remove ${project.name}`}
        >
          <Icon name="close" />
        </button>
      </div>
    </article>
  );
}

function TransitionCue({ from, to }: { from: SavedTrack; to: SavedTrack }) {
  if (!hasTransitionData(from) || !hasTransitionData(to)) {
    return (
      <li
        className="transition-cue"
        aria-label="Transition data is unavailable for one or both tracks"
      >
        <Icon name="alert" />
        <span>Transition data pending</span>
        <small>Add BPM and key data to score this pair</small>
      </li>
    );
  }
  const harmonic = camelotCompatibility(from.track.camelot, to.track.camelot);
  const tempo = tempoAdjustment(from.track.bpm, to.track.bpm);
  const tempoLabel =
    tempo.pctChangeNeeded === 0
      ? "same tempo"
      : `${tempo.pctChangeNeeded > 0 ? "speed up" : "slow down"} ${Math.abs(tempo.pctChangeNeeded)}%`;

  return (
    <li
      className={`transition-cue ${harmonic.compatible && tempo.withinComfortableRange ? "transition-cue--good" : ""}`}
      aria-label={`Transition cue: ${harmonic.reason}; ${tempoLabel}`}
    >
      <Icon name={harmonic.compatible ? "check" : "alert"} />
      <span>{harmonic.compatible ? "Harmonic match" : "Check transition"}</span>
      <small>{tempoLabel}</small>
    </li>
  );
}

function getSuggestions(
  availableTracks: SavedTrack[],
  currentTrack?: SavedTrack,
): TrackSuggestion[] {
  if (!currentTrack || !hasTransitionData(currentTrack)) {
    return availableTracks.slice(0, 3).map((item) => ({
      item,
      score: 0,
      detail: currentTrack ? "Transition data pending" : "A good place to begin",
    }));
  }

  return availableTracks
    .map((item) => {
      if (!hasTransitionData(item)) {
        return {
          item,
          score: (item.favorite ? 14 : 0) + (item.rating ?? 0) * 3,
          detail: "Transition data pending",
        };
      }
      const harmonic = camelotCompatibility(
        currentTrack.track.camelot,
        item.track.camelot,
      );
      const tempo = tempoAdjustment(currentTrack.track.bpm, item.track.bpm);
      const tempoScore = Math.max(0, 30 - Math.abs(tempo.pctChangeNeeded) * 3.75);
      const personalScore = (item.favorite ? 14 : 0) + (item.rating ?? 0) * 3;
      const score = (harmonic.compatible ? 70 : 0) + tempoScore + personalScore;
      const tempoDetail =
        tempo.pctChangeNeeded === 0
          ? "same tempo"
          : `${Math.abs(tempo.pctChangeNeeded)}% tempo change`;
      return {
        item,
        score,
        detail: harmonic.compatible ? `Harmonic match · ${tempoDetail}` : tempoDetail,
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score || a.item.track.fileName.localeCompare(b.item.track.fileName),
    )
    .slice(0, 3);
}

function formatRuntime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function PlaylistProgress({
  project,
  tracks,
}: {
  project: PlaylistProject;
  tracks: SavedTrack[];
}) {
  const duration = tracks.reduce((total, item) => total + item.track.duration, 0);
  const target = project.duration * 60;
  const difference = target - duration;
  const percent = Math.min(100, Math.round((duration / target) * 100));
  const status =
    difference > 30
      ? `${formatRuntime(difference)} left to reach your target`
      : difference < -30
        ? `${formatRuntime(Math.abs(difference))} over your target`
        : "Right on target";

  return (
    <div
      className="playlist-progress"
      aria-label={`Playlist runtime ${formatRuntime(duration)} of ${project.duration} minutes`}
    >
      <div className="playlist-progress-heading">
        <div>
          <span className="section-kicker">Playlist length</span>
          <strong>{formatRuntime(duration)}</strong>
          <small>of {project.duration}:00</small>
        </div>
        <p>{status}</p>
      </div>
      <div className="runtime-meter" aria-hidden="true">
        <i style={{ width: `${percent}%` }} />
      </div>
      <div className="playlist-arc">
        <span>Starts {project.startEnergy.toLowerCase()}</span>
        <i />
        <span>Ends {project.endEnergy.toLowerCase()}</span>
      </div>
    </div>
  );
}

export default function PlaylistPlanner({
  playlists,
  tracks,
  activePlaylistId,
  draft,
  onDraftChange,
  onCreate,
  onOpen,
  onDelete,
  onSetTracks,
}: {
  playlists: PlaylistProject[];
  tracks: SavedTrack[];
  activePlaylistId: string | null;
  draft: {
    name: string;
    occasion: string;
    context: string;
    mood: string;
    duration: number;
    startEnergy: string;
    endEnergy: string;
  };
  onDraftChange: (
    field: keyof {
      name: string;
      occasion: string;
      context: string;
      mood: string;
      duration: number;
      startEnergy: string;
      endEnergy: string;
    },
    value: string | number,
  ) => void;
  onCreate: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onSetTracks: (playlistId: string, trackIds: string[]) => void;
}) {
  const activePlaylist =
    playlists.find((project) => project.id === activePlaylistId) ?? null;
  const activeTrackIds = activePlaylist?.trackIds ?? [];
  const activeTracks = activeTrackIds
    .map((id) => tracks.find((item) => item.id === id))
    .filter((item): item is SavedTrack => Boolean(item));
  const availableTracks = tracks.filter((item) => !activeTrackIds.includes(item.id));
  const suggestions = getSuggestions(availableTracks, activeTracks.at(-1));
  return (
    <section className="playlist-planner" aria-labelledby="playlist-planner-title">
      <div className="section-heading">
        <div>
          <p className="section-kicker">Playlist planner</p>
          <h2 id="playlist-planner-title">Start with the moment</h2>
        </div>
        <span className="library-count">{playlists.length} plans</span>
      </div>
      <p className="planner-intro">
        Choose the setting and feel first, then add tracks from your collection in the
        order you want to hear them.
      </p>
      <form
        className="playlist-form"
        onSubmit={(event) => {
          event.preventDefault();
          onCreate();
        }}
      >
        <label>
          Playlist name
          <input
            required
            value={draft.name}
            onChange={(event) => onDraftChange("name", event.target.value)}
            placeholder="Friday rooftop"
            maxLength={60}
          />
        </label>
        <label>
          Listening context
          <select
            value={draft.context}
            onChange={(event) => onDraftChange("context", event.target.value)}
          >
            <option>Focus</option>
            <option>Dinner</option>
            <option>Drive</option>
            <option>Workout</option>
            <option>Party</option>
            <option>DJ set</option>
            <option>Custom</option>
          </select>
        </label>
        <label>
          Mood
          <select
            value={draft.mood}
            onChange={(event) => onDraftChange("mood", event.target.value)}
          >
            <option>Steady</option>
            <option>Calm</option>
            <option>Warm</option>
            <option>Upbeat</option>
            <option>High energy</option>
          </select>
        </label>
        <label>
          Optional detail
          <input
            value={draft.occasion}
            onChange={(event) => onDraftChange("occasion", event.target.value)}
            placeholder="Friday rooftop, long run…"
            maxLength={60}
          />
        </label>
        <label>
          Duration (minutes)
          <input
            type="number"
            min="15"
            max="600"
            value={draft.duration}
            onChange={(event) => onDraftChange("duration", Number(event.target.value))}
          />
        </label>
        <label>
          Start energy
          <select
            value={draft.startEnergy}
            onChange={(event) => onDraftChange("startEnergy", event.target.value)}
          >
            <option>Easy</option>
            <option>Warm</option>
            <option>High</option>
          </select>
        </label>
        <label>
          End energy
          <select
            value={draft.endEnergy}
            onChange={(event) => onDraftChange("endEnergy", event.target.value)}
          >
            <option>Easy</option>
            <option>Lift</option>
            <option>Peak</option>
          </select>
        </label>
        <button className="save-button" type="submit">
          Create plan
        </button>
      </form>
      {playlists.length > 0 && (
        <div className="playlist-list">
          {playlists.map((project) => (
            <PlaylistCard
              key={project.id}
              project={project}
              selected={project.id === activePlaylistId}
              onOpen={() => onOpen(project.id)}
              onDelete={() => onDelete(project.id)}
            />
          ))}
        </div>
      )}
      {activePlaylist && (
        <section className="playlist-editor" aria-labelledby="playlist-editor-title">
          <div>
            <p className="section-kicker">Editing playlist</p>
            <h3 id="playlist-editor-title">{activePlaylist.name}</h3>
            <p>
              Add tracks from your local collection, then use the arrows to arrange the
              running order.
            </p>
          </div>
          <PlaylistProgress project={activePlaylist} tracks={activeTracks} />
          <div className="playlist-editor-grid">
            <div>
              <h4>{activeTracks.length ? "Recommended next" : "Suggested starters"}</h4>
              {suggestions.length > 0 && (
                <div className="track-suggestions">
                  {suggestions.map(({ item, detail }) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() =>
                        onSetTracks(activePlaylist.id, [...activeTrackIds, item.id])
                      }
                    >
                      <span>{trackName(item)}</span>
                      <small>{detail}</small>
                      <b>+</b>
                    </button>
                  ))}
                </div>
              )}
              <h4 className="available-tracks-heading">All remaining tracks</h4>
              {tracks.length ? (
                <div className="available-tracks">
                  {availableTracks.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() =>
                        onSetTracks(activePlaylist.id, [...activeTrackIds, item.id])
                      }
                    >
                      <span>{trackName(item)}</span>
                      <small>
                        {hasTransitionData(item)
                          ? `${item.track.bpm.toFixed(1)} BPM · ${item.track.camelot}`
                          : "Catalog track"}
                      </small>
                      <b>+</b>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="planner-empty">
                  Save analyzed tracks to your collection first, then return here to
                  build a playlist.
                </p>
              )}
            </div>
            <div>
              <h4>
                Running order <span>{activeTracks.length} tracks</span>
              </h4>
              {activeTracks.length ? (
                <ol className="playlist-queue">
                  {activeTracks.map((item, index) => (
                    <Fragment key={item.id}>
                      {index > 0 && (
                        <TransitionCue from={activeTracks[index - 1]} to={item} />
                      )}
                      <li>
                        <span className="queue-number">{index + 1}</span>
                        <div>
                          <b>{trackName(item)}</b>
                          <small>
                            {hasTransitionData(item)
                              ? `${item.track.bpm.toFixed(1)} BPM · ${item.track.key} ${item.track.mode} · ${item.track.camelot}`
                              : "Catalog track · transition data pending"}
                          </small>
                        </div>
                        <div className="queue-actions">
                          <button
                            type="button"
                            disabled={index === 0}
                            aria-label="Move track up"
                            onClick={() => {
                              const next = [...activeTrackIds];
                              [next[index - 1], next[index]] = [
                                next[index],
                                next[index - 1],
                              ];
                              onSetTracks(activePlaylist.id, next);
                            }}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={index === activeTracks.length - 1}
                            aria-label="Move track down"
                            onClick={() => {
                              const next = [...activeTrackIds];
                              [next[index + 1], next[index]] = [
                                next[index],
                                next[index + 1],
                              ];
                              onSetTracks(activePlaylist.id, next);
                            }}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            aria-label="Remove track from playlist"
                            onClick={() =>
                              onSetTracks(
                                activePlaylist.id,
                                activeTrackIds.filter((id) => id !== item.id),
                              )
                            }
                          >
                            ×
                          </button>
                        </div>
                      </li>
                    </Fragment>
                  ))}
                </ol>
              ) : (
                <p className="planner-empty">No tracks added yet.</p>
              )}
            </div>
          </div>
        </section>
      )}
    </section>
  );
}
