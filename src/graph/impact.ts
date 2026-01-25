/**
 * AI Impact Scoring for Swiss Labor Market
 * Story 3.2 - Calculate and store AI impact scores
 */

import * as db from '../db/ruvector.js';
import { getEntitiesByType, type Entity, type EntityType } from './entities.js';

export interface ImpactScore {
  entityId: string;
  entityType: EntityType;
  entityName: string;
  score: number; // 1-10
  confidence: number; // 0-1
  factors: ImpactFactors;
  reasoning: string;
  lastUpdated: string;
}

export interface ImpactFactors {
  automationPotential: number; // 1-10
  aiMentions: number; // count from sources
  jobTrendDirection: 'growing' | 'stable' | 'declining';
  skillsGapSeverity: number; // 1-10
  adoptionRate: number; // 1-10
}

// Base automation potential by industry (research-based estimates)
const INDUSTRY_AUTOMATION_POTENTIAL: Record<string, number> = {
  'Finanzdienstleistungen': 7.5,
  'Information und Kommunikation': 6.0,
  'Pharma und Chemie': 5.5,
  'Verarbeitendes Gewerbe': 7.0,
  'Gesundheits- und Sozialwesen': 4.0,
  'Handel': 7.5,
  'Gastgewerbe': 5.5,
  'Baugewerbe': 4.5,
  'Verkehr und Lagerei': 7.0,
  'Freiberufliche Tätigkeiten': 5.0,
  'Öffentliche Verwaltung': 6.0,
  'Erziehung und Unterricht': 3.5,
  'Energieversorgung': 5.5,
  'Land- und Forstwirtschaft': 5.0,
  'Dienstleistungen': 6.5,
};

// Base automation potential by job role
const JOB_ROLE_AUTOMATION_POTENTIAL: Record<string, number> = {
  'Software Developer': 4.0, // AI assists but doesn't replace
  'Data Scientist': 5.0,
  'Manager': 3.5,
  'Accountant': 8.0,
  'Consultant': 4.5,
  'Sales Representative': 5.5,
  'Customer Service': 7.5,
  'Administrative Assistant': 8.5,
  'Project Manager': 4.0,
  'HR Specialist': 5.5,
  'Marketing Specialist': 6.0,
  'Research Scientist': 4.0,
};

// AI technology impact weights
const AI_TECH_IMPACT_WEIGHT: Record<string, number> = {
  'Generative AI': 9.0,
  'ChatGPT': 8.5,
  'LLM': 8.5,
  'Large Language Model': 8.5,
  'Machine Learning': 7.5,
  'Automation': 8.0,
  'RPA': 7.0,
  'Natural Language Processing': 7.5,
  'Computer Vision': 7.0,
  'Deep Learning': 7.5,
  'AI': 7.0,
  'Artificial Intelligence': 7.0,
  'Künstliche Intelligenz': 7.0,
};

// Score storage
const impactScores: Map<string, ImpactScore> = new Map();

/**
 * Calculate automation potential factor
 */
function calculateAutomationPotential(entity: Entity): number {
  if (entity.type === 'industry') {
    return INDUSTRY_AUTOMATION_POTENTIAL[entity.name] || 5.0;
  }
  
  if (entity.type === 'job_role') {
    return JOB_ROLE_AUTOMATION_POTENTIAL[entity.name] || 5.0;
  }
  
  if (entity.type === 'ai_technology') {
    return AI_TECH_IMPACT_WEIGHT[entity.name] || 6.0;
  }
  
  return 5.0; // Default for skills and locations
}

/**
 * Estimate AI mentions impact from source count
 */
function calculateAIMentionsImpact(mentionCount: number): number {
  // Logarithmic scale: more mentions = higher impact
  if (mentionCount <= 1) return 2;
  if (mentionCount <= 3) return 4;
  if (mentionCount <= 5) return 6;
  if (mentionCount <= 10) return 7;
  return 8;
}

/**
 * Determine job trend direction based on entity type and context
 */
