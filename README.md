## Keychain

Keychain is a private, browser-based music planner. Add two audio files and it estimates their BPM and musical key, maps both to Camelot notation, and explains how naturally they flow together. Use it to plan listening sessions, parties, workouts, drives, or DJ sets from your own library.

## Local setup

Catalog integrations use private environment variables. Copy `.env.example` to
`.env.local`, then add the relevant key. `.env.local` is ignored by Git and must
never be committed. GetSongBPM requires an attribution link to
[getsongbpm.com](https://getsongbpm.com/) in a deployed app.

Audio is decoded and analyzed locally; files are never uploaded to a server.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the app.

Supported input includes MP3, WAV, M4A, AAC, OGG, and FLAC when the browser can decode the codec. Analysis estimates are a practical starting point—preview the transition and use your ears for the final call.
