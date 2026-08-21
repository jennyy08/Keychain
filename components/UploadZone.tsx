"use client";

import { useState, useRef } from "react";
import { UploadCloud, Music2, X } from "lucide-react";

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadZone({
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
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && dropped.type.startsWith("audio/")) onFile(dropped);
  };

  if (file) {
    return (
      <div className="bg-surface border border-border rounded-xl p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-faint mb-3">{label}</p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-surface-2 border border-border flex items-center justify-center shrink-0">
            <Music2 className="w-5 h-5 text-brand" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-ink truncate font-medium">{file.name}</p>
            <p className="text-xs text-ink-faint">{formatFileSize(file.size)}</p>
          </div>
          <button
            onClick={onClear}
            className="w-7 h-7 rounded-full hover:bg-surface-2 flex items-center justify-center shrink-0 text-ink-faint hover:text-ink transition-colors"
            aria-label={`Remove ${label}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`rounded-xl p-5 cursor-pointer transition-colors border-2 border-dashed ${
        isDragOver ? "border-brand bg-surface-2" : "border-border bg-surface hover:border-ink-faint"
      }`}
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
      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint mb-3">{label}</p>
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <UploadCloud className="w-7 h-7 text-ink-faint mb-2" strokeWidth={1.5} />
        <p className="text-sm text-ink-dim">
          <span className="text-brand font-medium">Click to upload</span> or drag a file
        </p>
        <p className="text-xs text-ink-faint mt-1">MP3 or WAV</p>
      </div>
    </div>
  );
}
