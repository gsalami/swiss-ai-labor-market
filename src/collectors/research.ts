/**
 * Web Research Collector
 * Searches and collects Swiss AI labor market research and reports
 * Sources: Academic papers, ETH research, bank reports, government studies
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { promises as fs } from 'fs';
import path from 'path';

// Research sources
const RESEARCH_SOURCES = {
  eth: {
    name: 'ETH Zürich',
    searchUrl: 'https://ethz.ch/de/news-und-veranstaltungen/eth-news.html',
    baseUrl: 'https://ethz.ch',
  },
  seco: {
    name: 'SECO - Staatssekretariat für Wirtschaft',
    searchUrl: 'https://www.seco.admin.ch/seco/de/home/Publikationen_Dienstleistungen/Publikationen_und_Formulare.html',
    baseUrl: 'https://www.seco.admin.ch',
  },
  oecd: {
    name: 'OECD Switzerland',
    searchUrl: 'https://www.oecd.org/switzerland/',
    baseUrl: 'https://www.oecd.org',
  },
};

// Search queries for finding research
const SEARCH_QUERIES = [
  'schweiz künstliche intelligenz arbeitsmarkt',
  'switzerland ai labor market impact',
  'schweiz automatisierung beschäftigung',
  'swiss workforce ai transformation',
  'digitalisierung arbeitsplätze schweiz',
  'ki fachkräftemangel schweiz',
];

// Known research reports (curated list with REAL verified URLs)
const KNOWN_REPORTS = [
  {
    id: 'research-mckinsey-genai-2023',
    title: 'The economic potential of generative AI',
    authors: ['McKinsey Global Institute'],
    institution: 'McKinsey Global Institute',
    year: 2023,
    abstract: 'Comprehensive analysis of how generative AI could transform productivity across industries. Estimates generative AI could add $2.6-4.4 trillion annually to the global economy. Examines impact on 850 occupations and 2,100 work activities.',
    url: 'https://www.mckinsey.com/capabilities/mckinsey-digital/our-insights/the-economic-potential-of-generative-ai-the-next-productivity-frontier',
    topics: ['generative ai', 'automation', 'productivity', 'labor market'],
    industries: ['finance', 'technology', 'professional services', 'manufacturing'],
  },
  {
    id: 'research-wef-future-jobs-2023',
    title: 'Future of Jobs Report 2023',
    authors: ['World Economic Forum'],
    institution: 'World Economic Forum',
    year: 2023,
    abstract: 'Global report on labor market transformation through 2027. Surveyed 803 companies across 27 industries in 45 economies. Projects 23% of jobs to change in next 5 years, with 69M new jobs created and 83M displaced.',
    url: 'https://www.weforum.org/publications/the-future-of-jobs-report-2023/',
    topics: ['future of work', 'skills', 'job creation', 'displacement'],
    industries: ['all sectors'],
  },
  {
    id: 'research-bfs-arbeitsmarkt-2024',
    title: 'Arbeitsmarktindikatoren Schweiz',
    authors: ['Bundesamt für Statistik BFS'],
    institution: 'BFS',
    year: 2024,
    abstract: 'Offizielle Schweizer Arbeitsmarktstatistiken. Umfasst Erwerbstätigkeit, Arbeitslosigkeit, Löhne, Arbeitsbedingungen und Branchenentwicklung. Basis für politische Entscheidungen und Wirtschaftsanalysen.',
    url: 'https://www.bfs.admin.ch/bfs/de/home/statistiken/arbeit-erwerb.html',
    topics: ['arbeitsmarkt', 'statistik', 'beschäftigung', 'löhne'],
    industries: ['all sectors'],
  },
  {
    id: 'research-seco-konjunktur-2024',
    title: 'Konjunkturprognosen',
    authors: ['SECO - Staatssekretariat für Wirtschaft'],
    institution: 'SECO',
    year: 2024,
    abstract: 'Offizielle Konjunkturprognosen der Schweizer Regierung. Vierteljährliche Analysen zu BIP-Entwicklung, Arbeitsmarkt, Inflation und Wirtschaftsaussichten. Grundlage für Wirtschaftspolitik.',
    url: 'https://www.seco.admin.ch/seco/de/home/wirtschaftslage---wirtschaftspolitik/Wirtschaftslage/konjunkturprognosen.html',
    topics: ['konjunktur', 'prognose', 'wirtschaft', 'arbeitsmarkt'],
    industries: ['macroeconomy'],
  },
  {
    id: 'research-stanford-hai-2024',
    title: 'AI Index Report 2024',
    authors: ['Stanford Institute for Human-Centered AI'],
    institution: 'Stanford HAI',
    year: 2024,
    abstract: 'Annual comprehensive report tracking AI progress across research, industry, policy and public perception. Covers model capabilities, investment trends, regulation developments, and labor market impacts globally.',
    url: 'https://aiindex.stanford.edu/report/',
    topics: ['ai research', 'ai policy', 'ai investment', 'ai capabilities'],
    industries: ['technology', 'research', 'all sectors'],
  },
  {
    id: 'research-oecd-employment-2024',
    title: 'OECD Employment Outlook 2024',
    authors: ['OECD'],
    institution: 'OECD',
    year: 2024,
    abstract: 'Annual flagship publication on labor markets in OECD countries including Switzerland. Analyzes AI impact on jobs, skills requirements, wages, and policy responses. Special focus on generative AI implications.',
    url: 'https://www.oecd.org/employment/outlook/',
    topics: ['employment', 'ai impact', 'skills', 'policy'],
    industries: ['all sectors'],
  },
];

export interface ResearchReport {
  id: string;
  title: string;
  authors: string[];
  institution: string;
  year: number;
  abstract: string;
  url: string;
  topics: string[];
  industries: string[];
  fullText?: string;
  pdfUrl?: string;
}

export interface CollectorResult {
  success: boolean;
  reportsCollected: number;
  reportsWithContent: number;
  errors: string[];
}

/**
 * Search for research using web search
 */
