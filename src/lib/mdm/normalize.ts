// String normalization utilities for entity resolution.
// - Removes Korean legal suffixes ((주), 주식회사, 주식회사 등)
// - Strips bracketed annotations, punctuation, whitespace
// - Lowercases; preserves Korean characters & digits

const LEGAL_SUFFIX_PATTERNS = [
  /\(주\)/g,
  /\(유\)/g,
  /\(재\)/g,
  /\(사\)/g,
  /㈜/g,
  /\bInc\.?\b/gi,
  /\bLtd\.?\b/gi,
  /\bLLC\b/gi,
  /\bCo\.?\b/gi,
  /\bCorp\.?\b/gi,
  /\bCorporation\b/gi,
  /\bGmbH\b/gi,
  /\bPLC\b/gi,
  /\bAG\b/gi,
  /주식회사/g,
  /유한회사/g,
  /재단법인/g,
  /사단법인/g,
];

const PUNCT = /[()\[\]{}<>"'`,.\-/_·•‧:;|]/g;

export function normalizeName(input: string): string {
  if (!input) return "";
  let s = input.normalize("NFKC");
  for (const re of LEGAL_SUFFIX_PATTERNS) s = s.replace(re, "");
  s = s.replace(PUNCT, "");
  s = s.replace(/\s+/g, "");
  s = s.toLowerCase();
  return s;
}

export function extractDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();
    // eTLD+1 approximation
    const parts = host.split(".");
    if (parts.length <= 2) return host;
    const tld2 = parts.slice(-2).join(".");
    // Handle common 2nd-level TLDs (.co.kr, .ne.kr, .or.kr)
    const lastThree = parts.slice(-3).join(".");
    if (/\.(co|ne|or|ac|go|re)\.[a-z]{2}$/.test(lastThree)) return lastThree;
    return tld2;
  } catch {
    return null;
  }
}

export function emailDomain(email: string | null | undefined): string | null {
  if (!email || !email.includes("@")) return null;
  return email.split("@")[1].toLowerCase();
}

// Decompose Hangul syllables into jamo for sub-character similarity.
// Returns an array of jamo for each syllable.
const HANGUL_OFFSET = 0xac00;
const JONG_COUNT = 28;
const JUNG_COUNT = 21;

export function decomposeHangul(s: string): string {
  const out: string[] = [];
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) {
      const idx = code - HANGUL_OFFSET;
      const cho = Math.floor(idx / (JUNG_COUNT * JONG_COUNT));
      const jung = Math.floor((idx % (JUNG_COUNT * JONG_COUNT)) / JONG_COUNT);
      const jong = idx % JONG_COUNT;
      const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
      const JUNG = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ";
      const JONG = " ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ";
      out.push(CHO[cho], JUNG[jung]);
      if (jong !== 0) out.push(JONG[jong]);
    } else {
      out.push(ch);
    }
  }
  return out.join("").replace(/\s/g, "");
}
