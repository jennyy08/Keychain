import { camelotCompatibility, tempoAdjustment } from "@/lib/camelot";
import type { SavedTrack } from "@/lib/types";

export type TransitionPreview = {
  fromId: string;
  toId: string;
  detail: string;
};

const hasTransitionData = (track: SavedTrack) =>
  track.track.bpm > 0 && track.track.camelot !== "?";

function scoreTransition(from: SavedTrack, to: SavedTrack) {
  if (!hasTransitionData(from) || !hasTransitionData(to)) {
    return { score: -1, detail: "Transition data pending" };
  }

  const harmonic = camelotCompatibility(from.track.camelot, to.track.camelot);
  const tempo = tempoAdjustment(from.track.bpm, to.track.bpm);
  const tempoScore = Math.max(0, 40 - Math.abs(tempo.pctChangeNeeded) * 5);
  const score = (harmonic.compatible ? 60 : 0) + tempoScore;
  const tempoDetail =
    tempo.pctChangeNeeded === 0
      ? "same tempo"
      : `${Math.abs(tempo.pctChangeNeeded)}% tempo change`;

  return {
    score,
    detail: harmonic.compatible
      ? `Harmonic match · ${tempoDetail}`
      : `Key shift · ${tempoDetail}`,
  };
}

export function buildSmootherOrder(
  tracks: SavedTrack[],
  anchors: { openerTrackId?: string; closerTrackId?: string } = {},
) {
  if (tracks.length < 2)
    return { trackIds: tracks.map((track) => track.id), transitions: [] };

  const opener =
    tracks.find((track) => track.id === anchors.openerTrackId) ?? tracks[0];
  const closer =
    anchors.closerTrackId && anchors.closerTrackId !== opener.id
      ? tracks.find((track) => track.id === anchors.closerTrackId)
      : undefined;
  const remaining = tracks.filter(
    (track) => track.id !== opener.id && track.id !== closer?.id,
  );
  const ordered = [opener];
  const transitions: TransitionPreview[] = [];

  while (remaining.length) {
    const from = ordered.at(-1)!;
    const bestIndex = remaining.reduce((best, candidate, index) => {
      const bestScore = scoreTransition(from, remaining[best]).score;
      const candidateScore = scoreTransition(from, candidate).score;
      return candidateScore > bestScore ? index : best;
    }, 0);
    const [next] = remaining.splice(bestIndex, 1);
    ordered.push(next);
    transitions.push({
      fromId: from.id,
      toId: next.id,
      detail: scoreTransition(from, next).detail,
    });
  }

  if (closer) {
    const from = ordered.at(-1)!;
    ordered.push(closer);
    transitions.push({
      fromId: from.id,
      toId: closer.id,
      detail: scoreTransition(from, closer).detail,
    });
  }

  return { trackIds: ordered.map((track) => track.id), transitions };
}