async function searchForResearch(query: string): Promise<Partial<ResearchReport>[]> {
  console.log(`[Research] Searching: "${query}"`);
  
  // Note: In production, this would use a search API
  // For now, return empty as we rely on curated list
  return [];
}

/**
 * Extract content from research page
 */
async function extractResearchContent(url: string): Promise<string | null> {
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Swiss-AI-Labor-Market/1.0)',
      },
    });
    
    const $ = cheerio.load(response.data);
    
    // Remove navigation, ads, etc.
    $('script, style, nav, header, footer, aside, .advertisement').remove();
    
    // Try to find main content
    const selectors = [
      '.content-main',
      '.article-content',
      '.research-content',
      '[role="main"]',
      'article',
      'main',
    ];
    
    for (const selector of selectors) {
      const content = $(selector).text().trim();
      if (content.length > 500) {
        return content.substring(0, 10000);
      }
    }
    
    return null;
  } catch (error) {
    console.log(`[Research] Could not extract content from ${url}`);
    return null;
  }
}

/**
 * Transform report to markdown document
 */
function reportToMarkdown(report: ResearchReport): string {
  return `# ${report.title}

**Institution:** ${report.institution}  
**Autoren:** ${report.authors.join(', ')}  
**Jahr:** ${report.year}  
**URL:** ${report.url}

## Abstract
${report.abstract}

## Themen
${report.topics.map(t => `- ${t}`).join('\n')}

## Relevante Branchen
${report.industries.map(i => `- ${i}`).join('\n')}

${report.fullText ? `## Volltext\n${report.fullText}` : ''}
`;
}

/**
 * Save reports to local files
 */
async function saveReports(reports: ResearchReport[]): Promise<void> {
  const dataDir = path.join(process.cwd(), 'data', 'research');
  await fs.mkdir(dataDir, { recursive: true });
  
  for (const report of reports) {
    const jsonPath = path.join(dataDir, `${report.id}.json`);
    const mdPath = path.join(dataDir, `${report.id}.md`);
    
    await fs.writeFile(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
    await fs.writeFile(mdPath, reportToMarkdown(report), 'utf-8');
  }
  
  // Save index
  const indexPath = path.join(dataDir, 'index.json');
  const index = reports.map(r => ({
    id: r.id,
    title: r.title,
    institution: r.institution,
    year: r.year,
    topics: r.topics,
  }));
  await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
  
  console.log(`[Research] Saved ${reports.length} reports to ${dataDir}`);
}

/**
 * Collect research reports
 */
export async function collectResearch(options: {
  includeSearch?: boolean;
  extractContent?: boolean;
  save?: boolean;
} = {}): Promise<CollectorResult> {
  const { includeSearch = false, extractContent = false, save = true } = options;
  
  console.log('[Research] Starting research collection...');
  
  const result: CollectorResult = {
    success: true,
    reportsCollected: 0,
    reportsWithContent: 0,
    errors: [],
  };
  
  // Start with curated reports
  const reports: ResearchReport[] = [...KNOWN_REPORTS];
  
  // Optionally search for more
  if (includeSearch) {
    for (const query of SEARCH_QUERIES) {
      try {
        const found = await searchForResearch(query);
        // Would merge found reports here
      } catch (error) {
        result.errors.push(`Search "${query}": ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  
  // Optionally extract full content
  if (extractContent) {
    for (const report of reports) {
      try {
        const content = await extractResearchContent(report.url);
        if (content) {
          report.fullText = content;
          result.reportsWithContent++;
        }
      } catch (error) {
        // Non-fatal, just skip content extraction
      }
    }
  }
  
  result.reportsCollected = reports.length;
  console.log(`[Research] Collected ${reports.length} reports`);
  
  if (save) {
    await saveReports(reports);
  }
  
  if (result.errors.length > 0) {
    console.log(`[Research] Completed with ${result.errors.length} errors`);
  } else {
    console.log('[Research] Collection completed successfully');
  }
  
  return result;
}

