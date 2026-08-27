export type TrackResult = {
  fileName: string;
  bpm: number;
  key: string;
  mode: string;
  camelot: string;
  keyConfidence: number;
  duration: number;
};

export default function ResultCard({ result }: { result: TrackResult }) {
  return (
    <div className="bg-panel border border-border rounded-lg p-5">
      <p className="text-ink-dim text-xs mb-4 truncate uppercase tracking-wide">
        {result.fileName}
      </p>

      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="tabular text-4xl text-ink font-semibold leading-none">
              {result.bpm.toFixed(1)}
            </span>
            <span className="text-ink-faint text-xs uppercase tracking-wide">bpm</span>
          </div>
          <p className="font-display text-lg tracking-wide text-ink mt-2">
            {result.key} {result.mode}
          </p>
        </div>

        <div className="w-14 h-14 rounded-full border-2 border-ink flex items-center justify-center shrink-0 bg-gold">
          <span className="font-display text-base text-ink">{result.camelot}</span>
        </div>
      </div>

      <div className="flex justify-between text-xs text-ink-faint border-t border-border pt-2">
        <span>key confidence {(result.keyConfidence * 100).toFixed(0)}%</span>
        <span>{result.duration.toFixed(0)}s clip</span>
      </div>
    </div>
  );
}
