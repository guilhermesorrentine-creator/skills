// Gera public/email/personagens.png: os quatro personagens em pose de repouso, para os e-mails
// (clientes de e-mail não exibem SVG). Usa os mesmos dados dos sprites do site.
// Uso: node scripts/build-email-art.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { characters } from "../src/components/categories/sprites.js";

const ORDER = ["software", "empreendedorismo", "conteudo", "ciencia"];
const SCALE = 8;
const VIEW = { x: -5, y: -2, w: 30, h: 29 };
const GAP = 3; // em pixels do sprite
const width = (VIEW.w * ORDER.length + GAP * (ORDER.length - 1)) * SCALE;
const height = VIEW.h * SCALE;
const rgba = new Uint8Array(width * height * 4);

const hex = (value) => [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));
function paint(rows, palette, x0, y0, offset) {
  rows.forEach((row, y) => [...row].forEach((key, x) => {
    if (key === "." || !palette[key]) return;
    const [r, g, b] = hex(palette[key]);
    const px = (offset + x0 + x - VIEW.x) * SCALE;
    const py = (y0 + y - VIEW.y) * SCALE;
    for (let dy = 0; dy < SCALE; dy++) for (let dx = 0; dx < SCALE; dx++) {
      const i = ((py + dy) * width + px + dx) * 4;
      if (px + dx < 0 || px + dx >= width || py + dy < 0 || py + dy >= height) continue;
      rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b; rgba[i + 3] = 255;
    }
  }));
}

ORDER.forEach((id, index) => {
  const sprite = characters[id];
  const offset = index * (VIEW.w + GAP);
  paint(sprite.body, sprite.palette, 0, 0, offset);
  for (const layer of sprite.layers) if (!layer.when || layer.when === "idle" || layer.when === "always") paint(layer.rows, sprite.palette, layer.x, layer.y, offset);
});

// PNG mínimo: assinatura, IHDR, IDAT (zlib) e IEND, com CRC32.
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (buffer) => { let c = 0xffffffff; for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const head = Buffer.alloc(8); head.writeUInt32BE(data.length, 0); head.write(type, 4, "ascii");
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
const raw = Buffer.alloc((width * 4 + 1) * height);
for (let y = 0; y < height; y++) { raw[y * (width * 4 + 1)] = 0; Buffer.from(rgba.buffer, y * width * 4, width * 4).copy(raw, y * (width * 4 + 1) + 1); }
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);

mkdirSync(new URL("../public/email/", import.meta.url), { recursive: true });
writeFileSync(new URL("../public/email/personagens.png", import.meta.url), png);
console.log(`public/email/personagens.png ${width}x${height} (${png.length} bytes)`);