function determineJobTrend(entity: Entity): 'growing' | 'stable' | 'declining' {
  // AI and tech-related entities tend to be growing
  const growingKeywords = ['AI', 'Data', 'Software', 'Machine Learning', 'Automation', 'Cloud'];
  const decliningKeywords = ['Administrative', 'Accountant', 'Customer Service'];
  
  const name = entity.name.toLowerCase();
  
  for (const keyword of growingKeywords) {
    if (name.includes(keyword.toLowerCase())) return 'growing';
  }
  
  for (const keyword of decliningKeywords) {
    if (name.includes(keyword.toLowerCase())) return 'declining';
  }
  
  return 'stable';
}

/**
 * Calculate skills gap severity
 */
function calculateSkillsGapSeverity(entity: Entity): number {
  // High-tech industries and roles have higher skills gaps
  const highGapKeywords = ['AI', 'Data', 'Machine Learning', 'Cloud', 'Software', 'Cybersecurity'];
  const name = entity.name.toLowerCase();
  
  for (const keyword of highGapKeywords) {
    if (name.includes(keyword.toLowerCase())) return 7.5;
  }
  
  // Industries with digital transformation
  if (entity.type === 'industry') {
    if (['Finanzdienstleistungen', 'Information und Kommunikation'].includes(entity.name)) {
      return 7.0;
    }
  }
  
  return 5.0;
}

/**
 * Estimate AI adoption rate
 */
function calculateAdoptionRate(entity: Entity): number {
  // Tech and finance are early adopters
  const earlyAdopters = ['Information und Kommunikation', 'Finanzdienstleistungen', 'Pharma und Chemie'];
  const lateAdopters = ['Land- und Forstwirtschaft', 'Baugewerbe', 'Gastgewerbe'];
  
  if (entity.type === 'industry') {
    if (earlyAdopters.includes(entity.name)) return 8.0;
    if (lateAdopters.includes(entity.name)) return 4.0;
    return 5.5;
  }
  
  // AI technologies have high adoption momentum
  if (entity.type === 'ai_technology') {
    return AI_TECH_IMPACT_WEIGHT[entity.name] || 7.0;
  }
  
  // Skills related to AI have high adoption
  if (entity.type === 'skill') {
    const aiSkills = ['Machine Learning', 'Python', 'Data Analysis', 'AI Skills', 'Cloud Computing'];
    if (aiSkills.includes(entity.name)) return 7.5;
  }
  
  return 5.0;
}

/**
 * Generate human-readable reasoning
 */
function generateReasoning(entity: Entity, factors: ImpactFactors, score: number): string {
  const parts: string[] = [];
  
  if (entity.type === 'industry') {
    parts.push(`Industry "${entity.name}" has an automation potential of ${factors.automationPotential.toFixed(1)}/10.`);
  } else if (entity.type === 'job_role') {
    parts.push(`Job role "${entity.name}" has an automation potential of ${factors.automationPotential.toFixed(1)}/10.`);
  } else if (entity.type === 'ai_technology') {
    parts.push(`AI technology "${entity.name}" has significant transformative potential.`);
  }
  
  if (factors.jobTrendDirection === 'growing') {
    parts.push('Jobs in this area are expected to grow.');
  } else if (factors.jobTrendDirection === 'declining') {
    parts.push('Jobs in this area may face pressure from automation.');
  }
  
  if (factors.skillsGapSeverity >= 7) {
    parts.push('There is a significant skills gap requiring upskilling initiatives.');
  }
  
  if (factors.adoptionRate >= 7) {
    parts.push('AI adoption in this area is progressing rapidly in Switzerland.');
  }
  
  parts.push(`Overall AI impact score: ${score.toFixed(1)}/10.`);
  
  return parts.join(' ');
}

/**
 * Calculate composite AI impact score
 */
function calculateCompositeScore(factors: ImpactFactors): number {
  const trendMultiplier = factors.jobTrendDirection === 'declining' ? 1.1 : 
                          factors.jobTrendDirection === 'growing' ? 0.9 : 1.0;
  
  const rawScore = (
    factors.automationPotential * 0.35 +
    calculateAIMentionsImpact(factors.aiMentions) * 0.15 +
    factors.skillsGapSeverity * 0.20 +
    factors.adoptionRate * 0.30
  ) * trendMultiplier;
  
  // Clamp to 1-10 range
  return Math.max(1, Math.min(10, rawScore));
}

/**
 * Calculate impact score for a single entity
 */
