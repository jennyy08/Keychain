"use client";

import { Disc3 } from "lucide-react";

const NAV_ITEMS = [
  { label: "Compare", active: true },
  { label: "Library", active: false }, // room for the batch/library feature planned later
];

export default function Header() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Disc3 className="w-6 h-6 text-brand" strokeWidth={2} />
          <span className="font-display text-xl font-semibold text-ink tracking-tight">
            Keychain
          </span>
        </div>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              disabled={!item.active}
              className={
                item.active
                  ? "px-3 py-1.5 rounded-md text-sm font-medium text-ink bg-surface-2 border border-border"
                  : "px-3 py-1.5 rounded-md text-sm font-medium text-ink-faint cursor-not-allowed flex items-center gap-1.5"
              }
            >
              {item.label}
              {!item.active && (
                <span className="text-[10px] uppercase tracking-wide bg-surface-2 border border-border rounded px-1.5 py-0.5 text-ink-faint">
                  Soon
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
