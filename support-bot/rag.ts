import { readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tokenize } from "../src/text.js";

export interface Chunk {
  /** `<doc>#<n>`, the id the model must cite. */
  id: string;
  doc: string;
  title: string;
  text: string;
}

export interface Index {
  chunks: Chunk[];
  vectors: Float64Array[];
}

export interface Hit {
  chunk: Chunk;
  score: number;
  /** Share of the query's words that literally occur in the chunk. Hash collisions cannot fake this. */
  overlap: number;
}

export const DOCS_DIR = join(dirname(fileURLToPath(import.meta.url)), "docs");
const DIMENSIONS = 512;

/** One chunk per `## ` section; text before the first section is dropped (it is the document title). */
export function chunkMarkdown(doc: string, markdown: string): Chunk[] {
  const chunks: Chunk[] = [];
  for (const section of markdown.split(/^## /m).slice(1)) {
    const [title = "", ...body] = section.split("\n");
    const text = body.join(" ").replace(/\s+/g, " ").trim();
    if (text) chunks.push({ id: `${doc}#${chunks.length + 1}`, doc, title: title.trim(), text });
  }
  return chunks;
}

function fnv1a(word: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < word.length; i++) {
    hash ^= word.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/** Hashed bag of words plus bigrams, L2-normalised. Deterministic and offline: no model, no download. */
export function embed(text: string): Float64Array {
  const vector = new Float64Array(DIMENSIONS);
  const words = tokenize(text);
  const features = [...words, ...words.slice(1).map((word, i) => `${words[i]} ${word}`)];
  for (const feature of features) vector[fnv1a(feature) % DIMENSIONS]! += 1;
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / norm);
}

export function buildIndex(chunks: Chunk[]): Index {
  return { chunks, vectors: chunks.map((chunk) => embed(`${chunk.title} ${chunk.title} ${chunk.text}`)) };
}

export function loadIndex(dir = DOCS_DIR): Index {
  const chunks = readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .sort()
    .flatMap((file) => chunkMarkdown(basename(file, ".md"), readFileSync(join(dir, file), "utf8")));
  return buildIndex(chunks);
}

/** Top-k chunks by cosine similarity (vectors are unit length, so a dot product). */
export function search(index: Index, query: string, k = 3): Hit[] {
  const q = embed(query);
  const words = [...new Set(tokenize(query))];
  return index.chunks
    .map((chunk, i) => {
      const vector = index.vectors[i]!;
      let score = 0;
      for (let d = 0; d < DIMENSIONS; d++) score += q[d]! * vector[d]!;
      const present = new Set(tokenize(`${chunk.title} ${chunk.text}`));
      const overlap = words.length === 0 ? 0 : words.filter((word) => present.has(word)).length / words.length;
      return { chunk, score, overlap };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
