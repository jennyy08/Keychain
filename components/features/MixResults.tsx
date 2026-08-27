import Icon from "@/components/ui/Icon";
import type { TrackResult } from "@/lib/types";
import { camelotCompatibility, tempoAdjustment } from "@/lib/camelot";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const formatDuration = (seconds: number) =>
  `${Math.floor(Math.max(0, Math.round(seconds)) / 60)}:${String(Math.max(0, Math.round(seconds)) % 60).padStart(2, "0")}`;

function ResultCard({ result, label }: { result: TrackResult; label: "A" | "B" }) {
  const tempoConfidence = result.tempoConfidence ?? 0;
  return (
    <article className="result-card">
      <div className="result-topline">
        <span>Track {label}</span>
        <span>{formatDuration(result.duration)}</span>
      </div>
      <p className="result-name" title={result.fileName}>
        {result.fileName}
      </p>
      <div className="metrics">
        <div>
          <span className="metric-value">{result.bpm.toFixed(1)}</span>
          <span className="metric-label">BPM</span>
        </div>
        <div className="key-metric">
          <span className="key-value">
            {result.key} <em>{result.mode}</em>
          </span>
          <span className="metric-label">Musical key</span>
          {result.keyConfidence < 0.6 && (
            <small className="review-note">Verify by ear</small>
          )}
        </div>
        <div className="camelot-badge">
          <span>{result.camelot}</span>
          <small>Camelot</small>
        </div>
      </div>
      <div className="confidence">
        <span>Tempo confidence</span>
        <div>
          <i style={{ width: `${Math.round(tempoConfidence * 100)}%` }} />
        </div>
        <b>{Math.round(tempoConfidence * 100)}%</b>
      </div>
      <div className="confidence">
        <span>Key confidence</span>
        <div>
          <i style={{ width: `${Math.round(result.keyConfidence * 100)}%` }} />
        </div>
        <b>{Math.round(result.keyConfidence * 100)}%</b>
      </div>
    </article>
  );
}

function CorrectionFields({
  label,
  result,
  onChange,
}: {
  label: "A" | "B";
  result: TrackResult;
  onChange: (patch: Partial<TrackResult>) => void;
}) {
  return (
    <fieldset className="correction-fields">
      <legend>Track {label}</legend>
      <label>
        BPM
        <input
          type="number"
          min="40"
          max="300"
          step="0.1"
          value={result.bpm}
          onChange={(event) => onChange({ bpm: Number(event.target.value) })}
        />
      </label>
      <label>
        Key
        <select
          value={result.key}
          onChange={(event) => onChange({ key: event.target.value })}
        >
          {NOTE_NAMES.map((note) => (
            <option key={note}>{note}</option>
          ))}
        </select>
      </label>
      <label>
        Mode
        <select
          value={result.mode}
          onChange={(event) => onChange({ mode: event.target.value })}
        >
          <option value="major">Major</option>
          <option value="minor">Minor</option>
        </select>
      </label>
    </fieldset>
  );
}

export default function MixResults({
  resultA,
  resultB,
  copied,
  saved,
  showCorrections,
  showSaveDetails,
  draftTags,
  draftNote,
  onToggleCorrections,
  onToggleSaveDetails,
  onTagsChange,
  onNoteChange,
  onSave,
  onCopy,
  onCorrect,
}: {
  resultA: TrackResult;
  resultB: TrackResult;
  copied: boolean;
  saved: boolean;
  showCorrections: boolean;
  showSaveDetails: boolean;
  draftTags: string;
  draftNote: string;
  onToggleCorrections: () => void;
  onToggleSaveDetails: () => void;
  onTagsChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onSave: () => void;
  onCopy: () => void;
  onCorrect: (track: "A" | "B", patch: Partial<TrackResult>) => void;
}) {
  const compatibility = camelotCompatibility(resultA.camelot, resultB.camelot);
  const adjustment = tempoAdjustment(resultA.bpm, resultB.bpm);
  return (
    <section className="results" aria-live="polite" aria-labelledby="results-title">
      <div className="section-heading">
        <div>
          <p className="section-kicker">02 — Mix report</p>
          <h2 id="results-title">Your results</h2>
        </div>
        <div className="result-actions">
          <button className="quiet-button" type="button" onClick={onToggleCorrections}>
            {showCorrections ? "Done correcting" : "Correct results"}
          </button>
          <button
            className="quiet-button"
            type="button"
            disabled={saved}
            onClick={onToggleSaveDetails}
          >
            {saved ? "Saved locally" : "Save to library"}
          </button>
          <button className="quiet-button" type="button" onClick={onCopy}>
            {copied ? "Copied" : "Copy summary"}
          </button>
        </div>
      </div>
      <div className="result-grid">
        <ResultCard result={resultA} label="A" />
        <ResultCard result={resultB} label="B" />
      </div>
      {showSaveDetails && !saved && (
        <form
          className="save-panel"
          onSubmit={(event) => {
            event.preventDefault();
            onSave();
          }}
        >
          <div>
            <p className="section-kicker">Save this comparison</p>
            <p>Optional context makes your library easier to browse later.</p>
          </div>
          <div className="save-fields">
            <label>
              Tags
              <input
                value={draftTags}
                onChange={(event) => onTagsChange(event.target.value)}
                placeholder="warm-up, peak-time"
                maxLength={100}
              />
            </label>
            <label>
              Transition note
              <textarea
                value={draftNote}
                onChange={(event) => onNoteChange(event.target.value)}
                placeholder="Bring in during the breakdown…"
                maxLength={240}
                rows={2}
              />
            </label>
            <button className="save-button" type="submit">
              Save comparison
            </button>
          </div>
        </form>
      )}
      {showCorrections && (
        <div className="correction-panel">
          <div>
            <p className="section-kicker">Manual correction</p>
            <p>
              Trust your ears—changes immediately update the mix recommendation and are
              saved with this comparison.
            </p>
          </div>
          <div className="correction-grid">
            <CorrectionFields
              label="A"
              result={resultA}
              onChange={(patch) => onCorrect("A", patch)}
            />
            <CorrectionFields
              label="B"
              result={resultB}
              onChange={(patch) => onCorrect("B", patch)}
            />
          </div>
        </div>
      )}
      <article
        className={`verdict ${compatibility.compatible ? "verdict--good" : "verdict--caution"}`}
      >
        <div className="verdict-icon">
          <Icon name={compatibility.compatible ? "check" : "alert"} />
        </div>
        <div>
          <p className="verdict-label">
            {compatibility.compatible ? "Good harmonic match" : "Mix with intention"}
          </p>
          <h3>{compatibility.reason}</h3>
          <p>
            To match tempo,{" "}
            <strong>
              {adjustment.pctChangeNeeded > 0 ? "speed up" : "slow down"} Track B by{" "}
              {Math.abs(adjustment.pctChangeNeeded)}%
            </strong>
            .{" "}
            {adjustment.withinComfortableRange
              ? "That’s within a comfortable adjustment range."
              : "That is beyond the usual ±8% comfort range, so expect a more noticeable change."}
          </p>
        </div>
      </article>
    </section>
  );
}
