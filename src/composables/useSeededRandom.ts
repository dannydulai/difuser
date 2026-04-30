// Mulberry32 PRNG - deterministic random from seed
export function createSeededRandom(seed: number) {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function seededRandomInRange(
  rng: () => number,
  min: number,
  max: number,
  increment: number
): number {
  const steps = Math.floor((max - min) / increment)
  const step = Math.floor(rng() * (steps + 1))
  return min + step * increment
}
