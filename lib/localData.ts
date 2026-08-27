import { createLocalStore } from "./localStore";
import type { PlaylistProject, SavedComparison, SavedTrack } from "./types";

export const comparisonsStore = createLocalStore<SavedComparison>(
  "keychain-comparisons-v1",
);
export const tracksStore = createLocalStore<SavedTrack>("keychain-tracks-v1");
export const playlistsStore = createLocalStore<PlaylistProject>(
  "keychain-playlists-v1",
);
