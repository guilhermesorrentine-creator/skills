// Gera marketing/avatar.png (1080×1080): foto de perfil das redes, com o Hacker de terminal em
// pose de repouso sobre o roxo da marca. Mesmos dados dos sprites do site.
// Uso: node scripts/build-avatar.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { characters } from "../src/components/categories/sprites.js";

const SIZE = 1080;
const SCALE = 30;
const BG = [0x74, 0x45, 0xc7];
const GLOW = [0x8f, 0x63, 0xdb];
const rgba = new Uint8Array(SIZE * SIZE * 4);
for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
  const d = Math.hypot(x - SIZE / 2, y - SIZE / 2) / (SIZE / 2);
  const t = Math.max(0, 1 - d);
  const i = (y * SIZE + x) * 4;
  for (let c = 0; c < 3; c++) rgba[i + c] = Math.round(BG[c] + (GLOW[c] - BG[c]) * t);
  rgba[i + 3] = 255;
}

const sprite = characters.software;
const hex = (value) => [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));
// Corpo de 20×24 pixels de sprite, centrado (o círculo do Instagram corta os cantos).
const ox = Math.round((SIZE - 20 * SCALE) / 2);
const oy = Math.round((SIZE - 24 * SCALE) / 2) + SCALE;
function paint(rows, x0, y0) {
  rows.forEach((row, y) => [...row].forEach((key, x) => {
    if (key === "." || !sprite.palette[key]) return;
    const [r, g, b] = hex(sprite.palette[key]);
    const px = ox + (x0 + x) * SCALE;
    const py = oy + (y0 + y) * SCALE;
    for (let dy = 0; dy < SCALE; dy++) for (let dx = 0; dx < SCALE; dx++) {
      if (px + dx < 0 || px + dx >= SIZE || py + dy < 0 || py + dy >= SIZE) continue;
      const i = ((py + dy) * SIZE + px + dx) * 4;
      rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b;
    }
  }));
}
paint(sprite.body, 0, 0);
for (const layer of sprite.layers) if (!layer.when || layer.when === "idle" || layer.when === "always") paint(layer.rows, layer.x, layer.y);

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (buffer) => { let c = 0xffffffff; for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const head = Buffer.alloc(8); head.writeUInt32BE(data.length, 0); head.write(type, 4, "ascii");
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0); ihdr.writeUInt32BE(SIZE, 4); ihdr[8] = 8; ihdr[9] = 6;
const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
for (let y = 0; y < SIZE; y++) Buffer.from(rgba.buffer, y * SIZE * 4, SIZE * 4).copy(raw, y * (SIZE * 4 + 1) + 1);
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);

mkdirSync(new URL("../marketing/", import.meta.url), { recursive: true });
writeFileSync(new URL("../marketing/avatar.png", import.meta.url), png);
console.log(`marketing/avatar.png ${SIZE}x${SIZE} (${png.length} bytes)`);
