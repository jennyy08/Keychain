"use client";

import { useState, useSyncExternalStore } from "react";
import CatalogSearch from "@/components/features/CatalogSearch";
import LibrarySection from "@/components/features/LibrarySection";
import PlaylistPlanner from "@/components/features/PlaylistPlanner";
import SimilarRecommendations from "@/components/features/SimilarRecommendations";
import Header from "@/components/Header";
import Icon from "@/components/ui/Icon";
import { detectKey, detectTempo } from "@/lib/audioAnalysis";
import { toCamelot } from "@/lib/camelot";
import { decodeAudioFile } from "@/lib/decodeAudio";
import { downloadComparisons, parseImportedComparisons } from "@/lib/libraryExport";
import { comparisonsStore, playlistsStore, tracksStore } from "@/lib/localData";
import type { CatalogTrack, CatalogTrackFeatures } from "@/lib/catalog";
import type {
  PlaylistProject,
  SavedComparison,
  SavedTrack,
  TrackResult,
} from "@/lib/types";

export default function HomePage() {
  const [libraryQuery, setLibraryQuery] = useState("");
  const [libraryFilter, setLibraryFilter] = useState<"all" | "compatible">("all");
  const [libraryMessage, setLibraryMessage] = useState<string | null>(null);
  const [playlistDraft, setPlaylistDraft] = useState({
    name: "",
    occasion: "",
    context: "Focus",
    mood: "Steady",
    duration: 90,
    startEnergy: "Easy",
    endEnergy: "Lift",
  });
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [similarSeed, setSimilarSeed] = useState<CatalogTrack | null>(null);
  const library = useSyncExternalStore(
    comparisonsStore.subscribe,
    comparisonsStore.read,
    comparisonsStore.readServer,
  );
  const tracks = useSyncExternalStore(
    tracksStore.subscribe,
    tracksStore.read,
    tracksStore.readServer,
  );
  const playlists = useSyncExternalStore(
    playlistsStore.subscribe,
    playlistsStore.read,
    playlistsStore.readServer,
  );

  const updateLibrary = (next: SavedComparison[]) => {
    try {
      comparisonsStore.write(next);
    } catch {
      setLibraryMessage("Your browser couldn’t save the comparison locally.");
    }
  };
  const updateTracks = (next: SavedTrack[]) => {
    try {
      tracksStore.write(next);
    } catch {
      setLibraryMessage("Your browser couldn’t save the tracks locally.");
    }
  };
  const updatePlaylists = (next: PlaylistProject[]) => {
    try {
      playlistsStore.write(next);
    } catch {
      setLibraryMessage("Your browser couldn’t save the playlist locally.");
    }
  };
  const addTracksToCollection = async (files: File[]) => {
    const audioFiles = files.filter(
      (file) =>
        file.type.startsWith("audio/") ||
        /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(file.name),
    );
    if (!audioFiles.length) return "Choose one or more audio files to add.";

    const analyzed = await Promise.allSettled(
      audioFiles.map(async (file): Promise<TrackResult> => {
        const audio = await decodeAudioFile(file);
        const tempo = detectTempo(audio.samples, audio.sampleRate);
        const key = detectKey(audio.samples, audio.sampleRate);
        return {
          fileName: file.name,
          bpm: tempo.bpm,
          tempoConfidence: tempo.confidence,
          key: key.key,
          mode: key.mode,
          camelot: toCamelot(key.key, key.mode),
          keyConfidence: key.confidence,
          duration: audio.duration,
        };
      }),
    );
    const successful = analyzed
      .filter(
        (result): result is PromiseFulfilledResult<TrackResult> =>
          result.status === "fulfilled",
      )
      .map((result) => result.value);
    const signature = (track: TrackResult) =>
      [track.fileName, track.bpm, track.key, track.mode].join("|");
    const existing = new Set(tracks.map((item) => signature(item.track)));
    const additions = successful
      .filter((track) => {
        const key = signature(track);
        if (existing.has(key)) return false;
        existing.add(key);
        return true;
      })
      .map((track) => ({
        id: crypto.randomUUID(),
        savedAt: new Date().toISOString(),
        track,
      }));
    if (additions.length) updateTracks([...additions, ...tracks].slice(0, 100));
    const failures = analyzed.length - successful.length;
    const skipped = successful.length - additions.length;
    return `${additions.length ? `Added ${additions.length} track${additions.length === 1 ? "" : "s"}.` : "No new tracks added."}${skipped ? ` ${skipped} already saved.` : ""}${failures ? ` ${failures} file${failures === 1 ? "" : "s"} couldn’t be analyzed.` : ""}`;
  };
  const addCatalogTrack = async (catalog: CatalogTrack) => {
    const sourceKey = `${catalog.source}:${catalog.sourceId}`;
    if (
      tracks.some(
        (item) =>
          item.catalog &&
          `${item.catalog.source}:${item.catalog.sourceId}` === sourceKey,
      )
    )
      return;
    let catalogWithArtwork = catalog;
    if (!catalog.artworkUrl) {
      try {
        const response = await fetch("/api/catalog/artwork", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: catalog.title, artist: catalog.artist }),
        });
        const payload = (await response.json()) as {
          artworkUrl?: string;
          artworkStoreUrl?: string;
        };
        if (response.ok && payload.artworkUrl) {
          catalogWithArtwork = {
            ...catalog,
            artworkUrl: payload.artworkUrl,
            artworkStoreUrl: payload.artworkStoreUrl,
          };
        }
      } catch {
        // Artwork is optional; a failed fallback must not prevent saving a track.
      }
    }
    updateTracks(
      [
        {
          id: crypto.randomUUID(),
          savedAt: new Date().toISOString(),
          catalog: catalogWithArtwork,
          track: {
            fileName: catalogWithArtwork.title,
            bpm: 0,
            key: "?",
            mode: "",
            camelot: "?",
            keyConfidence: 0,
            duration: catalogWithArtwork.duration ?? 0,
          },
        },
        ...tracks,
      ].slice(0, 100),
    );
  };
  const addTransitionData = async (item: SavedTrack) => {
    if (!item.catalog) return;
    const response = await fetch("/api/catalog/features", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: item.catalog.title, artist: item.catalog.artist }),
    });
    const payload = (await response.json()) as {
      features?: CatalogTrackFeatures;
      error?: string;
    };
    if (!response.ok || !payload.features) {
      throw new Error(payload.error ?? "Couldn’t find transition data for this track.");
    }
    const { features } = payload;
    const { bpm, key, mode, camelot } = features;
    if (!bpm || !key || !mode || !camelot) {
      throw new Error("The catalog response did not include enough transition data.");
    }
    updateTracks(
      tracks.map((savedTrack) =>
        savedTrack.id === item.id
          ? {
              ...savedTrack,
              catalog: { ...savedTrack.catalog!, features },
              track: {
                ...savedTrack.track,
                bpm,
                key,
                mode,
                camelot,
                keyConfidence: features.confidence ?? 0,
              },
            }
          : savedTrack,
      ),
    );
  };
  const setManualTransitionData = (
    item: SavedTrack,
    { bpm, key, mode }: { bpm: number; key: string; mode: "major" | "minor" },
  ) => {
    const camelot = toCamelot(key, mode);
    updateTracks(
      tracks.map((savedTrack) =>
        savedTrack.id === item.id
          ? {
              ...savedTrack,
              catalog: savedTrack.catalog
                ? {
                    ...savedTrack.catalog,
                    features: {
                      ...savedTrack.catalog.features,
                      bpm,
                      key,
                      mode,
                      camelot,
                      confidence: 1,
                      source: "manual",
                    },
                  }
                : undefined,
              track: {
                ...savedTrack.track,
                bpm,
                key,
                mode,
                camelot,
                keyConfidence: 1,
                manuallyVerified: true,
              },
            }
          : savedTrack,
      ),
    );
  };
  const createPlaylist = () => {
    const name = playlistDraft.name.trim();
    if (!name) return;
    const project: PlaylistProject = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      name,
      occasion: playlistDraft.occasion.trim(),
      context: playlistDraft.context,
      mood: playlistDraft.mood,
      duration: Math.min(600, Math.max(15, playlistDraft.duration)),
      startEnergy: playlistDraft.startEnergy,
      endEnergy: playlistDraft.endEnergy,
      trackIds: [],
    };
    updatePlaylists([project, ...playlists].slice(0, 20));
    setActivePlaylistId(project.id);
    setPlaylistDraft({
      name: "",
      occasion: "",
      context: "Focus",
      mood: "Steady",
      duration: 90,
      startEnergy: "Easy",
      endEnergy: "Lift",
    });
  };
  const importLibrary = async (file: File) => {
    try {
      const imported = parseImportedComparisons(JSON.parse(await file.text()));
      if (!imported.length) {
        setLibraryMessage("No valid saved comparisons found in that JSON file.");
        return;
      }
      const unique = new Map<string, SavedComparison>();
      [...library, ...imported].forEach((item) => unique.set(item.id, item));
      updateLibrary(
        [...unique.values()]
          .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
          .slice(0, 30),
      );
      setLibraryMessage(
        `Imported ${imported.length} comparison${imported.length === 1 ? "" : "s"}.`,
      );
    } catch {
      setLibraryMessage("That file isn’t a valid Keychain JSON backup.");
    }
  };
  const setPlaylistTracks = (playlistId: string, trackIds: string[]) =>
    updatePlaylists(
      playlists.map((project) =>
        project.id === playlistId ? { ...project, trackIds } : project,
      ),
    );

  return (
    <div className="app-shell">
      <Header />
      <main id="top" className="main-content">
        <section className="hero">
          <p className="eyebrow">
            <Icon name="spark" /> Private music planner
          </p>
          <h1>
            Build a better flow
            <br />
            <em>before</em> you press play.
          </h1>
          <p className="hero-copy">
            Search for songs, save your starting points, and shape a playlist for a
            dinner, drive, workout, party, or DJ set.
          </p>
        </section>
        <CatalogSearch
          savedSourceIds={
            new Set(
              tracks.flatMap((item) =>
                item.catalog ? [`${item.catalog.source}:${item.catalog.sourceId}`] : [],
              ),
            )
          }
          onAdd={addCatalogTrack}
        />
        <SimilarRecommendations
          seed={similarSeed}
          savedSourceIds={
            new Set(
              tracks.flatMap((item) =>
                item.catalog ? [`${item.catalog.source}:${item.catalog.sourceId}`] : [],
              ),
            )
          }
          onAdd={addCatalogTrack}
          onClose={() => setSimilarSeed(null)}
        />
        <LibrarySection
          library={library}
          tracks={tracks}
          query={libraryQuery}
          filter={libraryFilter}
          message={libraryMessage}
          onQueryChange={setLibraryQuery}
          onFilterChange={setLibraryFilter}
          onDeleteComparison={(id) =>
            updateLibrary(library.filter((item) => item.id !== id))
          }
          onDeleteTrack={(id) => updateTracks(tracks.filter((item) => item.id !== id))}
          onUpdateTrack={(id, patch) =>
            updateTracks(
              tracks.map((item) => (item.id === id ? { ...item, ...patch } : item)),
            )
          }
          onAddTransitionData={addTransitionData}
          onSetManualTransitionData={setManualTransitionData}
          onFindSimilar={setSimilarSeed}
          onAddTracks={addTracksToCollection}
          onImport={(file) => void importLibrary(file)}
          onExport={(format) => {
            try {
              downloadComparisons(library, format);
            } catch {
              setLibraryMessage("Couldn’t create that export. Please try again.");
            }
          }}
        />
        <PlaylistPlanner
          playlists={playlists}
          tracks={tracks}
          activePlaylistId={activePlaylistId}
          draft={playlistDraft}
          onDraftChange={(field, value) =>
            setPlaylistDraft((current) => ({ ...current, [field]: value }))
          }
          onCreate={createPlaylist}
          onOpen={setActivePlaylistId}
          onDelete={(id) => {
            updatePlaylists(playlists.filter((project) => project.id !== id));
            if (activePlaylistId === id) setActivePlaylistId(null);
          }}
          onSetTracks={setPlaylistTracks}
        />
        <section className="how-it-works">
          <p className="section-kicker">How it works</p>
          <div>
            <article>
              <span>01</span>
              <h3>Find starting points</h3>
              <p>Search the catalog for songs, artists, and ideas worth keeping.</p>
            </article>
            <article>
              <span>02</span>
              <h3>Build your collection</h3>
              <p>Save tracks, fill in BPM and key, and explore related directions.</p>
            </article>
            <article>
              <span>03</span>
              <h3>Shape the flow</h3>
              <p>
                Arrange a playlist around the feeling and energy you want to create.
              </p>
            </article>
          </div>
        </section>
      </main>
      <footer>
        Saved tracks and playlists stay in this browser. Transition data is a useful
        starting point—always trust your ears.
      </footer>
    </div>
  );
}
