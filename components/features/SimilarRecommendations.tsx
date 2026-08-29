"use client";

import { useEffect, useState } from "react";
import CatalogTrackList from "@/components/catalog/CatalogTrackList";
import type { CatalogSearchResult, CatalogTrack } from "@/lib/catalog";

export default function SimilarRecommendations({
  seed,
  savedSourceIds,
  onAdd,
  onClose,
}: {
  seed: CatalogTrack | null;
  savedSourceIds: Set<string>;
  onAdd: (track: CatalogTrack) => Promise<void>;
  onClose: () => void;
}) {
  const [results, setResults] = useState<CatalogSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!seed) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ title: seed.title, artist: seed.artist });
        const response = await fetch(`/api/catalog/similar?${params}`);
        const payload = (await response.json()) as CatalogSearchResult & {
          error?: string;
        };
        if (!response.ok)
          throw new Error(payload.error ?? "Couldn’t load suggestions.");
        if (!cancelled) setResults(payload);
      } catch (caught) {
        if (!cancelled) {
          setResults(null);
          setError(
            caught instanceof Error ? caught.message : "Couldn’t load suggestions.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [seed]);

  if (!seed) return null;
  return (
    <section className="similar-recommendations" aria-labelledby="similar-title">
      <div className="section-heading">
        <div>
          <p className="section-kicker">Similar vibe</p>
          <h2 id="similar-title">More like {seed.title}</h2>
        </div>
        <button className="quiet-button" type="button" onClick={onClose}>
          Close
        </button>
      </div>
      <p className="catalog-intro">
        These are based on Last.fm listening patterns—not transition compatibility. Add
        the ones you like, then check their BPM and key.
      </p>
      {loading && <p className="catalog-message">Finding similar songs…</p>}
      {error && (
        <p className="catalog-message catalog-message--error" role="alert">
          {error}
        </p>
      )}
      {results && !loading && (
        <div className="catalog-results">
          {results.tracks.length ? (
            <CatalogTrackList
              tracks={results.tracks}
              savedSourceIds={savedSourceIds}
              onAdd={onAdd}
            />
          ) : (
            <p className="empty-library">No similar songs found for this track.</p>
          )}
          {results.attribution && (
            <a
              className="catalog-attribution"
              href={results.attribution.url}
              target="_blank"
              rel="noreferrer"
            >
              {results.attribution.label}
            </a>
          )}
        </div>
      )}
    </section>
  );
}
