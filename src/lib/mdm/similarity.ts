// Lightweight string similarity (Levenshtein-based) with Hangul-aware support.

import { decomposeHangul, normalizeName } from "./normalize";

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = a.length;
  const n = b.length;
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

export function levenshteinRatio(a: string, b: string): number {
  if (!a && !b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

// token_sort_ratio: split into tokens, sort, then ratio.
export function tokenSortRatio(a: string, b: string): number {
  const norm = (s: string) =>
    s.split(/[\s_/.-]+/).filter(Boolean).sort().join(" ").toLowerCase();
  return levenshteinRatio(norm(a), norm(b));
}

// Jamo-aware string ratio (for Korean characters).
export function jamoRatio(a: string, b: string): number {
  return levenshteinRatio(decomposeHangul(a), decomposeHangul(b));
}

// Best-of: takes max across token_sort + jamo + normalized direct match.
export function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === nb && na.length > 0) return 1;
  const s1 = levenshteinRatio(na, nb);
  const s2 = jamoRatio(a, b);
  const s3 = tokenSortRatio(a, b);
  return Math.max(s1, s2, s3);
}

// Soundex-ish for Korean: take 첫 글자 초성 + remaining chosung pattern.
const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const SOUND_GROUPS: Record<string, string> = {
  ㄱ: "1", ㄲ: "1", ㅋ: "1",
  ㄴ: "2", ㄹ: "2",
  ㄷ: "3", ㄸ: "3", ㅌ: "3",
  ㅁ: "4", ㅂ: "4", ㅃ: "4", ㅍ: "4",
  ㅅ: "5", ㅆ: "5", ㅈ: "5", ㅉ: "5", ㅊ: "5", ㅎ: "5",
  ㅇ: "6",
};

export function koSoundex(s: string): string {
  if (!s) return "";
  const chosung: string[] = [];
  for (const ch of s.replace(/\s/g, "")) {
    const code = ch.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) {
      const idx = code - 0xac00;
      const cho = Math.floor(idx / (21 * 28));
      chosung.push(CHO[cho]);
    } else if (/[a-z]/i.test(ch)) {
      chosung.push(ch.toLowerCase());
    }
  }
  const head = chosung.shift() ?? "";
  const tail = chosung
    .map((c) => SOUND_GROUPS[c] ?? c)
    .filter((c, i, arr) => i === 0 || c !== arr[i - 1])
    .slice(0, 3)
    .join("");
  return (head + tail).padEnd(4, "0").slice(0, 4);
}
