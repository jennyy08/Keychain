"use client";

import { useState, useSyncExternalStore } from "react";
import Header from "@/components/Header";
import CompareWorkspace from "@/components/features/CompareWorkspace";
import MixResults from "@/components/features/MixResults";
import SaveTracksStrip from "@/components/features/SaveTracksStrip";
import Icon from "@/components/ui/Icon";
import { detectKey, detectTempo } from "@/lib/audioAnalysis";
import { camelotCompatibility, toCamelot } from "@/lib/camelot";
import { decodeAudioFile } from "@/lib/decodeAudio";
import { comparisonsStore, tracksStore } from "@/lib/localData";
import type { SavedComparison, SavedTrack, TrackResult } from "@/lib/types";

export default function ComparePage() {
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
  const updateFile = (track: "A" | "B", file: File | null) => {
    if (track === "A") setFileA(file);
    else setFileB(file);
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

  return (
    <div className="app-shell">
      <Header />
      <main className="main-content">
        <section className="hero compare-hero">
          <p className="eyebrow">
            <Icon name="spark" /> Local audio comparison
          </p>
          <h1>
            Check the <em>connection</em> between two tracks.
          </h1>
          <p className="hero-copy">
            Upload two audio files to measure tempo and key, then get a practical
            transition starting point. Your files stay in this browser.
          </p>
        </section>
        <CompareWorkspace
          fileA={fileA}
          fileB={fileB}
          analyzing={analyzing}
          error={error}
          onFileA={(file) => updateFile("A", file)}
          onFileB={(file) => updateFile("B", file)}
          onReset={() => {
            setFileA(null);
            setFileB(null);
            resetComparisonState();
          }}
          onSwap={() => {
            const nextA = fileB;
            setFileB(fileA);
            setFileA(nextA);
            resetComparisonState();
          }}
          onAnalyze={() => void analyze()}
        />
        {resultA && resultB && (
          <>
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
            <SaveTracksStrip saved={tracksSaved} onSave={saveTracks} />
          </>
        )}
      </main>
      <footer>
        Keychain uses browser-based audio analysis. Results are a strong starting
        point—always trust your ears.
      </footer>
    </div>
  );
}
