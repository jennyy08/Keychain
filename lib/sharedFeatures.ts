import { toCamelot } from "@/lib/camelot";
import type { CatalogTrackFeatures } from "@/lib/catalog";
import { supabase } from "@/lib/supabase";

type SharedFeatureRow = {
  bpm: number | string | null;
  musical_key: string | null;
  mode: "major" | "minor" | null;
  camelot: string | null;
  confidence: number | string | null;
};

export async function lookupSharedFeatures(title: string, artist: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("shared_track_features")
    .select("bpm, musical_key, mode, camelot, confidence")
    .ilike("title", title)
    .ilike("artist", artist)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<SharedFeatureRow>();
  if (error || !data) return null;

  const bpm = Number(data.bpm);
  if (!Number.isFinite(bpm) || bpm <= 0 || !data.musical_key || !data.mode) return null;

  return {
    bpm,
    key: data.musical_key,
    mode: data.mode,
    camelot: data.camelot || toCamelot(data.musical_key, data.mode),
    confidence: Math.min(1, Math.max(0, Number(data.confidence) || 1)),
    source: "shared",
  } satisfies CatalogTrackFeatures;
}
