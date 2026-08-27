import type { SavedComparison } from "./types";

function csvCell(value: string | number | boolean | undefined) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export function downloadComparisons(
  entries: SavedComparison[],
  format: "csv" | "json",
) {
  const stamp = new Date().toISOString().slice(0, 10);
  const content =
    format === "json"
      ? JSON.stringify(
          { exportedAt: new Date().toISOString(), comparisons: entries },
          null,
          2,
        )
      : [
          [
            "Saved at",
            "Track A",
            "Track A BPM",
            "Track A key",
            "Track A Camelot",
            "Track B",
            "Track B BPM",
            "Track B key",
            "Track B Camelot",
            "Compatible",
            "Compatibility note",
            "Tags",
            "Transition note",
          ]
            .map(csvCell)
            .join(","),
          ...entries.map((item) =>
            [
              item.savedAt,
              item.trackA.fileName,
              item.trackA.bpm,
              `${item.trackA.key} ${item.trackA.mode}`,
              item.trackA.camelot,
              item.trackB.fileName,
              item.trackB.bpm,
              `${item.trackB.key} ${item.trackB.mode}`,
              item.trackB.camelot,
              item.compatible,
              item.reason,
              item.tags?.join(", "),
              item.note,
            ]
              .map(csvCell)
              .join(","),
          ),
        ].join("\n");

  const blob = new Blob([content], {
    type: format === "json" ? "application/json" : "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `keychain-comparisons-${stamp}.${format}`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function isTrackResult(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const track = value as Record<string, unknown>;
  return (
    typeof track.fileName === "string" &&
    typeof track.bpm === "number" &&
    typeof track.key === "string" &&
    typeof track.mode === "string" &&
    typeof track.camelot === "string" &&
    typeof track.keyConfidence === "number" &&
    typeof track.duration === "number"
  );
}

export function parseImportedComparisons(value: unknown): SavedComparison[] {
  const source =
    value && typeof value === "object" && "comparisons" in value
      ? (value as { comparisons?: unknown }).comparisons
      : value;

  if (!Array.isArray(source)) return [];

  return source.filter((item): item is SavedComparison => {
    if (!item || typeof item !== "object") return false;
    const comparison = item as Partial<SavedComparison>;
    return (
      typeof comparison.id === "string" &&
      typeof comparison.savedAt === "string" &&
      typeof comparison.compatible === "boolean" &&
      typeof comparison.reason === "string" &&
      isTrackResult(comparison.trackA) &&
      isTrackResult(comparison.trackB)
    );
  });
}
