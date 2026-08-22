/**
 * Core audio analysis: tempo (BPM) detection and musical key detection,
 * built entirely on top of fft.ts. Same underlying algorithms as the
 * Python version (spectral-flux onset detection + autocorrelation for
 * tempo; chroma features + Krumhansl-Schmuckler correlation for key),
 * reimplemented from scratch since there's no librosa in the browser.
 *
 * Every function here takes raw PCM samples (a Float32Array) and a
 * sample rate - agnostic to HOW the audio was decoded, so these are
 * easy to unit-test outside a browser (no Web Audio API dependency).
 */

import { fft, magnitudeSpectrum, nextPowerOf2 } from "./fft";

const FRAME_SIZE = 2048;
const HOP_SIZE = 512;

function hannWindow(size: number): Float32Array {
  const w = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
  }
  return w;
}

const HANN = hannWindow(FRAME_SIZE);

/**
 * Splits audio into overlapping windows, applies a Hann window (tapers
 * each frame's edges to avoid spectral leakage artifacts), and returns
 * the magnitude spectrum for each frame - this is a Short-Time Fourier
 * Transform (STFT): an FFT repeated over a sliding window through time,
 * which is how you analyze frequency content of a signal that changes
 * over time (which all music does).
 */
function computeSTFT(samples: Float32Array): number[][] {
  const spectra: number[][] = [];
  const padded = nextPowerOf2(FRAME_SIZE);

  for (let start = 0; start + FRAME_SIZE <= samples.length; start += HOP_SIZE) {
    const frame = new Float32Array(padded);
    for (let i = 0; i < FRAME_SIZE; i++) {
      frame[i] = samples[start + i] * HANN[i];
    }
    const spectrum = magnitudeSpectrum(fft(frame));
    // Only keep the first half (real-valued input signals produce a
    // mirrored, redundant second half of the spectrum).
    spectra.push(spectrum.slice(0, padded / 2));
  }

  return spectra;
}

