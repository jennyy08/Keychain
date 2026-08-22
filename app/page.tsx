"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { detectKey, detectTempo } from "@/lib/audioAnalysis";
import { camelotCompatibility, tempoAdjustment, toCamelot } from "@/lib/camelot";
import { decodeAudioFile } from "@/lib/decodeAudio";

type TrackResult = { fileName: string; bpm: number; tempoConfidence?: number; key: string; mode: string; camelot: string; keyConfidence: number; duration: number };
type SavedComparison = { id: string; savedAt: string; trackA: TrackResult; trackB: TrackResult; compatible: boolean; reason: string };
const AUDIO_EXTENSIONS = /\.(mp3|wav|m4a|aac|ogg|flac)$/i;
const LIBRARY_KEY = "keychain-comparisons-v1";
const EMPTY_LIBRARY: SavedComparison[] = [];
let cachedLibraryValue: string | null = null;
let cachedLibrary: SavedComparison[] = EMPTY_LIBRARY;

function readLibrary() {
  if (typeof window === "undefined") return EMPTY_LIBRARY;
  const value = window.localStorage.getItem(LIBRARY_KEY) ?? "[]";
  if (value === cachedLibraryValue) return cachedLibrary;
  try { cachedLibrary = JSON.parse(value) as SavedComparison[]; cachedLibraryValue = value; } catch { cachedLibrary = EMPTY_LIBRARY; cachedLibraryValue = value; }
  return cachedLibrary;
}
function subscribeToLibrary(onChange: () => void) {
  const notify = (event: Event) => { if (event.type !== "storage" || (event as StorageEvent).key === LIBRARY_KEY) onChange(); };
  window.addEventListener("storage", notify); window.addEventListener("keychain-library", notify);
  return () => { window.removeEventListener("storage", notify); window.removeEventListener("keychain-library", notify); };
}

function Icon({ name, className = "" }: { name: "music" | "upload" | "close" | "swap" | "lock" | "arrow" | "check" | "alert" | "spark"; className?: string }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths = {
    music: <><path {...p} d="M9 18V5l11-2v13"/><circle {...p} cx="6" cy="18" r="3"/><circle {...p} cx="17" cy="16" r="3"/></>,
    upload: <><path {...p} d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 15.5V20h14v-4.5"/></>,
    close: <path {...p} d="m7 7 10 10M17 7 7 17"/>, swap: <><path {...p} d="M7 7h11m0 0-3-3m3 3-3 3M17 17H6m0 0 3 3m-3-3 3-3"/></>,
    lock: <><rect {...p} x="5" y="10" width="14" height="10" rx="2"/><path {...p} d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
    arrow: <path {...p} d="M5 12h14m-5-5 5 5-5 5"/>, check: <path {...p} d="m5 12 4.2 4L19 6.5"/>,
    alert: <><path {...p} d="M12 4 3.8 19h16.4L12 4Z"/><path {...p} d="M12 9v4m0 3h.01"/></>,
    spark: <path {...p} d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z"/>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>{paths[name]}</svg>;
}
function formatFileSize(bytes: number) { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`; }
function formatDuration(seconds: number) { const total = Math.max(0, Math.round(seconds)); return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`; }
function isAudioFile(file: File) { return file.type.startsWith("audio/") || AUDIO_EXTENSIONS.test(file.name); }

function TrackSlot({ label, file, disabled, onFile, onClear }: { label: "A" | "B"; file: File | null; disabled: boolean; onFile: (f: File) => void; onClear: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const select = (candidate?: File) => { if (candidate && isAudioFile(candidate)) onFile(candidate); };
  return <section className={`track-slot ${dragging ? "track-slot--dragging" : ""} ${file ? "track-slot--selected" : ""}`} onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); if (!disabled) select(e.dataTransfer.files?.[0]); }}>
    <div className="slot-heading"><span className="slot-label">Track {label}</span>{file && <span className="ready-label"><Icon name="check" /> Ready</span>}</div>
    <input ref={inputRef} className="sr-only" type="file" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac" onChange={(e) => select(e.target.files?.[0])} />
    {file ? <div className="file-selected"><div className="file-icon"><Icon name="music" /></div><div className="file-copy"><p title={file.name}>{file.name}</p><span>{formatFileSize(file.size)}</span></div><button className="icon-button" type="button" onClick={onClear} disabled={disabled} aria-label={`Remove Track ${label}`}><Icon name="close" /></button></div> :
      <button className="drop-target" type="button" disabled={disabled} onClick={() => inputRef.current?.click()}><span className="upload-icon"><Icon name="upload" /></span><span>Drop an audio file here</span><small>or <u>browse your device</u></small></button>}
    <p className="slot-help">MP3, WAV, M4A, AAC, OGG, or FLAC</p>
  </section>;
}
function ResultCard({ result, label }: { result: TrackResult; label: "A" | "B" }) {
  const tempoConfidence = result.tempoConfidence ?? 0;
  return <article className="result-card"><div className="result-topline"><span>Track {label}</span><span>{formatDuration(result.duration)}</span></div><p className="result-name" title={result.fileName}>{result.fileName}</p><div className="metrics"><div><span className="metric-value">{result.bpm.toFixed(1)}</span><span className="metric-label">BPM</span></div><div className="key-metric"><span className="key-value">{result.key} <em>{result.mode}</em></span><span className="metric-label">Musical key</span></div><div className="camelot-badge"><span>{result.camelot}</span><small>Camelot</small></div></div><div className="confidence"><span>Tempo confidence</span><div><i style={{ width: `${Math.round(tempoConfidence * 100)}%` }} /></div><b>{Math.round(tempoConfidence * 100)}%</b></div><div className="confidence"><span>Key confidence</span><div><i style={{ width: `${Math.round(result.keyConfidence * 100)}%` }} /></div><b>{Math.round(result.keyConfidence * 100)}%</b></div></article>;
}
function SavedComparisonCard({ item, onDelete }: { item: SavedComparison; onDelete: () => void }) {
  return <article className="saved-card"><div><p className="saved-date">{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(item.savedAt))}</p><p className="saved-names">{item.trackA.fileName} <span>→</span> {item.trackB.fileName}</p><p className={item.compatible ? "saved-status saved-status--good" : "saved-status"}>{item.reason}</p><div className="saved-metrics"><span>{item.trackA.bpm.toFixed(1)} BPM · {item.trackA.camelot}</span><span>{item.trackB.bpm.toFixed(1)} BPM · {item.trackB.camelot}</span></div></div><button className="icon-button" type="button" aria-label="Remove saved comparison" onClick={onDelete}><Icon name="close" /></button></article>;
}

