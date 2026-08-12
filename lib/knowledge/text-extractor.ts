import { extractText as extractPdfText, getDocumentProxy } from "unpdf";

/**
 * Server-only. unpdf ships a serverless PDF.js build with no native
 * dependencies, so this works the same whether the route runs on Node.js
 * or an edge/worker runtime — no debug-mode quirks to route around.
 */
export async function extractText(
  buffer: Buffer,
  fileType: "PDF" | "TXT" | "MANUAL"
): Promise<string> {
  if (fileType === "TXT" || fileType === "MANUAL") {
    return buffer.toString("utf-8");
  }

  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractPdfText(pdf, { mergePages: true });
  return text;
}

/** Strips the noise PDF extraction leaves behind before chunking. */
export function cleanText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line, i, all) => {
      // Drop lines that are just page numbers / repeated running headers.
      if (/^\d{1,4}$/.test(line)) return false;
      if (line.length === 0) return all[i - 1]?.length !== 0; // collapse blank runs
      return true;
    })
    .join("\n")
    .trim();
}
