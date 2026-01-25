/**
 * ruVector Database Integration
 * Vector storage and graph queries for Swiss AI Labor Market Intelligence
 */

import { RuVector, type Document, type SearchResult, type QueryResult } from 'ruvector';
import dotenv from 'dotenv';

dotenv.config();

// Database instance
let db: RuVector | null = null;

// Configuration
const config = {
  path: process.env.RUVECTOR_PATH || './data/ruvector',
  embeddingModel: process.env.RUVECTOR_EMBEDDING_MODEL || 'text-embedding-3-small',
  embeddingDimensions: parseInt(process.env.RUVECTOR_EMBEDDING_DIMENSIONS || '1536', 10),
};

/**
 * Document metadata interface for labor market documents
 */
export interface LaborMarketDocument {
  id: string;
  content: string;
  metadata: {
    source: 'bfs' | 'news' | 'research' | 'manual';
    sourceUrl?: string;
    title?: string;
    industry?: string;
    canton?: string;
    date?: string;
    aiImpactScore?: number;
    entities?: string[];
    tags?: string[];
  };
  embedding?: number[];
}

/**
 * Initialize the ruVector database
 */
export async function init(): Promise<RuVector> {
  if (db) {
    return db;
  }

  console.log(`[ruVector] Initializing database at ${config.path}`);
  
  db = new RuVector({
    storagePath: config.path,
    embeddingModel: config.embeddingModel,
    dimensions: config.embeddingDimensions,
  });

  await db.init();
  console.log('[ruVector] Database initialized successfully');
  
  return db;
}

/**
 * Get the database instance (initializes if needed)
 */
export async function getDb(): Promise<RuVector> {
  if (!db) {
    return init();
  }
  return db;
}

/**
 * Insert a document into the database
 */
export async function insert(doc: LaborMarketDocument): Promise<void> {
  const database = await getDb();
  
  await database.insert({
    id: doc.id,
    content: doc.content,
    metadata: doc.metadata,
    embedding: doc.embedding,
  });
  
  console.log(`[ruVector] Inserted document: ${doc.id}`);
}

/**
 * Insert multiple documents in batch
 */
export async function insertBatch(docs: LaborMarketDocument[]): Promise<void> {
  const database = await getDb();
  
  console.log(`[ruVector] Inserting batch of ${docs.length} documents`);
  
  for (const doc of docs) {
    await database.insert({
      id: doc.id,
      content: doc.content,
      metadata: doc.metadata,
      embedding: doc.embedding,
    });
  }
  
  console.log(`[ruVector] Batch insert complete`);
}

/**
 * Semantic search across documents
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
  const database = await getDb();
  const { limit = 10, filter } = options;

  console.log(`[ruVector] Searching: "${query}" (limit: ${limit})`);

  const results = await database.search(query, {
    limit,
    filter: filter ? buildFilter(filter) : undefined,
  });

  console.log(`[ruVector] Found ${results.length} results`);
  return results;
}

/**
 * Get a document by ID
 */
export async function get(id: string): Promise<Document | null> {
  const database = await getDb();
  return database.get(id);
}

/**
 * Update a document
 */
export async function update(id: string, updates: Partial<LaborMarketDocument>): Promise<void> {
  const database = await getDb();
  await database.update(id, updates);
  console.log(`[ruVector] Updated document: ${id}`);
}

/**
 * Delete a document
 */
export async function remove(id: string): Promise<void> {
  const database = await getDb();
  await database.delete(id);
  console.log(`[ruVector] Deleted document: ${id}`);
}

/**
 * Execute a Cypher-like graph query
 */
export async function query(cypherQuery: string, params?: Record<string, unknown>): Promise<QueryResult[]> {
  const database = await getDb();
  
  console.log(`[ruVector] Executing query: ${cypherQuery}`);
  
  const results = await database.query(cypherQuery, params);
  
  console.log(`[ruVector] Query returned ${results.length} results`);
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
  const database = await getDb();
  
  await database.createRelation({
    from: fromId,
    to: toId,
    type: relationType,
    properties,
  });
  
  console.log(`[ruVector] Created relation: ${fromId} -[${relationType}]-> ${toId}`);
}

/**
 * Get all relations for an entity
 */
export async function getRelations(
  entityId: string,
  relationType?: string
): Promise<Array<{ from: string; to: string; type: string; properties?: Record<string, unknown> }>> {
  const database = await getDb();
  return database.getRelations(entityId, relationType);
}

/**
 * Close the database connection
 */
export async function close(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
    console.log('[ruVector] Database connection closed');
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
  const database = await getDb();
  return database.stats();
}

// Helper function to build filter object
function buildFilter(filter: {
  source?: string;
  industry?: string;
  canton?: string;
  dateFrom?: string;
  dateTo?: string;
}): Record<string, unknown> {
  const filterObj: Record<string, unknown> = {};
  
  if (filter.source) {
    filterObj['metadata.source'] = filter.source;
  }
  if (filter.industry) {
    filterObj['metadata.industry'] = filter.industry;
  }
  if (filter.canton) {
    filterObj['metadata.canton'] = filter.canton;
  }
  if (filter.dateFrom || filter.dateTo) {
    filterObj['metadata.date'] = {
      ...(filter.dateFrom && { $gte: filter.dateFrom }),
      ...(filter.dateTo && { $lte: filter.dateTo }),
    };
  }
  
  return filterObj;
}

// Export default object for convenience
export default {
  init,
  getDb,
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
};
