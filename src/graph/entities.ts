/**
 * Entity Extraction for Swiss AI Labor Market Knowledge Graph
 * Story 3.1 - Extract and standardize entities from documents
 */

import * as db from '../db/ruvector.js';
import fs from 'fs/promises';
import path from 'path';

// Entity types
export type EntityType = 'industry' | 'job_role' | 'skill' | 'location' | 'ai_technology';

export interface Entity {
  id: string;
  type: EntityType;
  name: string;
  normalizedName: string;
  aliases: string[];
  metadata: {
    sources: string[];
    mentionCount: number;
    firstSeen: string;
    lastUpdated: string;
  };
}

// Swiss cantons with full names
export const CANTON_MAP: Record<string, string> = {
  'ZH': 'Zürich',
  'BE': 'Bern',
  'LU': 'Luzern',
  'UR': 'Uri',
  'SZ': 'Schwyz',
  'OW': 'Obwalden',
  'NW': 'Nidwalden',
  'GL': 'Glarus',
  'ZG': 'Zug',
  'FR': 'Freiburg',
  'SO': 'Solothurn',
  'BS': 'Basel-Stadt',
  'BL': 'Basel-Landschaft',
  'SH': 'Schaffhausen',
  'AR': 'Appenzell Ausserrhoden',
  'AI': 'Appenzell Innerrhoden',
  'SG': 'St. Gallen',
  'GR': 'Graubünden',
  'AG': 'Aargau',
  'TG': 'Thurgau',
  'TI': 'Tessin',
  'VD': 'Waadt',
  'VS': 'Wallis',
  'NE': 'Neuenburg',
  'GE': 'Genf',
  'JU': 'Jura',
};

// Industry standardization map
const INDUSTRY_ALIASES: Record<string, string[]> = {
  'Finanzdienstleistungen': ['finance', 'banking', 'fintech', 'Finanzwesen', 'Bankwesen'],
  'Information und Kommunikation': ['IT', 'Tech', 'ICT', 'Software', 'technology'],
  'Pharma und Chemie': ['pharma', 'pharmaceutical', 'chemistry', 'biotech', 'life sciences'],
  'Verarbeitendes Gewerbe': ['manufacturing', 'Produktion', 'industry', 'Industrie'],
  'Gesundheits- und Sozialwesen': ['healthcare', 'Gesundheit', 'health', 'medical'],
  'Handel': ['retail', 'commerce', 'trade', 'Detailhandel', 'Einzelhandel'],
  'Gastgewerbe': ['hospitality', 'hotels', 'tourism', 'restaurants'],
  'Baugewerbe': ['construction', 'real estate', 'Bauwesen'],
  'Verkehr und Lagerei': ['transport', 'logistics', 'Logistik', 'transportation'],
  'Freiberufliche Tätigkeiten': ['professional services', 'consulting', 'Beratung'],
  'Öffentliche Verwaltung': ['public sector', 'government', 'Staat'],
  'Erziehung und Unterricht': ['education', 'Bildung', 'training', 'Ausbildung'],
  'Energieversorgung': ['energy', 'utilities', 'Energie'],
  'Land- und Forstwirtschaft': ['agriculture', 'farming', 'Landwirtschaft'],
  'Dienstleistungen': ['services', 'service sector'],
};

// AI Technology patterns
const AI_TECHNOLOGIES: string[] = [
  'Machine Learning',
  'Deep Learning',
  'Natural Language Processing',
  'Computer Vision',
  'Generative AI',
  'ChatGPT',
  'GPT-4',
  'LLM',
  'Large Language Model',
  'Neural Network',
  'Automation',
  'RPA',
  'Robotic Process Automation',
  'AI',
  'Artificial Intelligence',
  'Künstliche Intelligenz',
  'ML',
  'NLP',
  'Transformer',
  'Predictive Analytics',
  'AI Agent',
  'Copilot',
];

// Common job roles in Switzerland
const JOB_ROLE_PATTERNS: Record<string, string[]> = {
  'Software Developer': ['Softwareentwickler', 'Software Engineer', 'Developer', 'Entwickler', 'Programmer'],
  'Data Scientist': ['Data Analyst', 'Datenanalyst', 'Data Engineer', 'Machine Learning Engineer'],
  'Manager': ['Führungskraft', 'Team Lead', 'Abteilungsleiter', 'Director'],
  'Accountant': ['Buchhalter', 'Finance Controller', 'Finanzbuchhalter'],
  'Consultant': ['Berater', 'Unternehmensberater', 'Advisor'],
  'Sales Representative': ['Verkäufer', 'Account Manager', 'Sales Manager'],
  'Customer Service': ['Kundendienst', 'Support', 'Kundenberater'],
  'Administrative Assistant': ['Sachbearbeiter', 'Admin', 'Sekretär'],
  'Project Manager': ['Projektleiter', 'PM', 'Projektmanager'],
  'HR Specialist': ['Personalfachmann', 'Recruiter', 'HR Manager'],
  'Marketing Specialist': ['Marketing Manager', 'Marketingfachmann', 'Digital Marketing'],
  'Research Scientist': ['Forscher', 'Wissenschaftler', 'Researcher'],
};

