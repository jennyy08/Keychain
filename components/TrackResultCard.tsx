"use client";

export type TrackResult = {
  fileName: string;
  bpm: number;
  key: string;
  mode: string;
  camelot: string;
  keyConfidence: number;
  duration: number;
};

export default function TrackResultCard({ result }: { result: TrackResult }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint mb-4 truncate">
        {result.fileName}
      </p>

      <div className="flex items-end justify-between mb-4">
        <div>
          <p className="tabular text-4xl font-semibold text-ink leading-none">
            {result.bpm.toFixed(1)}
          </p>
          <p className="text-xs text-ink-faint mt-1">BPM</p>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-semibold text-ink leading-none capitalize">
            {result.key} <span className="text-ink-dim">{result.mode}</span>
          </p>
          <p className="text-xs text-ink-faint mt-1">key</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border">
        <span className="inline-flex items-center justify-center bg-brand text-surface text-xs font-semibold rounded-md px-2 py-1 tabular">
          {result.camelot}
        </span>
        <span className="text-xs text-ink-faint">
          {(result.keyConfidence * 100).toFixed(0)}% confidence ·{" "}
          {result.duration.toFixed(0)}s
        </span>
      </div>
    </div>
  );
}
