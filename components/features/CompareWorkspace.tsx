"use client";

import { useRef, useState } from "react";
import Icon from "@/components/ui/Icon";

const AUDIO_EXTENSIONS = /\.(mp3|wav|m4a|aac|ogg|flac)$/i;

function formatFileSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function isAudioFile(file: File) {
  return file.type.startsWith("audio/") || AUDIO_EXTENSIONS.test(file.name);
}

function TrackSlot({
  label,
  file,
  disabled,
  onFile,
  onClear,
}: {
  label: "A" | "B";
  file: File | null;
  disabled: boolean;
  onFile: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const select = (candidate?: File) => {
    if (candidate && isAudioFile(candidate)) onFile(candidate);
  };
  return (
    <section
      className={`track-slot ${dragging ? "track-slot--dragging" : ""} ${file ? "track-slot--selected" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (!disabled) select(event.dataTransfer.files?.[0]);
      }}
    >
      <div className="slot-heading">
        <span className="slot-label">Track {label}</span>
        {file && (
          <span className="ready-label">
            <Icon name="check" /> Ready
          </span>
        )}
      </div>
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
        onChange={(event) => select(event.target.files?.[0])}
      />
      {file ? (
        <div className="file-selected">
          <div className="file-icon">
            <Icon name="music" />
          </div>
          <div className="file-copy">
            <p title={file.name}>{file.name}</p>
            <span>{formatFileSize(file.size)}</span>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={onClear}
            disabled={disabled}
            aria-label={`Remove Track ${label}`}
          >
            <Icon name="close" />
          </button>
        </div>
      ) : (
        <button
          className="drop-target"
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          <span className="upload-icon">
            <Icon name="upload" />
          </span>
          <span>Drop an audio file here</span>
          <small>
            or <u>browse your device</u>
          </small>
        </button>
      )}
      <p className="slot-help">MP3, WAV, M4A, AAC, OGG, or FLAC</p>
    </section>
  );
}

export default function CompareWorkspace({
  fileA,
  fileB,
  analyzing,
  error,
  onFileA,
  onFileB,
  onReset,
  onSwap,
  onAnalyze,
}: {
  fileA: File | null;
  fileB: File | null;
  analyzing: boolean;
  error: string | null;
  onFileA: (file: File | null) => void;
  onFileB: (file: File | null) => void;
  onReset: () => void;
  onSwap: () => void;
  onAnalyze: () => void;
}) {
  return (
    <section className="workspace" aria-labelledby="compare-title">
      <div className="section-heading">
        <div>
          <p className="section-kicker">01 — Select tracks</p>
          <h2 id="compare-title">Compare two tracks</h2>
        </div>
        {(fileA || fileB) && (
          <button
            className="quiet-button"
            type="button"
            onClick={onReset}
            disabled={analyzing}
          >
            Clear all
          </button>
        )}
      </div>
      <div className="track-grid">
        <TrackSlot
          label="A"
          file={fileA}
          disabled={analyzing}
          onFile={onFileA}
          onClear={() => onFileA(null)}
        />
        <div className="swap-wrap">
          <button
            className="swap-button"
            type="button"
            aria-label="Swap tracks"
            disabled={(!fileA && !fileB) || analyzing}
            onClick={onSwap}
          >
            <Icon name="swap" />
          </button>
        </div>
        <TrackSlot
          label="B"
          file={fileB}
          disabled={analyzing}
          onFile={onFileB}
          onClear={() => onFileB(null)}
        />
      </div>
      <button
        className="analyze-button"
        type="button"
        onClick={onAnalyze}
        disabled={!fileA || !fileB || analyzing}
      >
        {analyzing ? (
          <>
            <span className="spinner" /> Reading your tracks…
          </>
        ) : (
          <>
            Analyze compatibility <Icon name="arrow" />
          </>
        )}
      </button>
      {error && (
        <p className="error-message" role="alert">
          <Icon name="alert" /> {error}
        </p>
      )}
    </section>
  );
}
