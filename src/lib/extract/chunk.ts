// Semantic chunking — section + token-window hybrid.

export interface ChunkRecord {
  ordinal: number;
  text: string;
  charCount: number;
  topics: string[];
  sectionPath: string;
}

const TARGET_CHARS = 1400; // ~ 700-900 tokens
const OVERLAP_CHARS = 200;

export function semanticChunk(
  text: string,
  topics: string[] = [],
): ChunkRecord[] {
  // Split by markdown-like headings first
  const lines = text.split(/\n/);
  const sections: { path: string; body: string }[] = [];
  let curHeading = "본문";
  let curBuf: string[] = [];

  const flush = () => {
    if (curBuf.length > 0) {
      sections.push({ path: curHeading, body: curBuf.join("\n").trim() });
      curBuf = [];
    }
  };

  for (const ln of lines) {
    const m = ln.match(/^(#{1,6})\s+(.+)/);
    if (m) {
      flush();
      curHeading = m[2].trim();
    } else {
      curBuf.push(ln);
    }
  }
  flush();
  if (sections.length === 0) sections.push({ path: "본문", body: text });

  // Now window each section to TARGET_CHARS with overlap.
  const chunks: ChunkRecord[] = [];
  let ordinal = 0;
  for (const sec of sections) {
    if (sec.body.length === 0) continue;
    if (sec.body.length <= TARGET_CHARS) {
      chunks.push({
        ordinal: ordinal++,
        text: sec.body,
        charCount: sec.body.length,
        topics: topics.filter((t) => sec.body.includes(t) || t === topics[0]),
        sectionPath: sec.path,
      });
      continue;
    }
    let start = 0;
    while (start < sec.body.length) {
      const end = Math.min(start + TARGET_CHARS, sec.body.length);
      const slice = sec.body.slice(start, end);
      chunks.push({
        ordinal: ordinal++,
        text: slice,
        charCount: slice.length,
        topics: topics.filter((t) => slice.includes(t)),
        sectionPath: sec.path,
      });
      if (end >= sec.body.length) break;
      start = end - OVERLAP_CHARS;
    }
  }
  return chunks;
}
