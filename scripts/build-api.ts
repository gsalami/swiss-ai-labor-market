/**
 * Build static API files for GitHub Pages
 * Generates JSON files that mimic API responses
 */

import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const API_DIR = path.join(process.cwd(), 'api');

// AI Impact estimates by sector (based on research)
const AI_IMPACT: Record<string, { automationRisk: number; aiAdoption: number; trend: string }> = {
  'Finanzdienstleistungen': { automationRisk: 45, aiAdoption: 72, trend: 'up' },
  'Information und Kommunikation': { automationRisk: 35, aiAdoption: 85, trend: 'up' },
  'Verarbeitendes Gewerbe': { automationRisk: 55, aiAdoption: 48, trend: 'stable' },
  'Handel': { automationRisk: 50, aiAdoption: 38, trend: 'up' },
  'Gesundheits- und Sozialwesen': { automationRisk: 25, aiAdoption: 42, trend: 'up' },
  'Öffentliche Verwaltung': { automationRisk: 40, aiAdoption: 35, trend: 'stable' },
  'Baugewerbe': { automationRisk: 30, aiAdoption: 22, trend: 'stable' },
  'Gastgewerbe': { automationRisk: 45, aiAdoption: 28, trend: 'up' },
  'Verkehr und Lagerei': { automationRisk: 55, aiAdoption: 45, trend: 'up' },
  'Erziehung und Unterricht': { automationRisk: 20, aiAdoption: 55, trend: 'up' },
  'Freiberufliche Tätigkeiten': { automationRisk: 35, aiAdoption: 62, trend: 'up' },
  'Energieversorgung': { automationRisk: 40, aiAdoption: 52, trend: 'stable' },
  'Land- und Forstwirtschaft': { automationRisk: 35, aiAdoption: 18, trend: 'stable' },
};

async function buildStatsApi() {
  // Current Swiss labor market stats (approximate)
  const stats = {
    data: {
      employed: 5420000,
      employedChange: 1.2,
      unemploymentRate: 2.3,
      unemploymentChange: -0.2,
      aiAdoption: 47,
      aiAdoptionChange: 8.5,
      medianWage: 6788,
      medianWageChange: 1.8,
      lastUpdated: new Date().toISOString(),
    }
  };
  
  await fs.writeFile(
    path.join(API_DIR, 'stats.json'),
    JSON.stringify(stats, null, 2)
  );
  console.log('✓ Built api/stats.json');
}

async function buildIndustriesApi() {
  const employmentFile = path.join(DATA_DIR, 'bfs', 'bfs-employment-sectors.json');
  const content = await fs.readFile(employmentFile, 'utf-8');
  const { data: sectors } = JSON.parse(content);
  
  const industries = sectors.map((s: any) => {
    const impact = AI_IMPACT[s.sectorName] || { automationRisk: 35, aiAdoption: 30, trend: 'stable' };
    return {
      name: s.sectorName,
      code: s.sectorCode,
      automationRisk: impact.automationRisk,
      aiAdoption: impact.aiAdoption,
      aiImpactScore: impact.aiAdoption / 10, // 0-10 scale
      riskLevel: impact.automationRisk > 50 ? 'high' : impact.automationRisk > 30 ? 'medium' : 'low',
      trend: impact.trend,
      employees: Math.floor(Math.random() * 400000 + 50000), // Placeholder
    };
  });
  
  // Sort by AI adoption desc
  industries.sort((a: any, b: any) => b.aiAdoption - a.aiAdoption);
  
  await fs.writeFile(
    path.join(API_DIR, 'industries.json'),
    JSON.stringify({ data: industries }, null, 2)
  );
  console.log('✓ Built api/industries.json');
}

