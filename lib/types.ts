export type TrackResult = {
  fileName: string;
  bpm: number;
  tempoConfidence?: number;
  key: string;
  mode: string;
  camelot: string;
  keyConfidence: number;
  duration: number;
  manuallyVerified?: boolean;
};

export type SavedComparison = {
  id: string;
  savedAt: string;
  trackA: TrackResult;
  trackB: TrackResult;
  compatible: boolean;
  reason: string;
  tags?: string[];
  note?: string;
};

export type SavedTrack = {
  id: string;
  savedAt: string;
  track: TrackResult;
  catalog?: CatalogTrack;
  rating?: number;
  favorite?: boolean;
  note?: string;
};

export type PlaylistProject = {
  id: string;
  createdAt: string;
  name: string;
  occasion: string;
  context?: string;
  mood?: string;
  duration: number;
  startEnergy: string;
  endEnergy: string;
  trackIds?: string[];
};
import type { CatalogTrack } from "@/lib/catalog";
