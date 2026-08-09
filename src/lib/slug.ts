// Short, readable, unambiguous slugs for capture links (no 0/O/1/l/I).
const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

// 8 characters of a 31-symbol alphabet ≈ 40 bits. It was 4 (≈20 bits), which
// is guessable in bulk against a stem anybody can read off a printed QR code —
// and the capture page is the only public write path. Audit F-020.
const RANDOM_LEN = 8;

// Largest multiple of the alphabet size that fits in a byte (248 for 31).
// Bytes at or above it are thrown away rather than folded with %, which would
// make the first 8 symbols ~3% likelier than the rest.
const UNBIASED_MAX = Math.floor(256 / ALPHABET.length) * ALPHABET.length;

function randomChars(n: number): string {
  let out = "";
  while (out.length < n) {
    // Over-draw so the common case is a single call even with rejections.
    const bytes = crypto.getRandomValues(new Uint8Array(n - out.length + 8));
    for (const b of bytes) {
      if (out.length >= n) break;
      if (b >= UNBIASED_MAX) continue;
      out += ALPHABET[b % ALPHABET.length];
    }
  }
  return out;
}

export function makeSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24)
    // Trim again: the slice can land mid-separator and put a trailing hyphen
    // back, which then reads as "…festival--2b9a6ycn" on a printed QR card.
    .replace(/-+$/, "");
  const rand = randomChars(RANDOM_LEN);
  return base ? `${base}-${rand}` : rand;
}