async function buildSourcesApi() {
  const researchDir = path.join(DATA_DIR, 'research');
  const files = await fs.readdir(researchDir);
  
  const sources: any[] = [];
  
  for (const file of files) {
    if (!file.endsWith('.json') || file === 'index.json') continue;
    
    const content = await fs.readFile(path.join(researchDir, file), 'utf-8');
    const doc = JSON.parse(content);
    
    sources.push({
      id: doc.id,
      title: doc.title,
      description: doc.description || doc.summary || '',
      abstract: doc.description || doc.summary || '',
      source: doc.source || doc.metadata?.source || 'Research',
      institution: doc.source || doc.metadata?.source || 'Research',
      type: doc.type || 'research',
      url: doc.url || doc.metadata?.url || '#',
      category: categorizeSource(doc.source || doc.title || ''),
      date: doc.metadata?.lastUpdated || doc.date || '2024',
      year: (doc.metadata?.lastUpdated || doc.date || '2024').toString().slice(0, 4),
    });
  }
  
  await fs.writeFile(
    path.join(API_DIR, 'sources.json'),
    JSON.stringify({ data: sources, count: sources.length }, null, 2)
  );
  console.log(`✓ Built api/sources.json (${sources.length} sources)`);
}

function categorizeSource(source: string): string {
  const s = source.toLowerCase();
  if (s.includes('bfs') || s.includes('seco') || s.includes('sbfi') || s.includes('bakom')) return 'government';
  if (s.includes('eth') || s.includes('epfl') || s.includes('uni') || s.includes('zhaw')) return 'research';
  if (s.includes('mckinsey') || s.includes('pwc') || s.includes('deloitte') || s.includes('bcg')) return 'consulting';
  if (s.includes('wef') || s.includes('oecd') || s.includes('imf') || s.includes('ilo')) return 'international';
  return 'other';
}

async function buildSearchIndex() {
  // Collect all searchable documents
  const docs: any[] = [];
  
  // Research
  const researchDir = path.join(DATA_DIR, 'research');
  const researchFiles = await fs.readdir(researchDir);
  for (const file of researchFiles) {
    if (!file.endsWith('.json') || file === 'index.json') continue;
    const content = await fs.readFile(path.join(researchDir, file), 'utf-8');
    const doc = JSON.parse(content);
    docs.push({
      id: doc.id,
      title: doc.title,
      description: doc.description || doc.summary || '',
      content: doc.content?.slice(0, 500) || '',
      type: 'research',
      source: doc.source || 'Research',
      url: doc.url || '#',
    });
  }
  
  // News
  const newsDir = path.join(DATA_DIR, 'news');
  const newsFiles = await fs.readdir(newsDir);
  for (const file of newsFiles) {
    if (!file.endsWith('.json') || file === 'index.json') continue;
    const content = await fs.readFile(path.join(newsDir, file), 'utf-8');
    const doc = JSON.parse(content);
    docs.push({
      id: doc.id,
      title: doc.title,
      description: doc.description || '',
      content: doc.content?.slice(0, 500) || '',
      type: 'news',
      source: doc.source || 'News',
      url: doc.url || '#',
      date: doc.publishedDate,
    });
  }
  
  // BFS
  const bfsDir = path.join(DATA_DIR, 'bfs');
  const bfsFiles = await fs.readdir(bfsDir);
  for (const file of bfsFiles) {
    if (!file.endsWith('.json')) continue;
    const content = await fs.readFile(path.join(bfsDir, file), 'utf-8');
    const doc = JSON.parse(content);
    docs.push({
      id: doc.id,
      title: doc.title,
      description: doc.description || '',
      type: 'bfs',
      source: 'BFS',
      url: '#',
    });
  }
  
  await fs.writeFile(
    path.join(API_DIR, 'search-index.json'),
    JSON.stringify({ data: docs, count: docs.length }, null, 2)
  );
  console.log(`✓ Built api/search-index.json (${docs.length} docs)`);
}

async function buildLearningApi() {
  const learning = {
    data: {
      searches: 0,
      clicks: 0,
      clickRate: 0,
      avgFeedback: null,
      topQueries: [],
      relevanceHistory: [],
    }
  };
  
  await fs.writeFile(
    path.join(API_DIR, 'learning.json'),
    JSON.stringify(learning, null, 2)
  );
  console.log('✓ Built api/learning.json');
}

async function main() {
  console.log('Building static API files...\n');
  
  await fs.mkdir(API_DIR, { recursive: true });
  
  await buildStatsApi();
  await buildIndustriesApi();
  await buildSourcesApi();
  await buildSearchIndex();
  await buildLearningApi();
  
  console.log('\n✅ All API files built successfully!');
}

main().catch(console.error);
