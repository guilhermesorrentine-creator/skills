// Trilha 8-bit suave (60 s, 112 bpm) para ficar por baixo da narração: baixo, arpejo e chimbal leves.
import { writeFileSync } from "node:fs";
const RATE = 44100, LENGTH = 60, BEAT = 60 / 112, out = new Float32Array(RATE * LENGTH);
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
const tone = (start, dur, freq, wave, vol, duty = 0.5) => {
  const s0 = Math.floor(start * RATE), n = Math.floor(dur * RATE); let ph = 0;
  for (let i = 0; i < n && s0 + i < out.length; i++) { const t = i / RATE; ph = (ph + freq / RATE) % 1;
    const v = wave === "sq" ? (ph < duty ? 1 : -1) : 1 - 4 * Math.abs(ph - 0.5);
    out[s0 + i] += v * vol * Math.min(1, t / 0.005) * Math.max(0, 1 - t / dur) ** 0.7; }
};
let s = 3; const rn = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const hat = (start) => { const s0 = Math.floor(start * RATE), n = Math.floor(0.03 * RATE); for (let i = 0; i < n; i++) out[s0 + i] += rn() * 0.05 * (1 - i / n) ** 2; };
const chords = [[48, 60, 64, 67], [45, 57, 60, 64], [41, 53, 57, 60], [43, 55, 59, 62]];
for (let b = 0; b * BEAT < LENGTH; b++) {
  const t = b * BEAT, [bass, ...arp] = chords[Math.floor(b / 4) % 4];
  tone(t, BEAT * 0.8, hz(bass), "tri", 0.3);
  for (let k = 0; k < 2; k++) tone(t + (k * BEAT) / 2, BEAT / 2, hz(arp[(b + k) % 3] + 12), "sq", 0.05, 0.25);
  hat(t + BEAT / 2);
}
const data = Buffer.alloc(out.length * 2);
out.forEach((v, i) => data.writeInt16LE(Math.round(Math.tanh(v) * 0.8 * 32767), i * 2));
const h = Buffer.alloc(44);
h.write("RIFF", 0); h.writeUInt32LE(36 + data.length, 4); h.write("WAVE", 8); h.write("fmt ", 12); h.writeUInt32LE(16, 16);
h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(RATE, 24); h.writeUInt32LE(RATE * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
h.write("data", 36); h.writeUInt32LE(data.length, 40);
writeFileSync("assets/trilha.wav", Buffer.concat([h, data]));
