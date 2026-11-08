// xoshiro128** — fast and seedable; without a seed the state comes from crypto.
export interface Rng {
  next(): number; // [0, 1)
  int(n: number): number; // 0..n-1
}

function seedState(seed?: number | null): number[] {
  if (seed === undefined || seed === null) return Array.from(globalThis.crypto.getRandomValues(new Uint32Array(4)));
  let x = seed >>> 0; // splitmix32 spreads a numeric seed over the four state words
  return [0, 0, 0, 0].map(() => {
    x = (x + 0x9e3779b9) >>> 0;
    let z = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
    return (z ^ (z >>> 16)) >>> 0;
  });
}

export function createRng(seed?: number | null): Rng {
  let [a, b, c, d] = seedState(seed);
  if (!(a | b | c | d)) a = 1;
  const next = () => {
    const m = Math.imul(b, 5);
    const r = Math.imul((m << 7) | (m >>> 25), 9);
    const t = b << 9;
    c ^= a; d ^= b; b ^= c; a ^= d; c ^= t; d = (d << 11) | (d >>> 21);
    return (r >>> 0) / 4294967296;
  };
  return { next, int: (n) => Math.floor(next() * n) };
}
