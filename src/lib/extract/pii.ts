// PII detection & masking. Regex first-pass; LLM fallback is mocked (deterministic).

export interface PiiHit {
  type: "email" | "phone" | "rrn" | "card" | "account";
  raw: string;
  masked: string;
  start: number;
  end: number;
}

export interface PiiResult {
  redacted: string;
  hits: PiiHit[];
}

const PATTERNS: Array<{
  type: PiiHit["type"];
  re: RegExp;
  mask: (m: string) => string;
}> = [
  {
    type: "email",
    re: /[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}/g,
    mask: (m) => {
      const [local, domain] = m.split("@");
      return `${local[0] ?? ""}${"*".repeat(Math.max(local.length - 1, 1))}@${domain}`;
    },
  },
  {
    type: "phone",
    re: /01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/g,
    mask: (m) => {
      const digits = m.replace(/\D/g, "");
      return `${digits.slice(0, 3)}-XXXX-${digits.slice(-4)}`;
    },
  },
  {
    type: "rrn",
    re: /\d{6}[-.\s]?[1-4]\d{6}/g,
    mask: () => "******-*******",
  },
  {
    type: "card",
    re: /\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b/g,
    mask: () => "****-****-****-****",
  },
  {
    type: "account",
    re: /\b\d{2,3}-\d{2,6}-\d{2,6}(?:-\d{1,5})?\b/g,
    mask: (m) => m.replace(/\d/g, "*"),
  },
];

export function redactPII(text: string): PiiResult {
  const hits: PiiHit[] = [];
  // We collect first, then substitute right-to-left to keep indexes stable.
  for (const p of PATTERNS) {
    p.re.lastIndex = 0;
    let m;
    while ((m = p.re.exec(text)) !== null) {
      hits.push({
        type: p.type,
        raw: m[0],
        masked: p.mask(m[0]),
        start: m.index,
        end: m.index + m[0].length,
      });
    }
  }
  hits.sort((a, b) => b.start - a.start);
  let out = text;
  for (const h of hits) {
    out = out.slice(0, h.start) + h.masked + out.slice(h.end);
  }
  // Re-sort for downstream display (ascending)
  hits.sort((a, b) => a.start - b.start);
  return { redacted: out, hits };
}
