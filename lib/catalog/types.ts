export type CatalogSource = "lastfm" | "musicbrainz" | "getsongbpm";

export type TrackFeatureSource = "catalog" | "local" | "manual";

export type CatalogTrackFeatures = {
  bpm?: number;
  key?: string;
  camelot?: string;
  mode?: "major" | "minor";
  energy?: number;
  danceability?: number;
  confidence?: number;
  source: TrackFeatureSource;
};

export type CatalogTrack = {
  id: string;
  source: CatalogSource;
  sourceId: string;
  title: string;
  artist: string;
  album?: string;
  artworkUrl?: string;
  duration?: number;
  externalUrl?: string;
  tags: string[];
  features?: CatalogTrackFeatures;
};

export type CatalogSearchResult = {
  tracks: CatalogTrack[];
  attribution?: {
    label: string;
    url: string;
  };
};

export interface CatalogProvider {
  source: CatalogSource;
  search(query: string, artist?: string): Promise<CatalogSearchResult>;
}
