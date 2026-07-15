// Fuzzy person-name matching for the "own reports only" guard.
//
// Names printed on lab reports are messy: titles ("Mr./Mrs./Dr."), reordered
// (surname first), extra initials, casing, and OCR noise. So we never do an
// exact string compare — we normalise both names and score their similarity,
// tolerating those variations while still rejecting a genuinely different person.

const TITLES = new Set(['mr', 'mrs', 'ms', 'miss', 'dr', 'master', 'mstr', 'baby', 'smt', 'shri', 'sri', 'md']);

/** Lowercase, strip titles/punctuation, collapse whitespace → array of tokens. */
function normalizeTokens(name) {
  if (!name || typeof name !== 'string') return [];
  return name
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ') // drop digits/punctuation (keeps letters + spaces)
    .split(/\s+/)
    .filter((t) => t && !TITLES.has(t));
}

/** Classic Levenshtein edit distance. */
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[b.length];
}

/** Levenshtein similarity as a 0..1 ratio. */
function levenshteinRatio(a, b) {
  if (!a.length && !b.length) return 1;
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : 1 - levenshtein(a, b) / maxLen;
}

/**
 * Similarity between two names, 0..1.
 * Combines two signals and takes the stronger:
 *  - token-subset overlap  → handles "Yash" vs "Yash Sharma" and reordering
 *  - Levenshtein on sorted tokens → handles minor spelling/OCR drift
 * Returns { score, unknown }. `unknown` is true when either name has no usable
 * tokens (e.g. an X-ray with no printed name) — the caller should NOT reject then.
 */
function nameSimilarity(a, b) {
  const ta = normalizeTokens(a);
  const tb = normalizeTokens(b);
  if (!ta.length || !tb.length) return { score: 0, unknown: true };

  const setA = new Set(ta);
  const setB = new Set(tb);
  let shared = 0;
  for (const t of setA) if (setB.has(t)) shared++;
  const subsetScore = shared / Math.min(setA.size, setB.size);

  const levScore = levenshteinRatio([...ta].sort().join(' '), [...tb].sort().join(' '));

  return { score: Math.max(subsetScore, levScore), unknown: false };
}

// Below this, two names are treated as different people.
const MATCH_THRESHOLD = 0.72;

/**
 * Decide whether `candidate` is the same person as the account owner.
 * @param candidate  name read off the newly uploaded report
 * @param owner      the stored account owner name
 * @param aliases    previously-confirmed alternate spellings
 * @returns { match: boolean, unknown: boolean, score: number }
 *   unknown=true  → couldn't read a name; caller should allow (fail-open)
 *   match=true    → same person; allow
 *   match=false   → different person; hold the report
 */
function matchesOwner(candidate, owner, aliases = []) {
  const names = [owner, ...aliases].filter(Boolean);
  if (!names.length) return { match: true, unknown: true, score: 0 }; // no owner set yet

  let best = { score: 0, unknown: true };
  for (const n of names) {
    const s = nameSimilarity(candidate, n);
    if (s.unknown) continue;
    if (s.score > best.score) best = s;
  }
  if (best.unknown) return { match: true, unknown: true, score: 0 }; // candidate unreadable → allow
  return { match: best.score >= MATCH_THRESHOLD, unknown: false, score: best.score };
}

module.exports = { normalizeTokens, nameSimilarity, matchesOwner, MATCH_THRESHOLD };
