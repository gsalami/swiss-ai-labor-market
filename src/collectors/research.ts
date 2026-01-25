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

// Known research reports (curated list)
const KNOWN_REPORTS = [
  {
    id: 'research-mckinsey-ch-ai-2024',
    title: 'The economic potential of generative AI in Switzerland',
    authors: ['McKinsey & Company'],
    institution: 'McKinsey & Company',
    year: 2024,
    abstract: 'Analysis of generative AI impact on Swiss industries and labor market. Examines automation potential across sectors including finance, pharma, and manufacturing.',
    url: 'https://www.mckinsey.com/ch/',
    topics: ['generative ai', 'automation', 'productivity'],
    industries: ['finance', 'pharma', 'manufacturing', 'services'],
  },
  {
    id: 'research-ubs-future-work-2024',
    title: 'Future of Work: AI and the Swiss Labor Market',
    authors: ['UBS Chief Investment Office'],
    institution: 'UBS',
    year: 2024,
    abstract: 'Study on how AI will reshape employment in Switzerland. Focus on high-skill jobs in banking and professional services. Discusses reskilling needs.',
    url: 'https://www.ubs.com/global/en/wealth-management/insights.html',
    topics: ['future of work', 'reskilling', 'employment'],
    industries: ['banking', 'professional services'],
  },
  {
    id: 'research-eth-aiml-labor-2023',
    title: 'Machine Learning and Labor Market Outcomes',
    authors: ['ETH Zürich - KOF Swiss Economic Institute'],
    institution: 'ETH Zürich',
    year: 2023,
    abstract: 'Research on ML adoption by Swiss firms and effects on employment, wages, and skill requirements. Based on survey data from Swiss enterprises.',
    url: 'https://kof.ethz.ch/',
    topics: ['machine learning', 'employment', 'wages', 'skills'],
    industries: ['manufacturing', 'services', 'ict'],
  },
  {
    id: 'research-seco-digitalization-2023',
    title: 'Digitalisierung und Arbeitsmarkt Schweiz',
    authors: ['SECO'],
    institution: 'Staatssekretariat für Wirtschaft SECO',
    year: 2023,
    abstract: 'Official government report on digitalization effects on Swiss labor market. Includes policy recommendations for education and social security.',
    url: 'https://www.seco.admin.ch/',
    topics: ['digitalization', 'policy', 'education'],
    industries: ['all sectors'],
  },
  {
    id: 'research-credit-suisse-skills-2023',
    title: 'Skills Gap in the AI Era',
    authors: ['Credit Suisse Research Institute'],
    institution: 'Credit Suisse',
    year: 2023,
    abstract: 'Analysis of skill gaps in Switzerland as AI adoption accelerates. Focus on STEM education, vocational training, and lifelong learning needs.',
    url: 'https://www.credit-suisse.com/',
    topics: ['skills gap', 'education', 'training'],
    industries: ['technology', 'finance', 'healthcare'],
  },
  {
    id: 'research-iwi-hsg-ai-adoption-2024',
    title: 'AI Adoption in Swiss SMEs',
    authors: ['University of St. Gallen - IWI'],
    institution: 'Universität St. Gallen',
    year: 2024,
    abstract: 'Study on AI adoption rates and barriers among Swiss SMEs. Examines impact on competitiveness and employment in small and medium enterprises.',
    url: 'https://iwi.unisg.ch/',
    topics: ['sme', 'ai adoption', 'competitiveness'],
    industries: ['sme', 'manufacturing', 'services'],
  },
  {
    id: 'research-wef-future-jobs-ch-2023',
    title: 'Future of Jobs Report - Switzerland Insights',
    authors: ['World Economic Forum'],
    institution: 'World Economic Forum',
    year: 2023,
    abstract: 'Swiss-specific insights from the global Future of Jobs report. Projects job creation and displacement, emerging roles, and skill priorities.',
    url: 'https://www.weforum.org/reports/',
    topics: ['future of jobs', 'skills', 'job creation'],
    industries: ['all sectors'],
  },
  {
    id: 'research-snb-productivity-ai-2024',
    title: 'AI and Productivity in the Swiss Economy',
    authors: ['Swiss National Bank'],
    institution: 'Schweizerische Nationalbank',
    year: 2024,
    abstract: 'Central bank analysis of AI impact on productivity growth and macroeconomic implications for Switzerland.',
    url: 'https://www.snb.ch/',
    topics: ['productivity', 'macroeconomics', 'growth'],
    industries: ['macroeconomy'],
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
