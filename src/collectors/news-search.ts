/**
 * News Collector v2 - Web Search Based
 * Uses Brave Search API to find AI + labor market news and reports
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { promises as fs } from 'fs';
import path from 'path';

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const DATA_DIR = path.join(process.cwd(), 'data', 'news');

// Search queries for different content types
const SEARCH_QUERIES = [
  // Swiss AI + Labor Market News
  { query: 'KI Arbeitsmarkt Schweiz', type: 'news', lang: 'de' },
  { query: 'künstliche Intelligenz Jobs Schweiz', type: 'news', lang: 'de' },
  { query: 'AI Automatisierung Arbeitsplätze Schweiz', type: 'news', lang: 'de' },
  { query: 'Digitalisierung Fachkräfte Schweiz', type: 'news', lang: 'de' },
  { query: 'ChatGPT Arbeit Schweiz', type: 'news', lang: 'de' },
  
  // International AI Labor Reports
  { query: 'AI labor market report 2024 2025', type: 'report', lang: 'en' },
  { query: 'artificial intelligence workforce study', type: 'report', lang: 'en' },
  { query: 'McKinsey AI jobs automation report', type: 'report', lang: 'en' },
  { query: 'PWC artificial intelligence employment', type: 'report', lang: 'en' },
  { query: 'Deloitte AI workforce transformation', type: 'report', lang: 'en' },
  { query: 'World Economic Forum future of jobs AI', type: 'report', lang: 'en' },
  { query: 'OECD AI employment impact', type: 'report', lang: 'en' },
];

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  url: string;
  publishedDate?: string;
  source: string;
  type: 'news' | 'report';
  language: string;
  content?: string;
  relevanceScore: number;
}

export interface CollectorResult {
  success: boolean;
  articlesFound: number;
  articlesSaved: number;
  errors: string[];
}

/**
 * Search using Brave Search API
 */
async function braveSearch(query: string, freshness: string = 'pw'): Promise<any[]> {
  if (!BRAVE_API_KEY) {
    throw new Error('BRAVE_API_KEY not configured');
  }

  const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
    headers: {
      'Accept': 'application/json',
      'X-Subscription-Token': BRAVE_API_KEY,
    },
    params: {
      q: query,
      count: 20,
      freshness: freshness, // pd=past day, pw=past week, pm=past month
      text_decorations: false,
    },
  });

  return response.data.web?.results || [];
}

/**
 * Extract main content from URL
 */
async function extractContent(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Swiss-AI-Labor-Market/2.0)',
      },
      maxRedirects: 5,
    });

    const $ = cheerio.load(response.data);
    
    // Remove scripts, styles, nav, footer
    $('script, style, nav, footer, header, aside, .ad, .advertisement').remove();
    
    // Try common article selectors
    const selectors = ['article', '.article-content', '.post-content', 'main', '.content'];
    let content = '';
    
    for (const selector of selectors) {
      const text = $(selector).text().trim();
      if (text.length > content.length) {
        content = text;
      }
    }
    
    // Fallback to body
    if (content.length < 200) {
      content = $('body').text().trim();
    }
    
    // Clean up whitespace
    content = content.replace(/\s+/g, ' ').slice(0, 5000);
    
    return content;
  } catch (error) {
    console.log(`[Search] Could not extract content from ${url}`);
    return '';
  }
}

/**
 * Calculate relevance score based on keywords
 */
function calculateRelevance(text: string): number {
  const lowerText = text.toLowerCase();
  
  const aiKeywords = [
    'ki', 'künstliche intelligenz', 'ai', 'artificial intelligence',
    'machine learning', 'deep learning', 'chatgpt', 'openai', 'llm',
    'automatisierung', 'automation', 'roboter', 'algorithmus',
  ];
  
  const laborKeywords = [
    'arbeitsmarkt', 'job', 'jobs', 'arbeit', 'beschäftigung',
    'arbeitsplatz', 'arbeitsplätze', 'fachkräfte', 'workforce',
    'employment', 'labor', 'labour', 'workers', 'skills',
  ];
  
  let aiScore = 0;
  let laborScore = 0;
  
  for (const kw of aiKeywords) {
    if (lowerText.includes(kw)) aiScore++;
  }
  
  for (const kw of laborKeywords) {
    if (lowerText.includes(kw)) laborScore++;
  }
  
  // Combined score (0-100)
  return Math.min(100, (aiScore * 10) + (laborScore * 10));
}

