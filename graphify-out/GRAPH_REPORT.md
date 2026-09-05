# Graph Report - keychain-app (2026-09-04)

## Corpus Check

- Corpus is ~15,155 words - fits in a single context window. You may not need a graph.

## Summary

- 285 nodes · 487 edges · 23 communities (12 shown, 9 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)

- Local library management
- Artwork enrichment
- TypeScript build settings
- Feature data and admin
- Playlist compatibility flow
- Application dependencies
- Catalog discovery UI
- Audio comparison engine
- Developer tooling
- Last.fm catalog integration
- Next.js agent guidance
- Legacy track upload
- Prettier configuration
- Product overview
- Root application shell
- Legacy result card
- Legacy track result card
- Legacy upload zone
- ESLint configuration
- Next.js configuration
- PostCSS configuration

## God Nodes (most connected - your core abstractions)

1. `compilerOptions` - 16 edges
2. `toCamelot()` - 13 edges
3. `camelotCompatibility()` - 10 edges
4. `CatalogTrack` - 10 edges
5. `detectKey()` - 9 edges
6. `HomePage()` - 8 edges
7. `Icon()` - 8 edges
8. `tempoAdjustment()` - 8 edges
9. `ComparePage()` - 7 edges
10. `lookupGetSongBpmFeatures()` - 7 edges

## Surprising Connections (you probably didn't know these)

- `SavedTrackCard()` --calls--> `toCamelot()` [EXTRACTED]
  components/features/LibrarySection.tsx → lib/camelot.ts
- `POST()` --calls--> `resolveArtwork()` [EXTRACTED]
  app/api/catalog/artwork/route.ts → lib/catalog/artwork.ts
- `GET()` --calls--> `searchLastFmTracks()` [EXTRACTED]
  app/api/catalog/search/route.ts → lib/catalog/lastfm.ts
- `GET()` --calls--> `findLastFmSimilarTracks()` [EXTRACTED]
  app/api/catalog/similar/route.ts → lib/catalog/lastfm.ts
- `ComparePage()` --calls--> `camelotCompatibility()` [EXTRACTED]
  components/ComparePage.tsx → lib/camelot.ts

## Import Cycles

- None detected.

## Communities (23 total, 9 thin omitted)

### Community 0 - "Local library management"

Cohesion: 0.10
Nodes (27): CompareWorkspace(), formatFileSize(), isAudioFile(), TrackSlot(), LibrarySection(), ManualTransitionData, MUSICAL_KEYS, SavedTrackCard() (+19 more)

### Community 1 - "Artwork enrichment"

Cohesion: 0.11
Nodes (24): ArtworkRequest, isValidTrack(), POST(), ValidTrack, ArtworkRequest, POST(), AppleArtwork, AppleSearchResponse (+16 more)

### Community 2 - "TypeScript build settings"

Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/\*.mts, .next/dev/types/**/_.ts, next-env.d.ts, .next/types/\**/_.ts, node_modules (+20 more)

### Community 3 - "Feature data and admin"

Cohesion: 0.14
Nodes (18): FeatureRequest, POST(), AdminPage(), KEYS, CAMELOT_MAP, Mode, toCamelot(), artistName() (+10 more)

### Community 4 - "Playlist compatibility flow"

Cohesion: 0.17
Nodes (18): formatDuration(), MixResults(), NOTE_NAMES, ResultCard(), formatRuntime(), getSuggestions(), hasTransitionData(), PlaylistPlanner() (+10 more)

### Community 5 - "Application dependencies"

Cohesion: 0.09
Nodes (21): lucide-react, next, dependencies, lucide-react, next, react, react-dom, @supabase/supabase-js (+13 more)

### Community 6 - "Catalog discovery UI"

Cohesion: 0.20
Nodes (13): CatalogSources(), CatalogTrackList(), ArtworkDetails, CachedArtwork, CatalogSearch(), isArtworkDetails(), SimilarRecommendations(), CatalogProvider (+5 more)

### Community 7 - "Audio comparison engine"

Cohesion: 0.18
Nodes (14): ComparePage(), computeSTFT(), correlation(), detectKey(), detectTempo(), frequencyToPitchClass(), HANN, MAJOR_PROFILE (+6 more)

### Community 8 - "Developer tooling"

Cohesion: 0.11
Nodes (19): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, prettier, tailwindcss, @tailwindcss/postcss (+11 more)

### Community 9 - "Last.fm catalog integration"

Cohesion: 0.20
Nodes (14): GET(), GET(), hasUsableArtwork(), attribution(), findLastFmSimilarTracks(), getArtwork(), LastFmImage, LastFmSearchResponse (+6 more)

### Community 12 - "Prettier configuration"

Cohesion: 0.50
Nodes (3): printWidth, singleQuote, trailingComma

### Community 13 - "Product overview"

Cohesion: 0.50
Nodes (4): Camelot Notation, GetSongBPM, Keychain, Local Audio Analysis

## Knowledge Gaps

- **95 isolated node(s):** `printWidth`, `singleQuote`, `trailingComma`, `ArtworkRequest`, `ValidTrack` (+90 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 117 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **Why does `CatalogTrack` connect `Catalog discovery UI` to `Local library management`, `Last.fm catalog integration`, `Feature data and admin`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `toCamelot()` connect `Feature data and admin` to `Local library management`, `Audio comparison engine`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Developer tooling` to `Application dependencies`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `printWidth`, `singleQuote`, `trailingComma` to the rest of the system?**
  _95 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Local library management` be split into smaller, more focused modules?**
  _Cohesion score 0.10409745293466224 - nodes in this community are weakly interconnected._
- **Should `Artwork enrichment` be split into smaller, more focused modules?**
  _Cohesion score 0.10574712643678161 - nodes in this community are weakly interconnected._
- **Should `TypeScript build settings` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
