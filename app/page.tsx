"use client";

import { useState } from "react";
import { decodeAudioFile } from "@/lib/decodeAudio";
import { detectTempo, detectKey } from "@/lib/audioAnalysis";
import { toCamelot, camelotCompatibility, tempoAdjustment } from "@/lib/camelot";

type TrackResult = {
  fileName: string;
  bpm: number;
  key: string;
  mode: string;
  camelot: string;
  keyConfidence: number;
  duration: number;
};

function TrackDropzone({
  label,
  file,
  onFile,
}: {
  label: string;
  file: File | null;
  onFile: (f: File) => void;
}) {
  return (
    <label className="block bg-panel border border-border rounded-xl p-6 cursor-pointer hover:border-accent transition-colors">
      <input
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      <p className="font-display text-sm uppercase tracking-wide text-accent mb-2">{label}</p>
      {file ? (
        <p className="text-text text-sm truncate">{file.name}</p>
      ) : (
        <p className="text-text-faint text-sm">Click to choose an audio file (mp3, wav)</p>
      )}
    </label>
  );
}

function ResultCard({ result }: { result: TrackResult }) {
  return (
    <div className="bg-panel border border-border rounded-xl p-5">
      <p className="text-text text-sm mb-3 truncate">{result.fileName}</p>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="tabular text-3xl text-accent font-semibold">{result.bpm.toFixed(1)}</span>
        <span className="text-text-faint text-sm">BPM</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-xl text-text font-display">{result.key} {result.mode}</span>
        <span className="text-text-faint text-sm">({result.camelot})</span>
      </div>
      <p className="text-xs text-text-faint mt-2">
        key confidence {(result.keyConfidence * 100).toFixed(0)}% · {result.duration.toFixed(0)}s
      </p>
    </div>
  );
}

export default function Home() {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [resultA, setResultA] = useState<TrackResult | null>(null);
  const [resultB, setResultB] = useState<TrackResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = async () => {
    if (!fileA || !fileB) return;
    setAnalyzing(true);
    setError(null);
    setResultA(null);
    setResultB(null);

    try {
      const [a, b] = await Promise.all([decodeAudioFile(fileA), decodeAudioFile(fileB)]);

      const tempoA = detectTempo(a.samples, a.sampleRate);
      const keyA = detectKey(a.samples, a.sampleRate);
      const camelotA = toCamelot(keyA.key, keyA.mode);

      const tempoB = detectTempo(b.samples, b.sampleRate);
      const keyB = detectKey(b.samples, b.sampleRate);
      const camelotB = toCamelot(keyB.key, keyB.mode);

      setResultA({
        fileName: fileA.name,
        bpm: tempoA.bpm,
        key: keyA.key,
        mode: keyA.mode,
        camelot: camelotA,
        keyConfidence: keyA.confidence,
        duration: a.duration,
      });
      setResultB({
        fileName: fileB.name,
        bpm: tempoB.bpm,
        key: keyB.key,
        mode: keyB.mode,
        camelot: camelotB,
        keyConfidence: keyB.confidence,
        duration: b.duration,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong decoding or analyzing the audio.");
    } finally {
      setAnalyzing(false);
    }
  };

  const compat = resultA && resultB ? camelotCompatibility(resultA.camelot, resultB.camelot) : null;
  const tempoAdj = resultA && resultB ? tempoAdjustment(resultA.bpm, resultB.bpm) : null;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border px-8 py-6">
        <h1 className="font-display text-3xl tracking-wide text-text">Keychain</h1>
        <p className="text-text-dim text-sm mt-1 max-w-xl">
          Upload two tracks. Tempo and musical key are detected from the actual audio
          (real signal processing — FFT, spectral flux, chroma analysis), entirely in
          your browser. Nothing is uploaded anywhere.
        </p>
      </header>

      <main className="max-w-4xl mx-auto px-8 py-10 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TrackDropzone label="Track A" file={fileA} onFile={setFileA} />
          <TrackDropzone label="Track B" file={fileB} onFile={setFileB} />
        </div>

        <button
          onClick={analyze}
          disabled={!fileA || !fileB || analyzing}
          className="w-full bg-accent text-bg font-display uppercase tracking-wide text-sm py-3 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-accent-dim transition-colors"
        >
          {analyzing ? "Analyzing…" : "Analyze & Compare"}
        </button>

        {error && (
          <div className="bg-panel border border-bad rounded-xl p-4 text-bad text-sm">{error}</div>
        )}

        {resultA && resultB && compat && tempoAdj && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ResultCard result={resultA} />
              <ResultCard result={resultB} />
            </div>

            <div
              className="rounded-xl p-5 border"
              style={{
                borderColor: compat.compatible ? "var(--color-good)" : "var(--color-bad)",
                background: "var(--color-panel-2)",
              }}
            >
              <p
                className="font-display uppercase tracking-wide text-sm mb-2"
                style={{ color: compat.compatible ? "var(--color-good)" : "var(--color-bad)" }}
              >
                {compat.compatible ? "Compatible mix" : "Risky mix"}
              </p>
              <p className="text-text-dim text-sm mb-3">{compat.reason}</p>
              <p className="text-text-dim text-sm">
                To match tempos, {tempoAdj.pctChangeNeeded > 0 ? "speed up" : "slow down"} Track B by{" "}
                <span className="tabular text-text">{Math.abs(tempoAdj.pctChangeNeeded)}%</span>
                {" — "}
                {tempoAdj.withinComfortableRange
                  ? "within a comfortable pitch-adjustment range."
                  : "outside the typical comfortable range (>8%), may sound unnatural."}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
