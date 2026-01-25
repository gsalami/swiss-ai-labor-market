/**
 * Embedding Generator
 * Generate embeddings using OpenAI or local models
 */

import dotenv from 'dotenv';

dotenv.config();

export interface EmbeddingResult {
  text: string;
  embedding: number[];
  model: string;
  dimensions: number;
}

export interface EmbedderOptions {
  model?: string;
  batchSize?: number;
  provider?: 'openai' | 'local';
}

const DEFAULT_OPTIONS: Required<EmbedderOptions> = {
  model: process.env.RUVECTOR_EMBEDDING_MODEL || 'text-embedding-3-small',
  batchSize: 100,
  provider: 'openai',
};

/**
 * Generate embedding for a single text
 */
export async function embed(
  text: string,
  options: EmbedderOptions = {}
): Promise<EmbeddingResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  if (opts.provider === 'openai') {
    return embedWithOpenAI(text, opts.model);
  }
  
  throw new Error(`Unsupported embedding provider: ${opts.provider}`);
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function embedBatch(
  texts: string[],
  options: EmbedderOptions = {}
): Promise<EmbeddingResult[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const results: EmbeddingResult[] = [];
  
  console.log(`[Embedder] Processing ${texts.length} texts in batches of ${opts.batchSize}`);
  
  for (let i = 0; i < texts.length; i += opts.batchSize) {
    const batch = texts.slice(i, i + opts.batchSize);
    const batchNum = Math.floor(i / opts.batchSize) + 1;
    const totalBatches = Math.ceil(texts.length / opts.batchSize);
    
    console.log(`[Embedder] Processing batch ${batchNum}/${totalBatches}`);
    
    if (opts.provider === 'openai') {
      const batchResults = await embedBatchWithOpenAI(batch, opts.model);
      results.push(...batchResults);
    } else {
      throw new Error(`Unsupported embedding provider: ${opts.provider}`);
    }
    
    // Small delay between batches to avoid rate limiting
    if (i + opts.batchSize < texts.length) {
      await sleep(100);
    }
  }
  
  console.log(`[Embedder] Completed ${results.length} embeddings`);
  return results;
}

/**
 * Generate embedding using OpenAI API
 */
async function embedWithOpenAI(text: string, model: string): Promise<EmbeddingResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not set in environment');
  }
  
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: text,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }
  
  const data = await response.json() as {
    data: Array<{ embedding: number[] }>;
    model: string;
  };
  
  return {
    text,
    embedding: data.data[0].embedding,
    model: data.model,
    dimensions: data.data[0].embedding.length,
  };
}

/**
 * Generate embeddings for multiple texts using OpenAI API
 */
async function embedBatchWithOpenAI(
  texts: string[],
  model: string
): Promise<EmbeddingResult[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not set in environment');
  }
  
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: texts,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }
  
  const data = await response.json() as {
    data: Array<{ embedding: number[]; index: number }>;
    model: string;
  };
  
  // Sort by index to maintain order
  const sorted = data.data.sort((a, b) => a.index - b.index);
  
  return sorted.map((item, index) => ({
    text: texts[index],
    embedding: item.embedding,
    model: data.model,
    dimensions: item.embedding.length,
  }));
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have the same dimensions');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Utility function for delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default {
  embed,
  embedBatch,
  cosineSimilarity,
};
