/**
 * Semantic Search Module
 * Uses OpenAI embeddings for conceptual similarity search
 */

import fs from 'fs/promises';
import path from 'path';

const EMBEDDINGS_PATH = './data/embeddings.json';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface EmbeddingCache {
  [docId: string]: number[];
}

let embeddingsCache: EmbeddingCache = {};
let initialized = false;

/**
 * Generate embedding using OpenAI API
 */
async function generateEmbedding(text: string): Promise<number[]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }
  
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000), // Limit input length
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }
  
  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

/**
 * Initialize embeddings cache
 */
export async function initSemanticSearch(): Promise<void> {
  if (initialized) return;
  
  try {
    const data = await fs.readFile(EMBEDDINGS_PATH, 'utf-8');
    embeddingsCache = JSON.parse(data);
    console.log(`[Semantic] Loaded ${Object.keys(embeddingsCache).length} embeddings`);
  } catch {
    console.log('[Semantic] No embeddings cache found, starting fresh');
    embeddingsCache = {};
  }
  
  initialized = true;
}

/**
 * Save embeddings cache
 */
async function saveEmbeddings(): Promise<void> {
  await fs.writeFile(EMBEDDINGS_PATH, JSON.stringify(embeddingsCache));
}

/**
 * Index a document (generate and store its embedding)
 */
export async function indexDocument(docId: string, content: string): Promise<void> {
  if (!initialized) await initSemanticSearch();
  
  if (!embeddingsCache[docId]) {
    console.log(`[Semantic] Indexing: ${docId}`);
    embeddingsCache[docId] = await generateEmbedding(content);
    await saveEmbeddings();
  }
}

/**
 * Batch index documents
 */
export async function indexDocuments(docs: Array<{id: string; content: string}>): Promise<void> {
  if (!initialized) await initSemanticSearch();
  
  const toIndex = docs.filter(d => !embeddingsCache[d.id]);
  console.log(`[Semantic] Indexing ${toIndex.length} new documents...`);
  
  for (const doc of toIndex) {
    try {
      embeddingsCache[doc.id] = await generateEmbedding(doc.content);
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 100));
    } catch (err) {
      console.error(`[Semantic] Failed to index ${doc.id}:`, err);
    }
  }
  
  await saveEmbeddings();
  console.log(`[Semantic] Indexing complete. Total: ${Object.keys(embeddingsCache).length}`);
}

/**
 * Semantic search
 */
export async function semanticSearch(
  query: string,
  documents: Array<{id: string; content: string; metadata: any}>,
  limit: number = 10
): Promise<Array<{id: string; content: string; metadata: any; score: number}>> {
  if (!initialized) await initSemanticSearch();
  
  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);
  
  // Calculate similarity for all documents with embeddings
  const scored = documents
    .filter(doc => embeddingsCache[doc.id])
    .map(doc => ({
      ...doc,
      score: cosineSimilarity(queryEmbedding, embeddingsCache[doc.id]),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  
  return scored;
}

/**
 * Get embedding stats
 */
export function getStats(): { indexed: number; cacheSize: number } {
  return {
    indexed: Object.keys(embeddingsCache).length,
    cacheSize: JSON.stringify(embeddingsCache).length,
  };
}

export default {
  initSemanticSearch,
  indexDocument,
  indexDocuments,
  semanticSearch,
  getStats,
};