export function detectTempo(samples: Float32Array, sampleRate: number): { bpm: number; confidence: number } {
  const spectra = computeSTFT(samples);
  if (spectra.length < 8) return { bpm: 0, confidence: 0 };

  // Spectral flux: how much MORE energy is in this frame vs the last
  // one, summed across all frequency bins, with negative changes
  // zeroed out ("half-wave rectified"). This spikes sharply on
  // percussive hits (kick/snare) and stays low during sustained,
  // steady sound - exactly what marks a rhythmic "onset".
  const onsetEnvelope: number[] = [0];
  for (let t = 1; t < spectra.length; t++) {
    let flux = 0;
    for (let bin = 0; bin < spectra[t].length; bin++) {
      const diff = spectra[t][bin] - spectra[t - 1][bin];
      if (diff > 0) flux += diff;
    }
    onsetEnvelope.push(flux);
  }

  const frameRate = sampleRate / HOP_SIZE; // onset envelope samples per second

  // Autocorrelate the onset envelope against itself at different time
  // lags. The lag with the strongest self-similarity IS the beat
  // period - a song's rhythm is, by definition, a pattern that
  // repeats at a consistent interval.
  const minBpm = 60, maxBpm = 200;
  const minLag = Math.floor(frameRate * (60 / maxBpm));
  const maxLag = Math.ceil(frameRate * (60 / minBpm));

  // Raw autocorrelation favors loud files and long clips. Normalize each
  // overlap so every lag is comparable on a -1…1 scale, then consider its
  // octave relationship as well. That makes the common “70 vs 140 BPM” and
  // “64 vs 128 BPM” ambiguity much less likely than picking the single
  // loudest unnormalized peak.
  const onsetMean = onsetEnvelope.reduce((sum, item) => sum + item, 0) / onsetEnvelope.length;
  const centered = onsetEnvelope.map((value) => value - onsetMean);
  const scoreForLag = (lag: number) => {
    let dot = 0, firstEnergy = 0, secondEnergy = 0;
    for (let i = 0; i + lag < centered.length; i++) {
      dot += centered[i] * centered[i + lag];
      firstEnergy += centered[i] ** 2;
      secondEnergy += centered[i + lag] ** 2;
    }
    return dot / (Math.sqrt(firstEnergy * secondEnergy) || 1);
  };

  const scores: { lag: number; score: number }[] = [];
  for (let lag = minLag; lag <= maxLag; lag++) {
    scores.push({ lag, score: scoreForLag(lag) });
  }

  // Restrict to local peaks: neighboring lags are often the same tempo
  // measured one frame apart and should not count as independent choices.
  const peaks = scores.filter((candidate, index) =>
    candidate.score > 0 &&
    candidate.score >= (scores[index - 1]?.score ?? -Infinity) &&
    candidate.score >= (scores[index + 1]?.score ?? -Infinity)
  );
  const ranked = (peaks.length ? peaks : scores)
    .map((candidate) => {
      const doubleLag = candidate.lag * 2;
      const doubleScore = doubleLag <= maxLag ? scoreForLag(doubleLag) : 0;
      const bpm = (60 * frameRate) / candidate.lag;
      // A gentle prior only breaks ties between octave-equivalent tempos;
      // it does not force every track toward a club tempo.
      const octavePreference = Math.exp(-Math.abs(Math.log2(bpm / 128))) * 0.06;
      return { ...candidate, bpm, combinedScore: candidate.score + doubleScore * 0.22 + octavePreference };
    })
    .sort((a, b) => b.combinedScore - a.combinedScore);

  const winner = ranked[0];
  const runnerUp = ranked[1];
  if (!winner) return { bpm: 0, confidence: 0 };

  const periodicity = Math.max(0, Math.min(1, winner.score));
  const separation = runnerUp
    ? Math.max(0, Math.min(1, (winner.combinedScore - runnerUp.combinedScore) / (Math.abs(winner.combinedScore) + 0.0001)))
    : 1;
  return { bpm: Math.round(winner.bpm * 10) / 10, confidence: Math.round((periodicity * 0.7 + separation * 0.3) * 100) / 100 };
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Krumhansl-Kessler key profiles - published cognitive-science reference
// data (not invented for this project), same values used in the Python version.
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

function frequencyToPitchClass(freq: number): number {
  if (freq <= 0) return -1;
  // MIDI note number formula: A4 (440Hz) = MIDI note 69.
  const midi = 69 + 12 * Math.log2(freq / 440);
  const pitchClass = ((Math.round(midi) % 12) + 12) % 12;
  return pitchClass;
}

function correlation(a: number[], b: number[]): number {
  const n = a.length;
  const meanA = a.reduce((s, v) => s + v, 0) / n;
  const meanB = b.reduce((s, v) => s + v, 0) / n;
  let num = 0, denomA = 0, denomB = 0;
  for (let i = 0; i < n; i++) {
    num += (a[i] - meanA) * (b[i] - meanB);
    denomA += (a[i] - meanA) ** 2;
    denomB += (b[i] - meanB) ** 2;
  }
  return num / (Math.sqrt(denomA) * Math.sqrt(denomB) || 1);
}

export function detectKey(samples: Float32Array, sampleRate: number): { key: string; mode: "major" | "minor"; confidence: number } {
  const spectra = computeSTFT(samples);
  const padded = nextPowerOf2(FRAME_SIZE);
  if (!spectra.length) return { key: "C", mode: "major", confidence: 0 };

  // Build a 12-bin chroma vector: for every FFT bin in every frame,
  // figure out which pitch class it belongs to. We retain a profile for each
  // frame before pooling so quiet transitions cannot steer the final key.
  const chroma = new Array(12).fill(0);
  const frameChromas: { values: number[]; energy: number }[] = [];
  for (const spectrum of spectra) {
    const values = new Array(12).fill(0);
    let energy = 0;
    for (let bin = 1; bin < spectrum.length; bin++) {
      const freq = (bin * sampleRate) / padded;
      if (freq < 60 || freq > 5000) continue;
      const pc = frequencyToPitchClass(freq);
      const magnitude = spectrum[bin];
      if (pc >= 0) values[pc] += magnitude;
      energy += magnitude;
    }
    frameChromas.push({ values, energy });
  }

  // Retain the musically active 65% of frames. This keeps material from
  // across the track while rejecting low-energy intros, outros, and breaks.
  const sortedEnergy = frameChromas.map((frame) => frame.energy).sort((a, b) => a - b);
  const activityThreshold = sortedEnergy[Math.floor(sortedEnergy.length * 0.35)] ?? 0;
  for (const frame of frameChromas) {
    if (frame.energy < activityThreshold || frame.energy === 0) continue;
    for (let pc = 0; pc < 12; pc++) chroma[pc] += frame.values[pc] / frame.energy;
  }
  const candidates: { key: string; mode: "major" | "minor"; score: number }[] = [];

  // Rotate via explicit modular indexing (matches numpy's roll semantics
  // exactly: rotated[i] = profile[(i - tonic) mod 12]). Deliberately NOT
  // using Array.slice(-tonic) here - when tonic is 0, "-tonic" becomes
  // JavaScript's negative zero, and slice(-0) is NOT treated as a negative
  // index (per spec, -0 < 0 is false), so it silently produces a wrong,
  // double-length array instead of throwing an error. Modular indexing
  // sidesteps that footgun entirely.
  for (let tonic = 0; tonic < 12; tonic++) {
    const rotateIndex = (i: number) => ((i - tonic) % 12 + 12) % 12;
    const majorRotated = Array.from({ length: 12 }, (_, i) => MAJOR_PROFILE[rotateIndex(i)]);
    const minorRotated = Array.from({ length: 12 }, (_, i) => MINOR_PROFILE[rotateIndex(i)]);

    const majorScore = correlation(chroma, majorRotated);
    const minorScore = correlation(chroma, minorRotated);

    candidates.push({ key: NOTE_NAMES[tonic], mode: "major", score: majorScore });
    candidates.push({ key: NOTE_NAMES[tonic], mode: "minor", score: minorScore });
  }

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  const secondBest = candidates[1];
  // Confidence combines how well the winner fits a profile with how
  // decisively it beats the nearest alternate key.
  const profileFit = Math.max(0, Math.min(1, (best.score + 1) / 2));
  const separation = Math.max(0, Math.min(1, (best.score - secondBest.score) / 0.2));
  const confidence = Math.round((profileFit * 0.55 + separation * 0.45) * 100) / 100;
  return { key: best.key, mode: best.mode, confidence };
}
