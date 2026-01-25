/**
 * ruVector Database Integration
 * Vector storage and graph queries for Swiss AI Labor Market Intelligence
 * 
 * Uses in-memory storage with JSON persistence for compatibility
 */

import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

dotenv.config();

// Types
export interface Document {
  id: string;
  content: string;
  metadata: Record<string, any>;
  embedding?: number[];
}

export interface SearchResult {
  id: string;
  content: string;
  metadata: Record<string, any>;
  score: number;
}

export interface QueryResult {
  id: string;
  data: Record<string, any>;
}

export interface Relation {
  from: string;
  to: string;
  type: string;
  properties?: Record<string, any>;
}

// In-memory storage
const documents: Map<string, Document> = new Map();
const relations: Relation[] = [];
let initialized = false;

// Configuration
const config = {
  path: process.env.RUVECTOR_PATH || './data/ruvector',
};

/**
 * Document metadata interface for labor market documents
 */
export interface LaborMarketDocument {
  id: string;
  content: string;
  metadata: {
    source?: string;
    sourceUrl?: string;
    title?: string;
    industry?: string;
    canton?: string;
    date?: string;
    aiImpactScore?: number;
    entities?: string[];
    tags?: string[];
    [key: string]: any;
  };
  embedding?: number[];
}

/**
 * Ensure storage directory exists
 */
async function ensureStorageDir(): Promise<void> {
  try {
    await fs.mkdir(config.path, { recursive: true });
  } catch (error) {
    // Ignore if exists
  }
}

/**
 * Load persisted data
 */
async function loadData(): Promise<void> {
  try {
    const docsPath = path.join(config.path, 'documents.json');
    const relsPath = path.join(config.path, 'relations.json');
    
    try {
      const docsData = await fs.readFile(docsPath, 'utf-8');
      const docs = JSON.parse(docsData) as Document[];
      for (const doc of docs) {
        documents.set(doc.id, doc);
      }
    } catch { /* No existing data */ }
    
    try {
      const relsData = await fs.readFile(relsPath, 'utf-8');
      const rels = JSON.parse(relsData) as Relation[];
      relations.push(...rels);
    } catch { /* No existing data */ }
  } catch (error) {
    console.log('[ruVector] Starting with empty database');
  }
}

/**
 * Save data to disk
 */
async function saveData(): Promise<void> {
  await ensureStorageDir();
  
  const docsPath = path.join(config.path, 'documents.json');
  const relsPath = path.join(config.path, 'relations.json');
  
  await fs.writeFile(docsPath, JSON.stringify(Array.from(documents.values()), null, 2));
  await fs.writeFile(relsPath, JSON.stringify(relations, null, 2));
}

/**
 * Initialize the database
 */
export async function init(): Promise<void> {
  if (initialized) return;
  
  console.log(`[ruVector] Initializing database at ${config.path}`);
  await ensureStorageDir();
  await loadData();
  initialized = true;
  console.log(`[ruVector] Database initialized (${documents.size} docs, ${relations.length} relations)`);
}

/**
 * Insert a document into the database
 */
export async function insert(doc: LaborMarketDocument): Promise<void> {
  if (!initialized) await init();
  
  documents.set(doc.id, {
    id: doc.id,
    content: doc.content,
    metadata: doc.metadata,
    embedding: doc.embedding,
  });
  
  // Persist periodically (every 50 inserts)
  if (documents.size % 50 === 0) {
    await saveData();
  }
}

/**
 * Insert multiple documents in batch
 */
export async function insertBatch(docs: LaborMarketDocument[]): Promise<void> {
  if (!initialized) await init();
  
  console.log(`[ruVector] Inserting batch of ${docs.length} documents`);
  
  for (const doc of docs) {
    documents.set(doc.id, {
      id: doc.id,
      content: doc.content,
      metadata: doc.metadata,
      embedding: doc.embedding,
    });
  }
  
  await saveData();
  console.log(`[ruVector] Batch insert complete`);
}

/**
 * Simple text search across documents
 */
