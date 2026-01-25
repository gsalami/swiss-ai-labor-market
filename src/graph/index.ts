/**
 * Knowledge Graph Module - Swiss AI Labor Market
 * Exports entity extraction and impact scoring functionality
 */

// Entity extraction
export {
  extractEntities,
  processCollectorOutputs,
  saveEntitiesToGraph,
  getAllEntities,
  getEntitiesByType,
  clearEntities,
  runEntityExtraction,
  CANTON_MAP,
  type Entity,
  type EntityType,
} from './entities.js';

// Impact scoring
export {
  calculateImpactScore,
  calculateAllImpactScores,
  saveImpactScoresToGraph,
  createEntityRelationships,
  getImpactScore,
  getAllImpactScores,
  getTopImpactedEntities,
  getImpactSummary,
  runImpactScoring,
  type ImpactScore,
  type ImpactFactors,
} from './impact.js';

// Default export with all functions
import entities from './entities.js';
import impact from './impact.js';

export default {
  ...entities,
  ...impact,
};

/**
 * Run complete knowledge graph pipeline
 */
export async function runKnowledgeGraphPipeline(dataDir: string): Promise<{
  entities: { total: number; byType: Record<string, number> };
  impact: { totalScores: number; summary: Record<string, { count: number; avgScore: number }> };
}> {
  console.log('='.repeat(60));
  console.log('[Graph] Starting Knowledge Graph Pipeline');
  console.log('='.repeat(60));
  
  // Step 1: Entity extraction
  const entityResult = await entities.runEntityExtraction(dataDir);
  
  // Step 2: Impact scoring
  const allEntities = entities.getAllEntities();
  const impactResult = await impact.runImpactScoring(allEntities);
  
  console.log('='.repeat(60));
  console.log('[Graph] Knowledge Graph Pipeline Complete');
  console.log(`[Graph] Entities: ${entityResult.total}`);
  console.log(`[Graph] Impact Scores: ${impactResult.totalScores}`);
  console.log('='.repeat(60));
  
  return {
    entities: entityResult,
    impact: {
      totalScores: impactResult.totalScores,
      summary: impactResult.summary,
    },
  };
}
