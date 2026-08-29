"use client";

import { useState, useSyncExternalStore } from "react";
import CatalogSearch from "@/components/features/CatalogSearch";
import CompareWorkspace from "@/components/features/CompareWorkspace";
import LibrarySection from "@/components/features/LibrarySection";
import MixResults from "@/components/features/MixResults";
import PlaylistPlanner from "@/components/features/PlaylistPlanner";
import Icon from "@/components/ui/Icon";
import { detectKey, detectTempo } from "@/lib/audioAnalysis";
import { camelotCompatibility, toCamelot } from "@/lib/camelot";
import { decodeAudioFile } from "@/lib/decodeAudio";
import { downloadComparisons, parseImportedComparisons } from "@/lib/libraryExport";
import { comparisonsStore, playlistsStore, tracksStore } from "@/lib/localData";
import type { CatalogTrack } from "@/lib/catalog";
import type {
  PlaylistProject,
  SavedComparison,
  SavedTrack,
  TrackResult,
} from "@/lib/types";

export default function HomePage() {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [resultA, setResultA] = useState<TrackResult | null>(null);
  const [resultB, setResultB] = useState<TrackResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tracksSaved, setTracksSaved] = useState(false);
  const [showCorrections, setShowCorrections] = useState(false);
  const [showSaveDetails, setShowSaveDetails] = useState(false);
  const [draftTags, setDraftTags] = useState("");
  const [draftNote, setDraftNote] = useState("");
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

  const resetComparisonState = () => {
    setResultA(null);
    setResultB(null);
    setError(null);
    setCopied(false);
    setSaved(false);
    setTracksSaved(false);
    setShowCorrections(false);
    setShowSaveDetails(false);
  };
  const updateLibrary = (next: SavedComparison[]) => {
    try {
      comparisonsStore.write(next);
    } catch {
      setError("Your browser couldn’t save the comparison locally.");
    }
  };
  const updateTracks = (next: SavedTrack[]) => {
    try {
      tracksStore.write(next);
    } catch {
      setError("Your browser couldn’t save the tracks locally.");
    }
  };
  const updatePlaylists = (next: PlaylistProject[]) => {
    try {
      playlistsStore.write(next);
    } catch {
      setError("Your browser couldn’t save the playlist locally.");
    }
  };
  const updateFile = (track: "A" | "B", file: File | null) => {
    if (track === "A") setFileA(file);
    else setFileB(file);
    resetComparisonState();
  };
  const reset = () => {
    setFileA(null);
    setFileB(null);
    resetComparisonState();
  };
  const swap = () => {
    const nextA = fileB;
    setFileB(fileA);
    setFileA(nextA);
    resetComparisonState();
  };
  const analyze = async () => {
    if (!fileA || !fileB) return;
    setAnalyzing(true);
    resetComparisonState();
    setDraftTags("");
    setDraftNote("");
    try {
      const [a, b] = await Promise.all([
        decodeAudioFile(fileA),
        decodeAudioFile(fileB),
      ]);
      const resultFor = (
        file: File,
        audio: Awaited<ReturnType<typeof decodeAudioFile>>,
      ): TrackResult => {
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
      };
      setResultA(resultFor(fileA, a));
      setResultB(resultFor(fileB, b));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "We couldn’t read one of those files. Try a different audio file.",
      );
    } finally {
      setAnalyzing(false);
    }
  };
  const correctResult = (track: "A" | "B", patch: Partial<TrackResult>) => {
    const update = (result: TrackResult | null) =>
      result
        ? {
            ...result,
            ...patch,
            camelot: toCamelot(
              patch.key ?? result.key,
              (patch.mode ?? result.mode) as "major" | "minor",
            ),
            manuallyVerified: true,
          }
        : null;
    if (track === "A") setResultA(update);
    else setResultB(update);
    setSaved(false);
    setTracksSaved(false);
  };
  const copySummary = async () => {
    if (!resultA || !resultB) return;
    const compatibility = camelotCompatibility(resultA.camelot, resultB.camelot);
    try {
      await navigator.clipboard.writeText(
        `Keychain mix check\n${resultA.fileName}: ${resultA.bpm.toFixed(1)} BPM · ${resultA.key} ${resultA.mode} (${resultA.camelot})\n${resultB.fileName}: ${resultB.bpm.toFixed(1)} BPM · ${resultB.key} ${resultB.mode} (${resultB.camelot})\n${compatibility.reason}`,
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Couldn’t copy the report. Select the results manually instead.");
    }
  };
  const saveComparison = () => {
    if (!resultA || !resultB || saved) return;
    const compatibility = camelotCompatibility(resultA.camelot, resultB.camelot);
    const tags = [
      ...new Set(
        draftTags
          .split(",")
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean),
      ),
    ].slice(0, 8);
    updateLibrary(
      [
        {
          id: crypto.randomUUID(),
          savedAt: new Date().toISOString(),
          trackA: resultA,
          trackB: resultB,
          compatible: compatibility.compatible,
          reason: compatibility.reason,
          tags,
          note: draftNote.trim(),
        },
        ...library,
      ].slice(0, 30),
    );
    setSaved(true);
    setShowSaveDetails(false);
  };
  const saveTracks = () => {
    if (!resultA || !resultB || tracksSaved) return;
    const signature = (track: TrackResult) =>
      [track.fileName, track.bpm, track.key, track.mode].join("|");
    const existing = new Set(tracks.map((item) => signature(item.track)));
    const additions = [resultA, resultB]
      .filter((track) => !existing.has(signature(track)))
      .map((track) => ({
        id: crypto.randomUUID(),
        savedAt: new Date().toISOString(),
        track,
      }));
    updateTracks([...additions, ...tracks].slice(0, 100));
    setTracksSaved(true);
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
  const addCatalogTrack = (catalog: CatalogTrack) => {
    const sourceKey = `${catalog.source}:${catalog.sourceId}`;
    if (
      tracks.some(
        (item) =>
          item.catalog &&
          `${item.catalog.source}:${item.catalog.sourceId}` === sourceKey,
      )
    )
      return;
    updateTracks(
      [
        {
          id: crypto.randomUUID(),
          savedAt: new Date().toISOString(),
          catalog,
          track: {
            fileName: catalog.title,
            bpm: 0,
            key: "?",
            mode: "",
            camelot: "?",
            keyConfidence: 0,
            duration: catalog.duration ?? 0,
          },
        },
        ...tracks,
      ].slice(0, 100),
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
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#top" aria-label="Keychain home">
            <span className="brand-mark">
              <Icon name="music" />
            </span>
            <span>Keychain</span>
          </a>
          <span className="header-note">
            <Icon name="lock" /> Analysis stays on your device
          </span>
        </div>
      </header>
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
            Drop in two tracks to check their tempo, key, and harmonic compatibility.
            Plan a dinner, drive, workout, party, or DJ set with more confidence.
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
        <CompareWorkspace
          fileA={fileA}
          fileB={fileB}
          analyzing={analyzing}
          error={error}
          onFileA={(file) => updateFile("A", file)}
          onFileB={(file) => updateFile("B", file)}
          onReset={reset}
          onSwap={swap}
          onAnalyze={() => void analyze()}
        />
        {resultA && resultB && (
          <MixResults
            resultA={resultA}
            resultB={resultB}
            copied={copied}
            saved={saved}
            showCorrections={showCorrections}
            showSaveDetails={showSaveDetails}
            draftTags={draftTags}
            draftNote={draftNote}
            onToggleCorrections={() => setShowCorrections(!showCorrections)}
            onToggleSaveDetails={() => setShowSaveDetails(!showSaveDetails)}
            onTagsChange={setDraftTags}
            onNoteChange={setDraftNote}
            onSave={saveComparison}
            onCopy={() => void copySummary()}
            onCorrect={correctResult}
          />
        )}
        <LibrarySection
          library={library}
          tracks={tracks}
          resultA={resultA}
          resultB={resultB}
          tracksSaved={tracksSaved}
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
          onAddTracks={addTracksToCollection}
          onImport={(file) => void importLibrary(file)}
          onExport={(format) => {
            try {
              downloadComparisons(library, format);
            } catch {
              setError("Couldn’t create that export. Please try again.");
            }
          }}
          onSaveTracks={saveTracks}
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
              <h3>Upload locally</h3>
              <p>Your source files never leave your browser.</p>
            </article>
            <article>
              <span>02</span>
              <h3>Read the audio</h3>
              <p>Tempo and key are measured from the actual waveform.</p>
            </article>
            <article>
              <span>03</span>
              <h3>Make the call</h3>
              <p>Use Camelot compatibility and tempo range to plan the transition.</p>
            </article>
          </div>
        </section>
      </main>
      <footer>
        Keychain uses browser-based audio analysis. Results are a strong starting
        point—always trust your ears.
      </footer>
    </div>
  );
}
