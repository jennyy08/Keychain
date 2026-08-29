"use client";

import { useState } from "react";
import Image from "next/image";
import type { CatalogSearchResult, CatalogTrack } from "@/lib/catalog";

export default function CatalogSearch({
  savedSourceIds,
  onAdd,
}: {
  savedSourceIds: Set<string>;
  onAdd: (track: CatalogTrack) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const search = async () => {
    const term = query.trim();
    if (term.length < 2) {
      setError("Enter at least two characters to search.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/catalog/search?q=${encodeURIComponent(term)}`);
      const payload = (await response.json()) as CatalogSearchResult & {
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "Catalog search failed.");
      setResults(payload);
    } catch (caught) {
      setResults(null);
      setError(caught instanceof Error ? caught.message : "Catalog search failed.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <section className="catalog-search" aria-labelledby="catalog-search-title">
      <div className="section-heading">
        <div>
          <p className="section-kicker">Build from the catalog</p>
          <h2 id="catalog-search-title">Find songs for your flow</h2>
        </div>
      </div>
      <p className="catalog-intro">
        Search for a few songs you love, then add them to your private collection to
        start building a playlist.
      </p>
      <form
        className="catalog-search-form"
        onSubmit={(event) => {
          event.preventDefault();
          void search();
        }}
      >
        <label>
          <span className="sr-only">Search the Last.fm catalog</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a song or artist"
            maxLength={100}
          />
        </label>
        <button className="save-button" type="submit" disabled={loading}>
          {loading ? "Searching…" : "Search songs"}
        </button>
      </form>
      {error && (
        <p className="catalog-message catalog-message--error" role="alert">
          {error}
        </p>
      )}
      {results && (
        <div className="catalog-results">
          {results.tracks.length ? (
            results.tracks.map((track) => {
              const saved = savedSourceIds.has(`${track.source}:${track.sourceId}`);
              return (
                <article className="catalog-result" key={track.id}>
                  {track.artworkUrl ? (
                    <Image
                      src={track.artworkUrl}
                      alt=""
                      width={38}
                      height={38}
                      unoptimized
                    />
                  ) : (
                    <span className="catalog-artwork-placeholder" aria-hidden="true">
                      ♪
                    </span>
                  )}
                  <div>
                    <h3>{track.title}</h3>
                    <p>{track.artist}</p>
                  </div>
                  <div className="catalog-result-actions">
                    {track.externalUrl && (
                      <a href={track.externalUrl} target="_blank" rel="noreferrer">
                        View
                      </a>
                    )}
                    <button
                      className="quiet-button"
                      type="button"
                      disabled={saved}
                      onClick={() => onAdd(track)}
                    >
                      {saved ? "In collection" : "Add"}
                    </button>
                  </div>
                </article>
              );
            })
          ) : (
            <p className="empty-library">No songs found. Try a more specific search.</p>
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
