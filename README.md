## Keychain

Keychain is a browser-based harmonic mixing helper. Add two audio files and it estimates their BPM and musical key, maps both to Camelot notation, and explains whether they are likely to mix cleanly.

Audio is decoded and analyzed locally; files are never uploaded to a server.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the app.

Supported input includes MP3, WAV, M4A, AAC, OGG, and FLAC when the browser can decode the codec. Analysis estimates are a practical starting point—preview the transition and use your ears for the final call.
