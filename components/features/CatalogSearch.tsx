"use client";

import { useRef, useState } from "react";
import CatalogTrackList from "@/components/catalog/CatalogTrackList";
import type { CatalogSearchResult, CatalogTrack } from "@/lib/catalog";

type ArtworkDetails = { artworkUrl: string; artworkStoreUrl?: string };
type CachedArtwork = ArtworkDetails | string;

function isArtworkDetails(value: CachedArtwork | undefined): value is ArtworkDetails {
  return (
    typeof value === "object" && value !== null && typeof value.artworkUrl === "string"
  );
}

export default function CatalogSearch({
  savedSourceIds,
  onAdd,
}: {
  savedSourceIds: Set<string>;
  onAdd: (track: CatalogTrack) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingArtwork, setLoadingArtwork] = useState(false);
  const searchVersion = useRef(0);
  const enrichArtwork = async (searchResults: CatalogSearchResult, version: number) => {
    if (version !== searchVersion.current) return;
    const missingArtwork = searchResults.tracks.filter((track) => !track.artworkUrl);
    if (!missingArtwork.length) return;

    let cachedArtwork: Record<string, CachedArtwork> = {};
    try {
      cachedArtwork = JSON.parse(
        window.localStorage.getItem("keychain-catalog-artwork-v1") ?? "{}",
      ) as Record<string, CachedArtwork>;
    } catch {
      // Artwork caching is optional and must not block search.
    }
    if (version !== searchVersion.current) return;
    const applyArtwork = (artworkById: Record<string, ArtworkDetails>) => {
      setResults((current) =>
        current
          ? {
              ...current,
              tracks: current.tracks.map((track) =>
                artworkById[track.id] ? { ...track, ...artworkById[track.id] } : track,
              ),
            }
          : current,
      );
    };
    const cachedForSearch = missingArtwork.reduce<Record<string, ArtworkDetails>>(
      (artworkById, track) => {
        const artwork = cachedArtwork[track.id];
        if (isArtworkDetails(artwork)) artworkById[track.id] = artwork;
        return artworkById;
      },
      {},
    );
    if (Object.keys(cachedForSearch).length) applyArtwork(cachedForSearch);

    const unresolved = missingArtwork.filter(
      (track) => !isArtworkDetails(cachedArtwork[track.id]),
    );
    if (!unresolved.length) return;
    setLoadingArtwork(true);
    try {
      const response = await fetch("/api/catalog/artwork/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tracks: unresolved.map(({ id, title, artist }) => ({ id, title, artist })),
        }),
      });
      const payload = (await response.json()) as {
        artworkById?: Record<string, ArtworkDetails>;
      };
      if (version !== searchVersion.current || !response.ok || !payload.artworkById)
        return;
      const freshArtwork = payload.artworkById;
      applyArtwork(freshArtwork);
      try {
        window.localStorage.setItem(
          "keychain-catalog-artwork-v1",
          JSON.stringify({ ...cachedArtwork, ...freshArtwork }),
        );
      } catch {
        // The current search still has its images when local storage is unavailable.
      }
    } catch {
      // Covers are optional; search results remain usable when the provider is busy.
    } finally {
      if (version === searchVersion.current) setLoadingArtwork(false);
    }
  };
  const search = async () => {
    const term = query.trim();
    if (term.length < 2) {
      setError("Enter at least two characters to search.");
      return;
    }
    const version = searchVersion.current + 1;
    searchVersion.current = version;
    setLoading(true);
    setLoadingArtwork(false);
    setError(null);
    try {
      const response = await fetch(`/api/catalog/search?q=${encodeURIComponent(term)}`);
      const payload = (await response.json()) as CatalogSearchResult & {
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "Catalog search failed.");
      if (version !== searchVersion.current) return;
      setResults(payload);
      void enrichArtwork(payload, version);
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
          {loadingArtwork && (
            <p className="catalog-artwork-progress" role="status">
              Finding album covers…
            </p>
          )}
          {results.tracks.length ? (
            <CatalogTrackList
              tracks={results.tracks}
              savedSourceIds={savedSourceIds}
              onAdd={onAdd}
            />
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