export default function Home() {
  const [fileA, setFileA] = useState<File | null>(null); const [fileB, setFileB] = useState<File | null>(null);
  const [resultA, setResultA] = useState<TrackResult | null>(null); const [resultB, setResultB] = useState<TrackResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false); const [error, setError] = useState<string | null>(null); const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const library = useSyncExternalStore(subscribeToLibrary, readLibrary, () => EMPTY_LIBRARY);
  const updateLibrary = (next: SavedComparison[]) => { try { window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(next)); window.dispatchEvent(new Event("keychain-library")); } catch { setError("Your browser couldn’t save the comparison locally."); } };
  const updateFile = (track: "A" | "B", file: File | null) => { if (track === "A") setFileA(file); else setFileB(file); setResultA(null); setResultB(null); setError(null); setCopied(false); setSaved(false); };
  const analyze = async () => {
    if (!fileA || !fileB) return; setAnalyzing(true); setError(null); setResultA(null); setResultB(null); setCopied(false); setSaved(false);
    try {
      const [a, b] = await Promise.all([decodeAudioFile(fileA), decodeAudioFile(fileB)]);
      const resultFor = (file: File, audio: Awaited<ReturnType<typeof decodeAudioFile>>): TrackResult => { const tempo = detectTempo(audio.samples, audio.sampleRate); const key = detectKey(audio.samples, audio.sampleRate); return { fileName: file.name, bpm: tempo.bpm, tempoConfidence: tempo.confidence, key: key.key, mode: key.mode, camelot: toCamelot(key.key, key.mode), keyConfidence: key.confidence, duration: audio.duration }; };
      setResultA(resultFor(fileA, a)); setResultB(resultFor(fileB, b));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "We couldn’t read one of those files. Try a different audio file."); } finally { setAnalyzing(false); }
  };
  const reset = () => { setFileA(null); setFileB(null); setResultA(null); setResultB(null); setError(null); setCopied(false); setSaved(false); };
  const swap = () => { const nextA = fileB; setFileB(fileA); setFileA(nextA); setResultA(null); setResultB(null); setError(null); setCopied(false); setSaved(false); };
  const compatibility = resultA && resultB ? camelotCompatibility(resultA.camelot, resultB.camelot) : null; const adjustment = resultA && resultB ? tempoAdjustment(resultA.bpm, resultB.bpm) : null;
  const copySummary = async () => { if (!resultA || !resultB) return; const c = camelotCompatibility(resultA.camelot, resultB.camelot); try { await navigator.clipboard.writeText(`Keychain mix check\n${resultA.fileName}: ${resultA.bpm.toFixed(1)} BPM · ${resultA.key} ${resultA.mode} (${resultA.camelot})\n${resultB.fileName}: ${resultB.bpm.toFixed(1)} BPM · ${resultB.key} ${resultB.mode} (${resultB.camelot})\n${c.reason}`); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { setError("Couldn’t copy the report. Select the results manually instead."); } };
  const saveComparison = () => { if (!resultA || !resultB || !compatibility || saved) return; const item: SavedComparison = { id: crypto.randomUUID(), savedAt: new Date().toISOString(), trackA: resultA, trackB: resultB, compatible: compatibility.compatible, reason: compatibility.reason }; updateLibrary([item, ...library].slice(0, 30)); setSaved(true); };
  const deleteComparison = (id: string) => updateLibrary(library.filter((item) => item.id !== id));
  return <div className="app-shell"><header className="site-header"><div className="header-inner"><a className="brand" href="#top" aria-label="Keychain home"><span className="brand-mark"><Icon name="music" /></span><span>Keychain</span></a><span className="header-note"><Icon name="lock" /> Analysis stays on your device</span></div></header><main id="top" className="main-content">
    <section className="hero"><p className="eyebrow"><Icon name="spark" /> Harmonic mixing assistant</p><h1>Know what works<br /><em>before</em> you mix.</h1><p className="hero-copy">Drop in two tracks to check their tempo, key, and harmonic compatibility. Built for quick, confident decisions in the booth.</p></section>
    <section className="workspace" aria-labelledby="compare-title"><div className="section-heading"><div><p className="section-kicker">01 — Select tracks</p><h2 id="compare-title">Compare two tracks</h2></div>{(fileA || fileB) && <button className="quiet-button" type="button" onClick={reset} disabled={analyzing}>Clear all</button>}</div><div className="track-grid"><TrackSlot label="A" file={fileA} disabled={analyzing} onFile={(f) => updateFile("A", f)} onClear={() => updateFile("A", null)} /><div className="swap-wrap"><button className="swap-button" type="button" aria-label="Swap tracks" disabled={(!fileA && !fileB) || analyzing} onClick={swap}><Icon name="swap" /></button></div><TrackSlot label="B" file={fileB} disabled={analyzing} onFile={(f) => updateFile("B", f)} onClear={() => updateFile("B", null)} /></div><button className="analyze-button" type="button" onClick={analyze} disabled={!fileA || !fileB || analyzing}>{analyzing ? <><span className="spinner" /> Reading your tracks…</> : <>Analyze compatibility <Icon name="arrow" /></>}</button>{error && <p className="error-message" role="alert"><Icon name="alert" /> {error}</p>}</section>
    {resultA && resultB && compatibility && adjustment && <section className="results" aria-live="polite" aria-labelledby="results-title"><div className="section-heading"><div><p className="section-kicker">02 — Mix report</p><h2 id="results-title">Your results</h2></div><div className="result-actions"><button className="quiet-button" type="button" onClick={saveComparison}>{saved ? "Saved locally" : "Save to library"}</button><button className="quiet-button" type="button" onClick={copySummary}>{copied ? "Copied" : "Copy summary"}</button></div></div><div className="result-grid"><ResultCard result={resultA} label="A" /><ResultCard result={resultB} label="B" /></div><article className={`verdict ${compatibility.compatible ? "verdict--good" : "verdict--caution"}`}><div className="verdict-icon"><Icon name={compatibility.compatible ? "check" : "alert"} /></div><div><p className="verdict-label">{compatibility.compatible ? "Good harmonic match" : "Mix with intention"}</p><h3>{compatibility.reason}</h3><p>To match tempo, <strong>{adjustment.pctChangeNeeded > 0 ? "speed up" : "slow down"} Track B by {Math.abs(adjustment.pctChangeNeeded)}%</strong>. {adjustment.withinComfortableRange ? "That’s within a comfortable adjustment range." : "That is beyond the usual ±8% comfort range, so expect a more noticeable change."}</p></div></article></section>}
    {library.length > 0 && <section className="library" aria-labelledby="library-title"><div className="section-heading"><div><p className="section-kicker">Your local library</p><h2 id="library-title">Saved comparisons</h2></div><span className="library-count">{library.length} saved</span></div><div className="saved-list">{library.map((item) => <SavedComparisonCard key={item.id} item={item} onDelete={() => deleteComparison(item.id)} />)}</div></section>}
    <section className="how-it-works"><p className="section-kicker">How it works</p><div><article><span>01</span><h3>Upload locally</h3><p>Your source files never leave your browser.</p></article><article><span>02</span><h3>Read the audio</h3><p>Tempo and key are measured from the actual waveform.</p></article><article><span>03</span><h3>Make the call</h3><p>Use Camelot compatibility and tempo range to plan the transition.</p></article></div></section>
  </main><footer>Keychain uses browser-based audio analysis. Results are a strong starting point—always trust your ears.</footer></div>;
}
