#!/usr/bin/env npx tsx
/**
 * Run Knowledge Graph Pipeline
 * Extracts entities and calculates AI impact scores
 */

import path from 'path';
import { runKnowledgeGraphPipeline, getAllEntities, getTopImpactedEntities } from '../src/graph/index.js';

async function main() {
  const dataDir = path.join(process.cwd(), 'data');
  
  console.log('Swiss AI Labor Market - Knowledge Graph Pipeline');
  console.log('Data directory:', dataDir);
  console.log();
  
  try {
    const result = await runKnowledgeGraphPipeline(dataDir);
    
    console.log('\n📊 Results Summary:');
    console.log('─'.repeat(40));
    console.log(`Total Entities: ${result.entities.total}`);
    console.log('By Type:');
    for (const [type, count] of Object.entries(result.entities.byType)) {
      console.log(`  - ${type}: ${count}`);
    }
    
    console.log(`\nTotal Impact Scores: ${result.impact.totalScores}`);
    console.log('Average Scores by Type:');
    for (const [type, data] of Object.entries(result.impact.summary)) {
      console.log(`  - ${type}: ${data.avgScore}/10 (${data.count} entities)`);
    }
    
    console.log('\n🔥 Top 10 Most Impacted:');
    const top = getTopImpactedEntities(10);
    for (let i = 0; i < top.length; i++) {
      const s = top[i];
      console.log(`  ${i + 1}. ${s.entityName} (${s.entityType}): ${s.score}/10`);
    }
    
    console.log('\n✅ Knowledge graph pipeline completed successfully!');
    
  } catch (error) {
    console.error('❌ Pipeline failed:', error);
    process.exit(1);
  }
}

main();
