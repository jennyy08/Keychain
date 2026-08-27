/**
 * The Camelot Wheel - standard DJ tooling for harmonic mixing.
 * Direct port of the same logic from the Python prototype (camelot.py) -
 * see that file for the full explanation of why this system works.
 */

type Mode = "major" | "minor";

const CAMELOT_MAP: Record<string, string> = {
  "G#-minor": "1A",
  "B-major": "1B",
  "D#-minor": "2A",
  "F#-major": "2B",
  "A#-minor": "3A",
  "C#-major": "3B",
  "F-minor": "4A",
  "G#-major": "4B",
  "C-minor": "5A",
  "D#-major": "5B",
  "G-minor": "6A",
  "A#-major": "6B",
  "D-minor": "7A",
  "F-major": "7B",
  "A-minor": "8A",
  "C-major": "8B",
  "E-minor": "9A",
  "G-major": "9B",
  "B-minor": "10A",
  "D-major": "10B",
  "F#-minor": "11A",
  "A-major": "11B",
  "C#-minor": "12A",
  "E-major": "12B",
};

export function toCamelot(key: string, mode: Mode): string {
  return CAMELOT_MAP[`${key}-${mode}`] ?? "?";
}

export function camelotCompatibility(
  codeA: string,
  codeB: string,
): { compatible: boolean; reason: string; relationship: string | null } {
  if (codeA === "?" || codeB === "?") {
    return { compatible: false, reason: "Unknown key", relationship: null };
  }

  const numA = parseInt(codeA),
    letterA = codeA.slice(-1);
  const numB = parseInt(codeB),
    letterB = codeB.slice(-1);

  if (codeA === codeB) {
    return {
      compatible: true,
      reason: "Identical key - perfect match",
      relationship: "identical",
    };
  }
  if (numA === numB && letterA !== letterB) {
    return {
      compatible: true,
      reason: "Relative major/minor - very compatible",
      relationship: "relative",
    };
  }

  const diff = Math.min(Math.abs(numA - numB), 12 - Math.abs(numA - numB));
  if (diff === 1 && letterA === letterB) {
    return {
      compatible: true,
      reason: "Adjacent on the Camelot wheel - compatible",
      relationship: "adjacent",
    };
  }

  return {
    compatible: false,
    reason: "Not harmonically close - likely to clash",
    relationship: "distant",
  };
}

export function tempoAdjustment(
  bpmA: number,
  bpmB: number,
): { pctChangeNeeded: number; withinComfortableRange: boolean } {
  const pctChangeNeeded = ((bpmA - bpmB) / bpmB) * 100;
  return {
    pctChangeNeeded: Math.round(pctChangeNeeded * 100) / 100,
    withinComfortableRange: Math.abs(pctChangeNeeded) <= 8.0,
  };
}