export function calculateImpactScore(entity: Entity): ImpactScore {
  const factors: ImpactFactors = {
    automationPotential: calculateAutomationPotential(entity),
    aiMentions: entity.metadata.mentionCount,
    jobTrendDirection: determineJobTrend(entity),
    skillsGapSeverity: calculateSkillsGapSeverity(entity),
    adoptionRate: calculateAdoptionRate(entity),
  };
  
  const score = calculateCompositeScore(factors);
  
  // Confidence based on data quality (number of sources)
  const confidence = Math.min(1, 0.3 + (entity.metadata.sources.length * 0.15));
  
  const impactScore: ImpactScore = {
    entityId: entity.id,
    entityType: entity.type,
    entityName: entity.name,
    score: Math.round(score * 10) / 10,
    confidence: Math.round(confidence * 100) / 100,
    factors,
    reasoning: generateReasoning(entity, factors, score),
    lastUpdated: new Date().toISOString(),
  };
  
  impactScores.set(entity.id, impactScore);
  return impactScore;
}

/**
 * Calculate impact scores for all entities
 */
export function calculateAllImpactScores(entities: Entity[]): ImpactScore[] {
  console.log(`[Impact] Calculating scores for ${entities.length} entities...`);
  
  const scores: ImpactScore[] = [];
  
  for (const entity of entities) {
    // Only score industries, job roles, and AI technologies
    if (['industry', 'job_role', 'ai_technology'].includes(entity.type)) {
      scores.push(calculateImpactScore(entity));
    }
  }
  
  console.log(`[Impact] Calculated ${scores.length} impact scores`);
  return scores;
}

/**
 * Save impact scores with graph relationships
 */
export async function saveImpactScoresToGraph(): Promise<void> {
  console.log('[Impact] Saving impact scores to ruVector...');
  
  await db.init();
  
  let saved = 0;
  for (const score of impactScores.values()) {
    // Save score as a document
    const scoreId = `impact:${score.entityId}`;
    await db.insert({
      id: scoreId,
      content: `AI Impact Score for ${score.entityName}: ${score.score}/10. ${score.reasoning}`,
      metadata: {
        source: 'impact_scoring',
        entityId: score.entityId,
        entityType: score.entityType,
        entityName: score.entityName,
        score: score.score,
        confidence: score.confidence,
        automationPotential: score.factors.automationPotential,
        jobTrend: score.factors.jobTrendDirection,
        skillsGap: score.factors.skillsGapSeverity,
        adoptionRate: score.factors.adoptionRate,
        tags: ['impact_score', score.entityType],
      },
    });
    
    // Create relationship between entity and its score
    try {
      await db.createRelation(score.entityId, scoreId, 'HAS_IMPACT_SCORE', {
        score: score.score,
        confidence: score.confidence,
      });
    } catch (error) {
      // Relation might fail if entity doesn't exist in graph yet
      console.log(`[Impact] Could not create relation for ${score.entityId}`);
    }
    
    saved++;
  }
  
  console.log(`[Impact] Saved ${saved} impact scores to graph`);
}

/**
 * Create relationships between related entities
 */
