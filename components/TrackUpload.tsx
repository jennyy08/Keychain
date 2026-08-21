"use client";

import { useRef, useState } from "react";

function MusicNoteIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm12-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TrackUpload({
  label,
  file,
  onFile,
  onClear,
}: {
  label: string;
  file: File | null;
  onFile: (f: File) => void;
  onClear: () => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith("audio/")) onFile(f);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`relative rounded-lg p-6 transition-all cursor-pointer ${
        dragOver ? "bg-panel-2 border-accent" : "bg-panel border-border"
      } border-2 border-dashed`}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />

      <p className="font-display text-xl tracking-wide text-accent mb-3">{label}</p>

      {file ? (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <MusicNoteIcon className="w-6 h-6 text-ink shrink-0" />
            <div className="min-w-0">
              <p className="text-ink text-sm font-medium truncate">{file.name}</p>
              <p className="text-ink-faint text-xs">{formatFileSize(file.size)}</p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="text-ink-faint hover:text-accent text-sm shrink-0 px-2"
            aria-label={`Remove ${label}`}
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <MusicNoteIcon className="w-7 h-7 text-ink-faint" />
          <p className="text-ink-dim text-sm">Drop an audio file here, or click to browse</p>
          <p className="text-ink-faint text-xs">MP3 or WAV</p>
        </div>
      )}
    </div>
  );
}