// Skill patterns
const SKILL_PATTERNS: string[] = [
  'Python', 'JavaScript', 'Java', 'SQL', 'Excel',
  'Data Analysis', 'Machine Learning', 'Cloud Computing',
  'Project Management', 'Communication', 'Leadership',
  'Problem Solving', 'Critical Thinking', 'Creativity',
  'Digital Literacy', 'AI Skills', 'Automation',
  'Agile', 'Scrum', 'DevOps', 'Cybersecurity',
  'UX Design', 'Data Visualization', 'Statistics',
];

// Entity storage
const entities: Map<string, Entity> = new Map();

/**
 * Normalize entity name for deduplication
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9äöüàéèêç\s-]/gi, '')
    .replace(/\s+/g, '_');
}

/**
 * Generate entity ID
 */
function generateEntityId(type: EntityType, normalizedName: string): string {
  return `entity:${type}:${normalizedName}`;
}

/**
 * Find or create an entity
 */
function findOrCreateEntity(type: EntityType, name: string, source: string): Entity {
  const normalizedName = normalizeName(name);
  const id = generateEntityId(type, normalizedName);
  
  if (entities.has(id)) {
    const entity = entities.get(id)!;
    if (!entity.metadata.sources.includes(source)) {
      entity.metadata.sources.push(source);
    }
    entity.metadata.mentionCount++;
    entity.metadata.lastUpdated = new Date().toISOString();
    return entity;
  }
  
  const entity: Entity = {
    id,
    type,
    name,
    normalizedName,
    aliases: [],
    metadata: {
      sources: [source],
      mentionCount: 1,
      firstSeen: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    },
  };
  
  entities.set(id, entity);
  return entity;
}

/**
 * Standardize industry name
 */
function standardizeIndustry(name: string): string {
  const lowName = name.toLowerCase();
  
  for (const [standard, aliases] of Object.entries(INDUSTRY_ALIASES)) {
    if (lowName.includes(standard.toLowerCase())) return standard;
    for (const alias of aliases) {
      if (lowName.includes(alias.toLowerCase())) return standard;
    }
  }
  
  return name;
}

/**
 * Extract industries from document
 */
function extractIndustries(content: string, metadata: any, source: string): Entity[] {
  const extracted: Entity[] = [];
  
  // From metadata.industries array
  if (metadata.industries && Array.isArray(metadata.industries)) {
    for (const industry of metadata.industries) {
      const standardized = standardizeIndustry(industry);
      extracted.push(findOrCreateEntity('industry', standardized, source));
    }
  }
  
  // From sector data
  if (metadata.sectorName) {
    extracted.push(findOrCreateEntity('industry', metadata.sectorName, source));
  }
  
  // Pattern matching in content
  for (const [standard, aliases] of Object.entries(INDUSTRY_ALIASES)) {
    const patterns = [standard, ...aliases];
    for (const pattern of patterns) {
      const regex = new RegExp(`\\b${pattern}\\b`, 'gi');
      if (regex.test(content)) {
        extracted.push(findOrCreateEntity('industry', standard, source));
        break;
      }
    }
  }
  
  return extracted;
}

/**
 * Extract locations (cantons) from document
 */
function extractLocations(content: string, metadata: any, source: string): Entity[] {
  const extracted: Entity[] = [];
  
  // From canton field
  if (metadata.canton) {
    const cantonName = CANTON_MAP[metadata.canton] || metadata.canton;
    extracted.push(findOrCreateEntity('location', cantonName, source));
  }
  
  // Pattern matching for canton codes and names
  for (const [code, name] of Object.entries(CANTON_MAP)) {
    const codeRegex = new RegExp(`\\b${code}\\b`, 'g');
    const nameRegex = new RegExp(`\\b${name}\\b`, 'gi');
    
    if (codeRegex.test(content) || nameRegex.test(content)) {
      extracted.push(findOrCreateEntity('location', name, source));
    }
  }
  
  // Add Switzerland as default location
  extracted.push(findOrCreateEntity('location', 'Schweiz', source));
  
  return extracted;
}

/**
 * Extract AI technologies from document
 */