/**
 * Search for specific topic
 */
export async function searchTopic(topic: string): Promise<ResearchReport[]> {
  const lowerTopic = topic.toLowerCase();
  
  return KNOWN_REPORTS.filter(report =>
    report.title.toLowerCase().includes(lowerTopic) ||
    report.abstract.toLowerCase().includes(lowerTopic) ||
    report.topics.some(t => t.toLowerCase().includes(lowerTopic))
  );
}

/**
 * Get reports by industry
 */
export function getByIndustry(industry: string): ResearchReport[] {
  const lowerIndustry = industry.toLowerCase();
  
  return KNOWN_REPORTS.filter(report =>
    report.industries.some(i => i.toLowerCase().includes(lowerIndustry))
  );
}

/**
 * Get latest reports
 */
export function getLatest(limit: number = 5): ResearchReport[] {
  return [...KNOWN_REPORTS]
    .sort((a, b) => b.year - a.year)
    .slice(0, limit);
}

// CLI entry point
async function main() {
  const args = process.argv.slice(2);
  const skipSave = args.includes('--no-save');
  const includeSearch = args.includes('--search');
  const extractContent = args.includes('--extract');
  
  console.log('Research Collector');
  console.log('==================');
  console.log('Options:', { includeSearch, extractContent });
  console.log('');
  
  const result = await collectResearch({
    includeSearch,
    extractContent,
    save: !skipSave,
  });
  
  console.log('\nResults:');
  console.log(`  Reports collected: ${result.reportsCollected}`);
  console.log(`  With full content: ${result.reportsWithContent}`);
  
  if (result.errors.length > 0) {
    console.log(`  Errors: ${result.errors.length}`);
    for (const error of result.errors) {
      console.log(`    - ${error}`);
    }
  }
}

if (process.argv[1]?.endsWith('research.ts') || process.argv[1]?.endsWith('research.js')) {
  main();
}

export default { collectResearch, searchTopic, getByIndustry, getLatest };
