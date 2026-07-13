// Short, readable, unambiguous slugs for capture links (no 0/O/1/l/I).
const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

export function makeSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  let rand = "";
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  for (const b of bytes) rand += ALPHABET[b % ALPHABET.length];
  return base ? `${base}-${rand}` : rand;
}