function extractAITechnologies(content: string, source: string): Entity[] {
  const extracted: Entity[] = [];
  
  for (const tech of AI_TECHNOLOGIES) {
    const regex = new RegExp(`\\b${tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    if (regex.test(content)) {
      extracted.push(findOrCreateEntity('ai_technology', tech, source));
    }
  }
  
  return extracted;
}

/**
 * Extract job roles from document
 */
function extractJobRoles(content: string, source: string): Entity[] {
  const extracted: Entity[] = [];
  
  for (const [standard, aliases] of Object.entries(JOB_ROLE_PATTERNS)) {
    const patterns = [standard, ...aliases];
    for (const pattern of patterns) {
      const regex = new RegExp(`\\b${pattern}\\b`, 'gi');
      if (regex.test(content)) {
        const entity = findOrCreateEntity('job_role', standard, source);
        // Add matched alias if different
        if (pattern.toLowerCase() !== standard.toLowerCase() && !entity.aliases.includes(pattern)) {
          entity.aliases.push(pattern);
        }
        extracted.push(entity);
        break;
      }
    }
  }
  
  return extracted;
}

/**
 * Extract skills from document
 */
function extractSkills(content: string, source: string): Entity[] {
  const extracted: Entity[] = [];
  
  for (const skill of SKILL_PATTERNS) {
    const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    if (regex.test(content)) {
      extracted.push(findOrCreateEntity('skill', skill, source));
    }
  }
  
  return extracted;
}

/**
 * Extract all entities from a document
 */
export function extractEntities(
  content: string,
  metadata: any,
  source: string
): { industries: Entity[]; locations: Entity[]; aiTechnologies: Entity[]; jobRoles: Entity[]; skills: Entity[] } {
  return {
    industries: extractIndustries(content, metadata, source),
    locations: extractLocations(content, metadata, source),
    aiTechnologies: extractAITechnologies(content, source),
    jobRoles: extractJobRoles(content, source),
    skills: extractSkills(content, source),
  };
}

/**
 * Read and process all collector outputs
 */
export async function processCollectorOutputs(dataDir: string): Promise<Map<string, Entity>> {
  console.log('[Entities] Processing collector outputs...');
  
  const dirs = ['bfs', 'news', 'research'];
  
  for (const dir of dirs) {
    const fullPath = path.join(dataDir, dir);
    
    try {
      const files = await fs.readdir(fullPath);
      const jsonFiles = files.filter(f => f.endsWith('.json') && !f.includes('index'));
      
      for (const file of jsonFiles) {
        const filePath = path.join(fullPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        
        // Also read corresponding .md file if exists
        const mdFile = file.replace('.json', '.md');
        let mdContent = '';
        try {
          mdContent = await fs.readFile(path.join(fullPath, mdFile), 'utf-8');
        } catch { /* ignore */ }
        
        const fullContent = `${data.title || ''} ${data.abstract || ''} ${data.description || ''} ${mdContent}`;
        const source = `${dir}/${file}`;
        
        // Extract all entity types
        extractEntities(fullContent, data, source);
        
        // Process nested data arrays
        if (data.data && Array.isArray(data.data)) {
          for (const item of data.data) {
            if (item.sectorName) {
              findOrCreateEntity('industry', item.sectorName, source);
            }
            if (item.canton) {
              const cantonName = CANTON_MAP[item.canton] || item.canton;
              findOrCreateEntity('location', cantonName, source);
            }
          }
        }
      }
      
      console.log(`[Entities] Processed ${jsonFiles.length} files from ${dir}/`);
    } catch (error) {
      console.log(`[Entities] Skipping ${dir}/: ${error}`);
    }
  }
  
  console.log(`[Entities] Total unique entities: ${entities.size}`);
  return entities;
}

/**
 * Save entities as graph nodes in ruVector
 */
export async function saveEntitiesToGraph(): Promise<void> {
  console.log('[Entities] Saving entities to ruVector...');
  
  await db.init();
  
  let saved = 0;
  for (const entity of entities.values()) {
    await db.insert({
      id: entity.id,
      content: `${entity.type}: ${entity.name}`,
      metadata: {
        source: 'entity_extraction',
        entityType: entity.type,
        name: entity.name,
        normalizedName: entity.normalizedName,
        aliases: entity.aliases.join(', '),
        mentionCount: entity.metadata.mentionCount,
        sources: entity.metadata.sources.join(', '),
        tags: [entity.type, 'entity'],
      },
    });
    saved++;
  }
  
  console.log(`[Entities] Saved ${saved} entities to graph`);
}

/**
 * Get all extracted entities
 */
export function getAllEntities(): Entity[] {
  return Array.from(entities.values());
}

/**
 * Get entities by type
 */
export function getEntitiesByType(type: EntityType): Entity[] {
  return Array.from(entities.values()).filter(e => e.type === type);
}

/**
 * Clear entities (for testing)
 */
export function clearEntities(): void {
  entities.clear();
}

/**
 * Main extraction pipeline
 */
export async function runEntityExtraction(dataDir: string): Promise<{
  total: number;
  byType: Record<EntityType, number>;
}> {
  console.log('[Entities] Starting entity extraction pipeline...');
  
  await processCollectorOutputs(dataDir);
  await saveEntitiesToGraph();
  
  const byType: Record<EntityType, number> = {
    industry: getEntitiesByType('industry').length,
    job_role: getEntitiesByType('job_role').length,
    skill: getEntitiesByType('skill').length,
    location: getEntitiesByType('location').length,
    ai_technology: getEntitiesByType('ai_technology').length,
  };
  
  console.log('[Entities] Extraction complete:', byType);
  
  return {
    total: entities.size,
    byType,
  };
}

export default {
  extractEntities,
  processCollectorOutputs,
  saveEntitiesToGraph,
  getAllEntities,
  getEntitiesByType,
  clearEntities,
  runEntityExtraction,
  CANTON_MAP,
};
