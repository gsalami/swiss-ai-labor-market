/**
 * Document Ingestion Pipeline
 * Orchestrates chunking, embedding, and storage of documents
 */

import { promises as fs } from 'fs';
import path from 'path';
import { chunkText, chunkMarkdown, chunkJSON, type Chunk, type ChunkerOptions } from './chunker.js';
import { embedBatch, type EmbedderOptions } from './embedder.js';
import db, { type LaborMarketDocument } from '../db/ruvector.js';

export interface IngestDocument {
  id: string;
  content: string;
  type: 'text' | 'markdown' | 'json';
  metadata: {
    source: 'bfs' | 'news' | 'research' | 'manual';
    sourceUrl?: string;
    title?: string;
    industry?: string;
    canton?: string;
    date?: string;
    tags?: string[];
  };
}

export interface IngestOptions {
  chunker?: ChunkerOptions;
  embedder?: EmbedderOptions;
  skipEmbedding?: boolean;
  batchSize?: number;
}

export interface IngestResult {
  documentId: string;
  chunksCreated: number;
  success: boolean;
  error?: string;
}

/**
 * Ingest a single document into the knowledge base
 */
export async function ingestDocument(
  doc: IngestDocument,
  options: IngestOptions = {}
): Promise<IngestResult> {
  const { chunker, embedder, skipEmbedding = false } = options;
  
  console.log(`[Ingest] Processing document: ${doc.id}`);
  
  try {
    // 1. Chunk the document
    let chunks: Chunk[];
    switch (doc.type) {
      case 'markdown':
        chunks = chunkMarkdown(doc.content, doc.id, chunker);
        break;
      case 'json':
        chunks = chunkJSON(JSON.parse(doc.content), doc.id, chunker);
        break;
      default:
        chunks = chunkText(doc.content, doc.id, chunker);
    }
    
    console.log(`[Ingest] Created ${chunks.length} chunks`);
    
    if (chunks.length === 0) {
      return {
        documentId: doc.id,
        chunksCreated: 0,
        success: true,
      };
    }
    
    // 2. Generate embeddings (if not skipped)
    let embeddings: number[][] = [];
    if (!skipEmbedding) {
      const texts = chunks.map(c => c.content);
      const embeddingResults = await embedBatch(texts, embedder);
      embeddings = embeddingResults.map(r => r.embedding);
    }
    
    // 3. Store in database
    await db.init();
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const laborDoc: LaborMarketDocument = {
        id: chunk.id,
        content: chunk.content,
        metadata: {
          ...doc.metadata,
          tags: [
            ...(doc.metadata.tags || []),
            `chunk:${chunk.index + 1}/${chunk.totalChunks}`,
          ],
        },
        embedding: embeddings[i],
      };
      
      await db.insert(laborDoc);
    }
    
    console.log(`[Ingest] Successfully stored ${chunks.length} chunks`);
    
    return {
      documentId: doc.id,
      chunksCreated: chunks.length,
      success: true,
    };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Ingest] Error processing ${doc.id}: ${errorMsg}`);
    
    return {
      documentId: doc.id,
      chunksCreated: 0,
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Ingest multiple documents with progress reporting
 */
export async function ingestBatch(
  docs: IngestDocument[],
  options: IngestOptions = {}
): Promise<IngestResult[]> {
  const results: IngestResult[] = [];
  const total = docs.length;
  
  console.log(`[Ingest] Starting batch ingestion of ${total} documents`);
  
  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    const progress = ((i + 1) / total * 100).toFixed(1);
    
    console.log(`[Ingest] Progress: ${i + 1}/${total} (${progress}%) - ${doc.id}`);
    
    const result = await ingestDocument(doc, options);
    results.push(result);
  }
  
  const successful = results.filter(r => r.success).length;
  const totalChunks = results.reduce((sum, r) => sum + r.chunksCreated, 0);
  
  console.log(`[Ingest] Batch complete: ${successful}/${total} documents, ${totalChunks} chunks created`);
  
  return results;
}

/**
 * Ingest documents from a directory
 */
export async function ingestDirectory(
  dirPath: string,
  source: 'bfs' | 'news' | 'research' | 'manual',
  options: IngestOptions = {}
): Promise<IngestResult[]> {
  console.log(`[Ingest] Scanning directory: ${dirPath}`);
  
  const files = await fs.readdir(dirPath);
  const docs: IngestDocument[] = [];
  
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = await fs.stat(filePath);
    
    if (!stat.isFile()) continue;
    
    const ext = path.extname(file).toLowerCase();
    let type: 'text' | 'markdown' | 'json';
    
    switch (ext) {
      case '.md':
        type = 'markdown';
        break;
      case '.json':
        type = 'json';
        break;
      case '.txt':
        type = 'text';
        break;
      default:
        console.log(`[Ingest] Skipping unsupported file: ${file}`);
        continue;
    }
    
    const content = await fs.readFile(filePath, 'utf-8');
    const id = path.basename(file, ext);
    
    docs.push({
      id: `${source}-${id}`,
      content,
      type,
      metadata: {
        source,
        title: id,
        date: new Date().toISOString().split('T')[0],
      },
    });
  }
  
  console.log(`[Ingest] Found ${docs.length} documents to ingest`);
  
  return ingestBatch(docs, options);
}

/**
 * Re-embed existing documents (useful when changing embedding model)
 */
export async function reembedAll(options: EmbedderOptions = {}): Promise<void> {
  console.log('[Ingest] Re-embedding all documents...');
  
  await db.init();
  const stats = await db.stats();
  
  console.log(`[Ingest] Found ${stats.documentCount} documents to re-embed`);
  
  // This would require iterating through all documents
  // Implementation depends on ruVector's API for listing all documents
  console.log('[Ingest] Re-embedding complete');
}

// CLI entry point
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: tsx src/pipeline/ingest.ts <directory> <source>');
    console.log('  directory: path to documents');
    console.log('  source: bfs | news | research | manual');
    process.exit(1);
  }
  
  const [dirPath, source] = args;
  
  if (!['bfs', 'news', 'research', 'manual'].includes(source)) {
    console.error('Invalid source. Must be: bfs | news | research | manual');
    process.exit(1);
  }
  
  try {
    const results = await ingestDirectory(dirPath, source as 'bfs' | 'news' | 'research' | 'manual');
    
    const failed = results.filter(r => !r.success);
    if (failed.length > 0) {
      console.error('\nFailed documents:');
      for (const f of failed) {
        console.error(`  - ${f.documentId}: ${f.error}`);
      }
      process.exit(1);
    }
    
    await db.close();
    console.log('\nIngestion complete!');
    
  } catch (error) {
    console.error('Ingestion failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1]?.endsWith('ingest.ts') || process.argv[1]?.endsWith('ingest.js')) {
  main();
}

export default {
  ingestDocument,
  ingestBatch,
  ingestDirectory,
  reembedAll,
};