/**
 * Generate unique ID from URL
 */
function generateId(url: string): string {
  const hash = url.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  return `search-${Math.abs(hash).toString(36)}`;
}

/**
 * Load existing articles to avoid duplicates
 */
async function loadExistingUrls(): Promise<Set<string>> {
  const urls = new Set<string>();
  
  try {
    const files = await fs.readdir(DATA_DIR);
    for (const file of files) {
      if (file.endsWith('.json') && file !== 'index.json') {
        const content = await fs.readFile(path.join(DATA_DIR, file), 'utf-8');
        const article = JSON.parse(content);
        if (article.url) urls.add(article.url);
      }
    }
  } catch {
    // Directory might not exist yet
  }
  
  return urls;
}

/**
 * Save article to disk
 */
async function saveArticle(article: SearchResult): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  
  const filename = `${article.id}.json`;
  await fs.writeFile(
    path.join(DATA_DIR, filename),
    JSON.stringify(article, null, 2),
    'utf-8'
  );
}

/**
 * Main collection function
 */
export async function collectNewsViaSearch(): Promise<CollectorResult> {
  console.log('[Search] Starting web search collection...');
  
  const errors: string[] = [];
  const existingUrls = await loadExistingUrls();
  const allResults: SearchResult[] = [];
  const seenUrls = new Set<string>();
  
  for (const searchConfig of SEARCH_QUERIES) {
    try {
      console.log(`[Search] Searching: "${searchConfig.query}"`);
      
      // Use past week for news, past month for reports
      const freshness = searchConfig.type === 'news' ? 'pw' : 'pm';
      const results = await braveSearch(searchConfig.query, freshness);
      
      for (const result of results) {
        // Skip duplicates
        if (seenUrls.has(result.url) || existingUrls.has(result.url)) {
          continue;
        }
        seenUrls.add(result.url);
        
        // Skip non-relevant domains for reports
        if (searchConfig.type === 'report') {
          const domainOk = /mckinsey|pwc|deloitte|weforum|oecd|stanford|mit|harvard|imf|worldbank/i.test(result.url);
          if (!domainOk) continue;
        }
        
        const text = `${result.title} ${result.description}`;
        const relevance = calculateRelevance(text);
        
        // Only keep if relevant enough
        if (relevance >= 20) {
          allResults.push({
            id: generateId(result.url),
            title: result.title,
            description: result.description,
            url: result.url,
            publishedDate: result.page_age || new Date().toISOString(),
            source: new URL(result.url).hostname.replace('www.', ''),
            type: searchConfig.type,
            language: searchConfig.lang,
            relevanceScore: relevance,
          });
        }
      }
      
      // Rate limiting
      await new Promise(r => setTimeout(r, 500));
      
    } catch (error: any) {
      const msg = `Error searching "${searchConfig.query}": ${error.message}`;
      console.log(`[Search] ${msg}`);
      errors.push(msg);
    }
  }
  
  // Sort by relevance and take top results
  allResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
  const topResults = allResults.slice(0, 50);
  
  console.log(`[Search] Found ${allResults.length} results, saving top ${topResults.length}`);
  
  // Extract content and save
  let saved = 0;
  for (const article of topResults) {
    try {
      // Extract full content
      article.content = await extractContent(article.url);
      
      // Recalculate relevance with full content
      if (article.content) {
        article.relevanceScore = calculateRelevance(
          `${article.title} ${article.description} ${article.content}`
        );
      }
      
      // Save if still relevant
      if (article.relevanceScore >= 20) {
        await saveArticle(article);
        saved++;
        console.log(`[Search] ✓ Saved: ${article.title.slice(0, 50)}...`);
      }
      
      // Rate limiting for content extraction
      await new Promise(r => setTimeout(r, 300));
      
    } catch (error: any) {
      errors.push(`Error saving ${article.url}: ${error.message}`);
    }
  }
  
  console.log(`[Search] Collection complete: ${saved} articles saved`);
  
  return {
    success: errors.length === 0,
    articlesFound: allResults.length,
    articlesSaved: saved,
    errors,
  };
}

// CLI runner
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain || process.argv[1]?.includes('news-search')) {
  collectNewsViaSearch()
    .then(result => {
      console.log('\n' + '='.repeat(50));
      console.log(`Results: ${result.articlesSaved} saved, ${result.articlesFound} found`);
      if (result.errors.length > 0) {
        console.log(`Errors: ${result.errors.length}`);
      }
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}
