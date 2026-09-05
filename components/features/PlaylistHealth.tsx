import { camelotCompatibility, tempoAdjustment } from "@/lib/camelot";
import type { SavedTrack } from "@/lib/types";

type TransitionIssue = {
  from: string;
  to: string;
  detail: string;
  kind: "missing" | "review";
};

const trackName = (track: SavedTrack) =>
  track.catalog
    ? `${track.catalog.title} — ${track.catalog.artist}`
    : track.track.fileName;

const hasTransitionData = (track: SavedTrack) =>
  track.track.bpm > 0 && track.track.camelot !== "?";

function assessTransitions(tracks: SavedTrack[]) {
  let smooth = 0;
  let missing = 0;
  let review = 0;
  const issues: TransitionIssue[] = [];

  for (let index = 1; index < tracks.length; index += 1) {
    const from = tracks[index - 1];
    const to = tracks[index];
    if (!hasTransitionData(from) || !hasTransitionData(to)) {
      missing += 1;
      issues.push({
        from: trackName(from),
        to: trackName(to),
        detail: "BPM or key is missing",
        kind: "missing",
      });
      continue;
    }

    const harmonic = camelotCompatibility(from.track.camelot, to.track.camelot);
    const tempo = tempoAdjustment(from.track.bpm, to.track.bpm);
    if (harmonic.compatible && tempo.withinComfortableRange) {
      smooth += 1;
      continue;
    }
    review += 1;
    const reasons = [
      !harmonic.compatible ? "key change" : null,
      !tempo.withinComfortableRange
        ? `${Math.abs(tempo.pctChangeNeeded)}% tempo shift`
        : null,
    ].filter(Boolean);
    issues.push({
      from: trackName(from),
      to: trackName(to),
      detail: reasons.join(" · "),
      kind: "review",
    });
  }

  return { smooth, missing, review, issues };
}

export default function PlaylistHealth({ tracks }: { tracks: SavedTrack[] }) {
  if (tracks.length < 2) return null;
  const { smooth, missing, review, issues } = assessTransitions(tracks);
  const total = tracks.length - 1;
  const score = Math.round((smooth / total) * 100);

  return (
    <section className="playlist-health" aria-labelledby="playlist-health-title">
      <div className="playlist-health-heading">
        <div>
          <p className="section-kicker">Transition health</p>
          <h4 id="playlist-health-title">{score}% smooth links</h4>
        </div>
        <p>{total} transitions checked</p>
      </div>
      <div className="playlist-health-summary">
        <span>
          <b>{smooth}</b> smooth
        </span>
        <span>
          <b>{review}</b> to review
        </span>
        <span>
          <b>{missing}</b> missing data
        </span>
      </div>
      {issues.length > 0 && (
        <ul className="playlist-health-issues">
          {issues.slice(0, 3).map((issue) => (
            <li
              key={`${issue.from}-${issue.to}`}
              className={`playlist-health-issue playlist-health-issue--${issue.kind}`}
            >
              <span>
                {issue.from} <b>→</b> {issue.to}
              </span>
              <small>{issue.detail}</small>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
