"use client";

import { FormEvent, useEffect, useState } from "react";
import Header from "@/components/Header";
import { toCamelot } from "@/lib/camelot";
import type { CatalogSearchResult, CatalogTrack } from "@/lib/catalog";
import { supabase } from "@/lib/supabase";

const KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [signedInAs, setSignedInAs] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CatalogTrack[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<CatalogTrack | null>(null);
  const [form, setForm] = useState({
    title: "",
    artist: "",
    album: "",
    bpm: "",
    musicalKey: "C",
    mode: "major" as "major" | "minor",
  });

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth
      .getUser()
      .then(({ data }) => setSignedInAs(data.user?.email ?? null));
  }, []);

  if (!supabase) {
    return (
      <div className="app-shell">
        <Header />
        <main className="main-content">
          <p className="error-message">
            Supabase is not configured for this deployment yet.
          </p>
        </main>
      </div>
    );
  }
  const client = supabase;

  const authenticate = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    const result = creatingAccount
      ? await client.auth.signUp({ email, password })
      : await client.auth.signInWithPassword({ email, password });
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    const userEmail = result.data.user?.email;
    setSignedInAs(userEmail ?? null);
    setMessage(
      creatingAccount && !result.data.session
        ? "Check your email to confirm the account, then sign in."
        : "Signed in. Your database rules decide whether you can publish data.",
    );
  };

  const saveFeature = async (event: FormEvent) => {
    event.preventDefault();
    const bpm = Number(form.bpm);
    if (!Number.isFinite(bpm) || bpm < 40 || bpm > 300) {
      setMessage("Enter a BPM between 40 and 300.");
      return;
    }
    setSaving(true);
    setMessage(null);
    const { error } = await client.from("shared_track_features").upsert(
      {
        title: form.title.trim(),
        artist: form.artist.trim(),
        album: form.album.trim() || null,
        bpm,
        musical_key: form.musicalKey,
        mode: form.mode,
        camelot: toCamelot(form.musicalKey, form.mode),
        confidence: 1,
        source: "manual",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "artist,title" },
    );
    setSaving(false);
    if (error) {
      setMessage(
        "Couldn’t publish this. Make sure you’re signed in with your admin email.",
      );
      return;
    }
    setMessage("Shared transition data published. Everyone can now read it.");
    setForm({
      title: "",
      artist: "",
      album: "",
      bpm: "",
      musicalKey: "C",
      mode: "major",
    });
    setSelectedTrack(null);
  };

  const searchCatalog = async () => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchError("Enter at least two characters to search.");
      return;
    }
    setSearching(true);
    setSearchError(null);
    try {
      const response = await fetch(
        `/api/catalog/search?q=${encodeURIComponent(query)}`,
      );
      const payload = (await response.json()) as CatalogSearchResult & {
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "Catalog search failed.");
      setSearchResults(payload.tracks);
    } catch (caught) {
      setSearchResults(null);
      setSearchError(
        caught instanceof Error ? caught.message : "Catalog search failed.",
      );
    } finally {
      setSearching(false);
    }
  };

  const selectTrack = (track: CatalogTrack) => {
    setSelectedTrack(track);
    setForm((current) => ({
      ...current,
      title: track.title,
      artist: track.artist,
      album: track.album ?? "",
    }));
    setSearchResults(null);
    setSearchQuery("");
  };

  return (
    <div className="app-shell">
      <Header />
      <main className="main-content admin-page">
        <section className="hero admin-hero">
          <p className="eyebrow">Private editor</p>
          <h1>
            Publish <em>verified</em> transition data.
          </h1>
          <p className="hero-copy">
            These values are shared with everyone who searches the matching artist and
            title. Personal corrections in the app remain local.
          </p>
        </section>
        {!signedInAs ? (
          <form className="admin-panel" onSubmit={authenticate}>
            <h2>{creatingAccount ? "Create your admin account" : "Admin sign in"}</h2>
            <p>
              Only the email allowed by your database rules can publish shared data.
            </p>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            <button className="save-button" type="submit">
              {creatingAccount ? "Create account" : "Sign in"}
            </button>
            <button
              className="quiet-button"
              type="button"
              onClick={() => setCreatingAccount(!creatingAccount)}
            >
              {creatingAccount ? "I already have an account" : "Create my account"}
            </button>
          </form>
        ) : (
          <form className="admin-panel" onSubmit={saveFeature}>
            <div className="admin-panel-heading">
              <div>
                <p className="section-kicker">Signed in</p>
                <h2>{signedInAs}</h2>
              </div>
              <button
                className="quiet-button"
                type="button"
                onClick={() =>
                  void client.auth.signOut().then(() => setSignedInAs(null))
                }
              >
                Sign out
              </button>
            </div>
            <p>
              Search the catalog, choose the exact track, then publish its verified
              data.
            </p>
            {!selectedTrack ? (
              <div className="admin-track-picker">
                <div className="catalog-search-form">
                  <label>
                    <span className="sr-only">Search the catalog</span>
                    <input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search a song or artist"
                      maxLength={100}
                    />
                  </label>
                  <button
                    className="save-button"
                    type="button"
                    disabled={searching}
                    onClick={() => void searchCatalog()}
                  >
                    {searching ? "Searching…" : "Search catalog"}
                  </button>
                </div>
                {searchError && (
                  <p className="catalog-message catalog-message--error" role="alert">
                    {searchError}
                  </p>
                )}
                {searchResults &&
                  (searchResults.length ? (
                    <div className="admin-search-results">
                      {searchResults.map((track) => (
                        <button
                          type="button"
                          key={track.id}
                          onClick={() => selectTrack(track)}
                        >
                          <span>
                            <strong>{track.title}</strong>
                            <small>
                              {track.artist}
                              {track.album ? ` · ${track.album}` : ""}
                            </small>
                          </span>
                          <b>Select</b>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-library">
                      No songs found. Try a more specific search.
                    </p>
                  ))}
              </div>
            ) : (
              <div className="admin-selected-track">
                <div>
                  <strong>{selectedTrack.title}</strong>
                  <span>
                    {selectedTrack.artist}
                    {selectedTrack.album ? ` · ${selectedTrack.album}` : ""}
                  </span>
                </div>
                <button
                  className="quiet-button"
                  type="button"
                  onClick={() => setSelectedTrack(null)}
                >
                  Choose another
                </button>
              </div>
            )}
            {selectedTrack && (
              <div className="admin-fields">
                <label>
                  BPM
                  <input
                    type="number"
                    min="40"
                    max="300"
                    step="0.1"
                    value={form.bpm}
                    onChange={(event) => setForm({ ...form, bpm: event.target.value })}
                    required
                  />
                </label>
                <label>
                  Key
                  <select
                    value={form.musicalKey}
                    onChange={(event) =>
                      setForm({ ...form, musicalKey: event.target.value })
                    }
                  >
                    {KEYS.map((key) => (
                      <option key={key}>{key}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Mode
                  <select
                    value={form.mode}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        mode: event.target.value as "major" | "minor",
                      })
                    }
                  >
                    <option value="major">Major</option>
                    <option value="minor">Minor</option>
                  </select>
                </label>
              </div>
            )}
            <p className="admin-camelot">
              Camelot: <strong>{toCamelot(form.musicalKey, form.mode)}</strong>
            </p>
            <button
              className="save-button"
              type="submit"
              disabled={saving || !selectedTrack}
            >
              {saving ? "Publishing…" : "Publish shared data"}
            </button>
          </form>
        )}
        {message && (
          <p className="library-message" role="status">
            {message}
          </p>
        )}
      </main>
    </div>
  );
}