export async function createEntityRelationships(): Promise<void> {
  console.log('[Impact] Creating entity relationships...');
  
  await db.init();
  
  const industries = getEntitiesByType('industry');
  const jobRoles = getEntitiesByType('job_role');
  const aiTechnologies = getEntitiesByType('ai_technology');
  const skills = getEntitiesByType('skill');
  
  let relationCount = 0;
  
  // Connect AI technologies to all industries (they affect all)
  for (const tech of aiTechnologies) {
    for (const industry of industries) {
      try {
        await db.createRelation(tech.id, industry.id, 'IMPACTS', {
          weight: AI_TECH_IMPACT_WEIGHT[tech.name] || 5.0,
        });
        relationCount++;
      } catch { /* ignore */ }
    }
  }
  
  // Connect industries to related job roles
  const industryJobMapping: Record<string, string[]> = {
    'Finanzdienstleistungen': ['Accountant', 'Consultant', 'Manager', 'Data Scientist'],
    'Information und Kommunikation': ['Software Developer', 'Data Scientist', 'Project Manager'],
    'Verarbeitendes Gewerbe': ['Manager', 'Project Manager'],
    'Handel': ['Sales Representative', 'Customer Service', 'Manager'],
    'Gesundheits- und Sozialwesen': ['Research Scientist', 'Manager', 'Administrative Assistant'],
  };
  
  for (const [industryName, roles] of Object.entries(industryJobMapping)) {
    const industry = industries.find(i => i.name === industryName);
    if (!industry) continue;
    
    for (const roleName of roles) {
      const role = jobRoles.find(r => r.name === roleName);
      if (!role) continue;
      
      try {
        await db.createRelation(industry.id, role.id, 'EMPLOYS', {
          relevance: 0.8,
        });
        relationCount++;
      } catch { /* ignore */ }
    }
  }
  
  // Connect skills to job roles
  const skillJobMapping: Record<string, string[]> = {
    'Python': ['Software Developer', 'Data Scientist'],
    'Machine Learning': ['Data Scientist', 'Research Scientist'],
    'Data Analysis': ['Data Scientist', 'Consultant', 'Marketing Specialist'],
    'Project Management': ['Project Manager', 'Manager'],
    'Leadership': ['Manager', 'Project Manager'],
    'Excel': ['Accountant', 'Administrative Assistant', 'Consultant'],
  };
  
  for (const [skillName, roles] of Object.entries(skillJobMapping)) {
    const skill = skills.find(s => s.name === skillName);
    if (!skill) continue;
    
    for (const roleName of roles) {
      const role = jobRoles.find(r => r.name === roleName);
      if (!role) continue;
      
      try {
        await db.createRelation(skill.id, role.id, 'REQUIRED_FOR', {
          importance: 0.7,
        });
        relationCount++;
      } catch { /* ignore */ }
    }
  }
  
  console.log(`[Impact] Created ${relationCount} entity relationships`);
}

/**
 * Get impact score for an entity
 */
export function getImpactScore(entityId: string): ImpactScore | undefined {
  return impactScores.get(entityId);
}

/**
 * Get all impact scores
 */
export function getAllImpactScores(): ImpactScore[] {
  return Array.from(impactScores.values());
}

/**
 * Get top impacted entities
 */
export function getTopImpactedEntities(limit: number = 10, type?: EntityType): ImpactScore[] {
  let scores = getAllImpactScores();
  
  if (type) {
    scores = scores.filter(s => s.entityType === type);
  }
  
  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Get impact summary by entity type
 */
export function getImpactSummary(): Record<EntityType, { count: number; avgScore: number }> {
  const summary: Record<string, { count: number; totalScore: number }> = {};
  
  for (const score of impactScores.values()) {
    if (!summary[score.entityType]) {
      summary[score.entityType] = { count: 0, totalScore: 0 };
    }
    summary[score.entityType].count++;
    summary[score.entityType].totalScore += score.score;
  }
  
  const result: Record<string, { count: number; avgScore: number }> = {};
  for (const [type, data] of Object.entries(summary)) {
    result[type] = {
      count: data.count,
      avgScore: Math.round((data.totalScore / data.count) * 10) / 10,
    };
  }
  
  return result as Record<EntityType, { count: number; avgScore: number }>;
}

/**
 * Main impact scoring pipeline
 */
export async function runImpactScoring(entities: Entity[]): Promise<{
  totalScores: number;
  summary: Record<EntityType, { count: number; avgScore: number }>;
  topImpacted: ImpactScore[];
}> {
  console.log('[Impact] Starting impact scoring pipeline...');
  
  calculateAllImpactScores(entities);
  await saveImpactScoresToGraph();
  await createEntityRelationships();
  
  const summary = getImpactSummary();
  const topImpacted = getTopImpactedEntities(5);
  
  console.log('[Impact] Impact scoring complete');
  console.log('[Impact] Summary:', summary);
  console.log('[Impact] Top 5 impacted entities:', topImpacted.map(s => `${s.entityName}: ${s.score}`));
  
  return {
    totalScores: impactScores.size,
    summary,
    topImpacted,
  };
}

export default {
  calculateImpactScore,
  calculateAllImpactScores,
  saveImpactScoresToGraph,
  createEntityRelationships,
  getImpactScore,
  getAllImpactScores,
  getTopImpactedEntities,
  getImpactSummary,
  runImpactScoring,
};
