import { config } from 'dotenv';
config();

import * as fs from 'fs';
import * as path from 'path';
import { ingestDocuments } from '../src/pipeline/ingest.js';

async function main() {
  const dataDir = path.join(process.cwd(), 'data');
  const documents: { content: string; metadata: Record<string, any> }[] = [];

  // Load research documents
  const researchDir = path.join(dataDir, 'research');
  const researchFiles = fs.readdirSync(researchDir).filter(f => f.endsWith('.md'));
  for (const file of researchFiles) {
    const content = fs.readFileSync(path.join(researchDir, file), 'utf-8');
    const jsonFile = file.replace('.md', '.json');
    let metadata: any = { source: 'research', file };
    if (fs.existsSync(path.join(researchDir, jsonFile))) {
      metadata = { ...metadata, ...JSON.parse(fs.readFileSync(path.join(researchDir, jsonFile), 'utf-8')) };
    }
    documents.push({ content, metadata });
    console.log(`Loaded: ${file}`);
  }

  // Load BFS documents
  const bfsDir = path.join(dataDir, 'bfs');
  const bfsFiles = fs.readdirSync(bfsDir).filter(f => f.endsWith('.json'));
  for (const file of bfsFiles) {
    const data = JSON.parse(fs.readFileSync(path.join(bfsDir, file), 'utf-8'));
    const content = JSON.stringify(data, null, 2);
    documents.push({ 
      content, 
      metadata: { source: 'bfs', file, type: data.type || 'statistics' } 
    });
    console.log(`Loaded: ${file}`);
  }

  // Load news
  const newsDir = path.join(dataDir, 'news');
  if (fs.existsSync(newsDir)) {
    const newsFiles = fs.readdirSync(newsDir).filter(f => f.endsWith('.json') && f !== 'index.json');
    for (const file of newsFiles) {
      const data = JSON.parse(fs.readFileSync(path.join(newsDir, file), 'utf-8'));
      documents.push({ 
        content: `${data.title}\n\n${data.content || data.summary || ''}`, 
        metadata: { source: 'news', ...data } 
      });
      console.log(`Loaded: ${file}`);
    }
  }

  console.log(`\nTotal documents: ${documents.length}`);
  console.log('Starting ingestion with embeddings...\n');

  await ingestDocuments(documents);
  console.log('\n✅ Ingestion complete!');
}

main().catch(console.error);