export async function search(
  query: string,
  options: {
    limit?: number;
    filter?: {
      source?: string;
      industry?: string;
      canton?: string;
      dateFrom?: string;
      dateTo?: string;
    };
  } = {}
): Promise<SearchResult[]> {
  if (!initialized) await init();
  
  const { limit = 10, filter } = options;
  const queryLower = query.toLowerCase();
  const results: SearchResult[] = [];
  
  for (const doc of documents.values()) {
    // Simple text matching
    const contentLower = doc.content.toLowerCase();
    if (contentLower.includes(queryLower)) {
      // Apply filters
      if (filter) {
        if (filter.source && doc.metadata.source !== filter.source) continue;
        if (filter.industry && doc.metadata.industry !== filter.industry) continue;
        if (filter.canton && doc.metadata.canton !== filter.canton) continue;
      }
      
      // Calculate simple relevance score
      const occurrences = (contentLower.match(new RegExp(queryLower, 'g')) || []).length;
      const score = occurrences / doc.content.length * 1000;
      
      results.push({
        id: doc.id,
        content: doc.content,
        metadata: doc.metadata,
        score,
      });
    }
  }
  
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Get a document by ID
 */
export async function get(id: string): Promise<Document | null> {
  if (!initialized) await init();
  return documents.get(id) || null;
}

/**
 * Update a document
 */
export async function update(id: string, updates: Partial<LaborMarketDocument>): Promise<void> {
  if (!initialized) await init();
  
  const existing = documents.get(id);
  if (existing) {
    documents.set(id, {
      ...existing,
      ...updates,
      metadata: { ...existing.metadata, ...updates.metadata },
    });
    await saveData();
  }
}

/**
 * Delete a document
 */
export async function remove(id: string): Promise<void> {
  if (!initialized) await init();
  documents.delete(id);
  await saveData();
}

/**
 * Execute a simple query (basic filter support)
 */
export async function query(
  queryStr: string,
  params?: Record<string, unknown>
): Promise<QueryResult[]> {
  if (!initialized) await init();
  
  // Simple query support - return all documents matching type
  const results: QueryResult[] = [];
  
  for (const doc of documents.values()) {
    results.push({
      id: doc.id,
      data: { ...doc.metadata, content: doc.content },
    });
  }
  
  return results;
}

/**
 * Create a graph relationship between entities
 */
export async function createRelation(
  fromId: string,
  toId: string,
  relationType: string,
  properties?: Record<string, unknown>
): Promise<void> {
  if (!initialized) await init();
  
  // Check if relation already exists
  const exists = relations.some(
    r => r.from === fromId && r.to === toId && r.type === relationType
  );
  
  if (!exists) {
    relations.push({
      from: fromId,
      to: toId,
      type: relationType,
      properties: properties as Record<string, any>,
    });
  }
}

/**
 * Get all relations for an entity
 */
export async function getRelations(
  entityId: string,
  relationType?: string
): Promise<Relation[]> {
  if (!initialized) await init();
  
  return relations.filter(r => {
    const matchesEntity = r.from === entityId || r.to === entityId;
    const matchesType = !relationType || r.type === relationType;
    return matchesEntity && matchesType;
  });
}

/**
 * Close the database connection (save data)
 */
export async function close(): Promise<void> {
  if (initialized) {
    await saveData();
    console.log('[ruVector] Database saved and closed');
  }
}

/**
 * Get database statistics
 */
export async function stats(): Promise<{
  documentCount: number;
  relationCount: number;
  indexSize: number;
}> {
  if (!initialized) await init();
  
  return {
    documentCount: documents.size,
    relationCount: relations.length,
    indexSize: JSON.stringify(Array.from(documents.values())).length,
  };
}

/**
 * Get all documents
 */
export async function getAll(): Promise<Document[]> {
  if (!initialized) await init();
  return Array.from(documents.values());
}

/**
 * Get all relations
 */
export async function getAllRelations(): Promise<Relation[]> {
  if (!initialized) await init();
  return [...relations];
}

// Export default object for convenience
export default {
  init,
  insert,
  insertBatch,
  search,
  get,
  update,
  remove,
  query,
  createRelation,
  getRelations,
  close,
  stats,
  getAll,
  getAllRelations,
};
