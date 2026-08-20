/**
 * Fast Fourier Transform - Cooley-Tukey radix-2 algorithm.
 *
 * This is THE foundational tool of audio analysis: it converts a chunk
 * of raw waveform (amplitude values over time) into frequency data
 * (how much energy is present at each pitch/frequency). Everything
 * else in this project - tempo detection, key detection - is built on
 * top of repeatedly running FFT on small windows of the audio.
 *
 * Requires the input length to be a power of 2 (radix-2 constraint) -
 * callers are responsible for padding/framing to a power-of-2 size.
 */

export type Complex = { re: number; im: number };

export function fft(input: Float32Array): Complex[] {
  const n = input.length;
  if (n & (n - 1)) {
    throw new Error(`FFT input length must be a power of 2, got ${n}`);
  }

  let signal: Complex[] = Array.from({ length: n }, (_, i) => ({ re: input[i], im: 0 }));

  if (n === 1) return signal;

  // Bit-reversal permutation: reorders samples so the iterative
  // butterfly algorithm below can work in-place without recursion.
  const bits = Math.log2(n);
  const reversed = new Array(n);
  for (let i = 0; i < n; i++) {
    let rev = 0;
    for (let b = 0; b < bits; b++) {
      rev |= ((i >> b) & 1) << (bits - 1 - b);
    }
    reversed[i] = signal[rev];
  }
  signal = reversed;

  // Iterative Cooley-Tukey: combine pairs, then quadruples, then
  // octets, etc. - classic divide-and-conquer FFT, done bottom-up.
  for (let size = 2; size <= n; size *= 2) {
    const halfSize = size / 2;
    const angleStep = (-2 * Math.PI) / size;
    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < halfSize; k++) {
        const angle = angleStep * k;
        const twiddle: Complex = { re: Math.cos(angle), im: Math.sin(angle) };
        const even = signal[start + k];
        const odd = signal[start + k + halfSize];

        const oddTwiddled: Complex = {
          re: odd.re * twiddle.re - odd.im * twiddle.im,
          im: odd.re * twiddle.im + odd.im * twiddle.re,
        };

        signal[start + k] = { re: even.re + oddTwiddled.re, im: even.im + oddTwiddled.im };
        signal[start + k + halfSize] = { re: even.re - oddTwiddled.re, im: even.im - oddTwiddled.im };
      }
    }
  }

  return signal;
}

/** Magnitude spectrum: how much energy is present at each frequency bin. */
export function magnitudeSpectrum(complexSignal: Complex[]): number[] {
  return complexSignal.map((c) => Math.sqrt(c.re * c.re + c.im * c.im));
}

/** Next power of 2 >= n, for padding arbitrary-length frames before FFT. */
export function nextPowerOf2(n: number): number {
  return Math.pow(2, Math.ceil(Math.log2(n)));
}
