"use client";

import { CheckCircle2, AlertTriangle } from "lucide-react";

export default function CompatibilityBanner({
  compatible,
  reason,
  pctChangeNeeded,
  withinComfortableRange,
}: {
  compatible: boolean;
  reason: string;
  pctChangeNeeded: number;
  withinComfortableRange: boolean;
}) {
  const Icon = compatible ? CheckCircle2 : AlertTriangle;

  return (
    <div
      className="rounded-xl p-5 border"
      style={{
        background: compatible ? "var(--color-good-bg)" : "var(--color-bad-bg)",
        borderColor: compatible
          ? "var(--color-good-border)"
          : "var(--color-bad-border)",
      }}
    >
      <div className="flex items-start gap-3">
        <Icon
          className="w-5 h-5 mt-0.5 shrink-0"
          style={{ color: compatible ? "var(--color-good)" : "var(--color-bad)" }}
        />
        <div>
          <p
            className="font-display font-semibold text-base mb-1"
            style={{ color: compatible ? "var(--color-good)" : "var(--color-bad)" }}
          >
            {compatible ? "Compatible mix" : "Risky mix"}
          </p>
          <p className="text-sm text-ink-dim mb-2">{reason}</p>
          <p className="text-sm text-ink-dim">
            To match tempos, {pctChangeNeeded > 0 ? "speed up" : "slow down"} Track B by{" "}
            <span className="tabular font-medium text-ink">
              {Math.abs(pctChangeNeeded)}%
            </span>
            {" — "}
            {withinComfortableRange
              ? "within a comfortable pitch-adjustment range."
              : "outside the typical comfortable range (>8%), may sound unnatural."}
          </p>
        </div>
      </div>
    </div>
  );
}
