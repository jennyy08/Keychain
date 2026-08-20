/**
 * Decodes an uploaded audio file (mp3, wav, etc.) into raw PCM samples
 * using the browser's built-in Web Audio API - this is what replaces
 * librosa.load() from the Python version. No server, no upload to
 * anywhere - the decoding happens entirely on the user's own machine.
 */
export async function decodeAudioFile(file: File): Promise<{ samples: Float32Array; sampleRate: number; duration: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // If stereo, mix down to mono by averaging channels - our analysis
  // only needs the overall waveform, not left/right separation.
  let samples: Float32Array;
  if (audioBuffer.numberOfChannels > 1) {
    const left = audioBuffer.getChannelData(0);
    const right = audioBuffer.getChannelData(1);
    samples = new Float32Array(left.length);
    for (let i = 0; i < left.length; i++) samples[i] = (left[i] + right[i]) / 2;
  } else {
    samples = audioBuffer.getChannelData(0);
  }

  const sampleRate = audioBuffer.sampleRate;
  const duration = audioBuffer.duration;
  await audioContext.close();

  return { samples, sampleRate, duration };
}
