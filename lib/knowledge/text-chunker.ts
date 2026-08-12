export interface TextChunk {
  index: number;
  content: string;
  approxTokenCount: number;
}

const TARGET_CHARS = 1000;
const OVERLAP_CHARS = 150;
const MIN_CHUNK_CHARS = 40;

// Gemini's tokenizer isn't publicly exposed for offline counting — this is
// a standard cross-provider approximation (~4 chars/token for mixed
// Arabic/English business text), good enough for the usage dashboard and
// playground; it's an estimate, not a billing-grade figure.
function approxTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Paragraph-first splitting keeps related sentences together; long
 * paragraphs get hard-split at the target size with a small overlap so a
 * fact that lands right on a chunk boundary is still retrievable from
 * either side.
 */
export function chunkText(text: string): TextChunk[] {
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim().length > 0);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (paragraph.length > TARGET_CHARS) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      chunks.push(...hardSplit(paragraph));
      continue;
    }

    if ((current + "\n\n" + paragraph).length > TARGET_CHARS && current) {
      chunks.push(current);
      current = paragraph;
    } else {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
  }
  if (current.trim().length >= MIN_CHUNK_CHARS) chunks.push(current);

  return withOverlap(chunks).map((content, index) => ({
    index,
    content,
    approxTokenCount: approxTokens(content),
  }));
}

function hardSplit(text: string): string[] {
  const sentences = text.split(/(?<=[.!؟?])\s+/);
  const pieces: string[] = [];
  let buffer = "";
  for (const sentence of sentences) {
    if ((buffer + " " + sentence).length > TARGET_CHARS && buffer) {
      pieces.push(buffer.trim());
      buffer = sentence;
    } else {
      buffer = buffer ? `${buffer} ${sentence}` : sentence;
    }
  }
  if (buffer.trim().length >= MIN_CHUNK_CHARS) pieces.push(buffer.trim());
  return pieces;
}

function withOverlap(chunks: string[]): string[] {
  if (chunks.length <= 1) return chunks;
  return chunks.map((chunk, i) => {
    if (i === 0) return chunk;
    const prevTail = chunks[i - 1]!.slice(-OVERLAP_CHARS);
    return `${prevTail}\n\n${chunk}`;
  });
}
