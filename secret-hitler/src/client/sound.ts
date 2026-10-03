"use client";

// Tiny synthesised sound effects (no audio files). Off by default.

let ctx: AudioContext | null = null;
let enabled = false;

export function setSoundEnabled(on: boolean) {
  enabled = on;
  if (on && !ctx) {
    try {
      ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {}
  }
  void ctx?.resume?.();
}

function noise(duration: number) {
  const c = ctx!;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * duration), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  return src;
}

/** A rubber-stamp thud. */
export function playStamp() {
  if (!enabled || !ctx) return;
  const c = ctx;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.frequency.setValueAtTime(140, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.18);
  g.gain.setValueAtTime(0.9, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.3);
  const n = noise(0.08);
  const ng = c.createGain();
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 1200;
  ng.gain.setValueAtTime(0.5, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  n.connect(f).connect(ng).connect(c.destination);
  n.start(t);
}

/** A short snare drumroll ending in a hit. */
export function playDrumroll(duration = 1.1) {
  if (!enabled || !ctx) return;
  const c = ctx;
  const t = c.currentTime;
  const n = noise(duration);
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = 1800;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0, t);
  g.gain.linearRampToValueAtTime(0.35, t + duration);
  const lfo = c.createOscillator();
  const lg = c.createGain();
  lfo.frequency.value = 28;
  lg.gain.value = 0.25;
  lfo.connect(lg).connect(g.gain);
  n.connect(f).connect(g).connect(c.destination);
  n.start(t);
  lfo.start(t);
  lfo.stop(t + duration);
  setTimeout(playStamp, duration * 1000);
}
