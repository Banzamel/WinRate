// Draws build/icon.png (256x256): a gold lottery ball with a dark "7". No dependencies.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const S = 256;
const px = Buffer.alloc(S * S * 4);
const set = (x, y, [r, g, b, a]) => { const i = (y * S + x) * 4; px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a; };
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

// 7-segment style "7": top bar and a diagonal stroke.
const inSeven = (x, y) => {
  const top = y >= 78 && y <= 104 && x >= 82 && x <= 191;
  const t = (y - 104) / (182 - 104);
  const cx = 176 - t * 62;
  const diag = y > 96 && y <= 182 && Math.abs(x - cx) <= 15;
  return top || diag;
};

for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    const dx = x + 0.5 - S / 2; const dy = y + 0.5 - S / 2;
    const d = Math.sqrt(dx * dx + dy * dy);
    const R = 120;
    if (d > R + 1) { set(x, y, [0, 0, 0, 0]); continue; }
    // Shading: light from the top left.
    const l = Math.sqrt((x - 88) ** 2 + (y - 80) ** 2) / (R * 1.6);
    let c = mix([255, 226, 150], [176, 112, 16], Math.min(1, l));
    if (inSeven(x, y)) c = [42, 28, 0];
    const alpha = d > R ? Math.round(255 * (R + 1 - d)) : 255;
    set(x, y, [...c, alpha]);
  }
}

const crc = (buf) => { let c = ~0; for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body));
  return Buffer.concat([len, body, sum]);
};
const header = Buffer.alloc(13);
header.writeUInt32BE(S, 0); header.writeUInt32BE(S, 4); header[8] = 8; header[9] = 6;
const raw = Buffer.alloc((S * 4 + 1) * S);
for (let y = 0; y < S; y++) { raw[y * (S * 4 + 1)] = 0; px.copy(raw, y * (S * 4 + 1) + 1, y * S * 4, (y + 1) * S * 4); }
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
const out = path.join(__dirname, '..', 'build', 'icon.png');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, png);
console.log(`icon -> ${out}`);
