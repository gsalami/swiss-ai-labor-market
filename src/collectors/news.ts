/**
 * News Collector
 * Collects AI-related labor market news from Swiss RSS/Atom feeds
 * Sources: NZZ, Tages-Anzeiger, SRF, Handelszeitung
 */

import Parser from 'rss-parser';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { promises as fs } from 'fs';
import path from 'path';

// RSS Feed sources
const RSS_FEEDS = {
  nzz: {
    name: 'NZZ',
    feeds: [
      'https://www.nzz.ch/wirtschaft.rss',
      'https://www.nzz.ch/technologie.rss',
    ],
  },
  tagesanzeiger: {
    name: 'Tages-Anzeiger',
    feeds: [
      'https://www.tagesanzeiger.ch/wirtschaft/rss.xml',
    ],
  },
  srf: {
    name: 'SRF',
    feeds: [
      'https://www.srf.ch/news/wirtschaft/bnf/rss/1968',
      'https://www.srf.ch/news/schweiz/bnf/rss/1965',
    ],
  },
  handelszeitung: {
    name: 'Handelszeitung',
    feeds: [
      'https://www.handelszeitung.ch/feed',
    ],
  },
};

// Keywords for filtering AI + labor market content
const AI_KEYWORDS = [
  'künstliche intelligenz', 'ki', 'artificial intelligence', 'ai',
  'machine learning', 'maschinelles lernen', 'deep learning',
  'chatgpt', 'openai', 'claude', 'llm', 'sprachmodell',
  'automatisierung', 'automation', 'roboter', 'robotik',
  'digitalisierung', 'digital transformation',
];

const LABOR_KEYWORDS = [
  'arbeitsmarkt', 'arbeitnehmer', 'arbeitgeber', 'arbeitsplatz', 'arbeitsplätze',
  'job', 'jobs', 'stelle', 'stellen', 'beschäftigung', 'beschäftigte',
  'arbeitslosigkeit', 'arbeitslose', 'entlassung', 'entlassungen',
  'fachkräftemangel', 'fachkräfte', 'talente', 'rekrutierung',
  'lohn', 'löhne', 'gehalt', 'gehälter', 'einkommen',
  'weiterbildung', 'umschulung', 'qualifikation', 'skills',
  'homeoffice', 'remote work', 'hybrid work',
  'beruf', 'berufe', 'karriere',
];

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  content: string;
  link: string;
  pubDate: string;
  source: string;
  sourceName: string;
  aiRelevance: number;  // 0-1 score
  laborRelevance: number;  // 0-1 score
  keywords: string[];
}

export interface CollectorResult {
  success: boolean;
  articlesCollected: number;
  articlesFiltered: number;
  errors: string[];
}

const parser = new Parser({
  timeout: 30000,
  headers: {
    'User-Agent': 'Swiss-AI-Labor-Market-Collector/1.0',
  },
});

/**
 * Calculate keyword relevance score
 */
function calculateRelevance(text: string, keywords: string[]): { score: number; matches: string[] } {
  const lowerText = text.toLowerCase();
  const matches: string[] = [];
  
  for (const keyword of keywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      matches.push(keyword);
    }
  }
  
  const score = Math.min(1, matches.length / 3);  // Normalize to 0-1
  return { score, matches };
}

/**
 * Check if article is relevant (AI + labor market)
 */
function isRelevant(article: { title?: string; description?: string; content?: string }): {
  relevant: boolean;
  aiScore: number;
  laborScore: number;
  keywords: string[];
} {
  const text = [
    article.title || '',
    article.description || '',
    article.content || '',
  ].join(' ');
  
  const ai = calculateRelevance(text, AI_KEYWORDS);
  const labor = calculateRelevance(text, LABOR_KEYWORDS);
  
  // Relevant if has both AI and labor keywords, or strong presence of either
  const relevant = (ai.score > 0 && labor.score > 0) || ai.score > 0.5 || labor.score > 0.5;
  
  return {
    relevant,
    aiScore: ai.score,
    laborScore: labor.score,
    keywords: [...ai.matches, ...labor.matches],
  };
}

/**
 * Extract article content from URL
 */
async function extractContent(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Swiss-AI-Labor-Market/1.0)',
      },
    });
    
    const $ = cheerio.load(response.data);
    
    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, .advertisement, .ad, .social-share').remove();
    
    // Try common article selectors
    const selectors = [
      'article',
      '[role="main"]',
      '.article-body',
      '.story-body',
      '.content-body',
      'main',
    ];
    
    for (const selector of selectors) {
      const content = $(selector).text().trim();
      if (content.length > 200) {
        return content.substring(0, 5000);  // Limit content length
      }
    }
    
    // Fallback to body
    return $('body').text().trim().substring(0, 5000);
    
  } catch (error) {
    console.log(`[News] Could not extract content from ${url}`);
    return '';
  }
}

/**
 * Generate unique article ID
 */
function generateArticleId(source: string, link: string): string {
  const urlHash = Buffer.from(link).toString('base64').substring(0, 12);
  return `news-${source}-${urlHash}`;
}

/**
 * Fetch articles from a single feed
 */
async function fetchFeed(feedUrl: string, sourceKey: string, sourceName: string): Promise<NewsArticle[]> {
  console.log(`[News] Fetching ${sourceName}: ${feedUrl}`);
  
  try {
    const feed = await parser.parseURL(feedUrl);
    const articles: NewsArticle[] = [];
    
    for (const item of feed.items || []) {
      const relevance = isRelevant({
        title: item.title,
        description: item.contentSnippet || item.content,
      });
      
      if (!relevance.relevant) continue;
      
      // Extract full content for highly relevant articles
      let content = item.contentSnippet || item.content || '';
      if (relevance.aiScore > 0.3 && relevance.laborScore > 0.3 && item.link) {
        const extracted = await extractContent(item.link);
        if (extracted) content = extracted;
      }
      
      articles.push({
        id: generateArticleId(sourceKey, item.link || item.title || ''),
        title: item.title || 'Untitled',
        description: item.contentSnippet || item.content || '',
        content,
        link: item.link || '',
        pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
        source: sourceKey,
        sourceName,
        aiRelevance: relevance.aiScore,
        laborRelevance: relevance.laborScore,
        keywords: relevance.keywords,
      });
    }
    
    return articles;
    
  } catch (error) {
    console.error(`[News] Error fetching ${feedUrl}:`, error instanceof Error ? error.message : error);
    return [];
  }
}

/**
 * Transform article to markdown document
 */
function articleToMarkdown(article: NewsArticle): string {
  return `# ${article.title}

**Quelle:** ${article.sourceName}  
**Datum:** ${new Date(article.pubDate).toLocaleDateString('de-CH')}  
**Link:** ${article.link}

## Zusammenfassung
${article.description}

## Inhalt
${article.content}

## Relevanz
- AI-Relevanz: ${(article.aiRelevance * 100).toFixed(0)}%
- Arbeitsmarkt-Relevanz: ${(article.laborRelevance * 100).toFixed(0)}%
- Keywords: ${article.keywords.join(', ')}
`;
}

/**
 * Save articles to local files
 */
async function saveArticles(articles: NewsArticle[]): Promise<void> {
  const dataDir = path.join(process.cwd(), 'data', 'news');
  await fs.mkdir(dataDir, { recursive: true });
  
  // Save individual articles
  for (const article of articles) {
    const jsonPath = path.join(dataDir, `${article.id}.json`);
    const mdPath = path.join(dataDir, `${article.id}.md`);
    
    await fs.writeFile(jsonPath, JSON.stringify(article, null, 2), 'utf-8');
    await fs.writeFile(mdPath, articleToMarkdown(article), 'utf-8');
  }
  
  // Save index
  const indexPath = path.join(dataDir, 'index.json');
  const index = articles.map(a => ({
    id: a.id,
    title: a.title,
    source: a.sourceName,
    pubDate: a.pubDate,
    aiRelevance: a.aiRelevance,
    laborRelevance: a.laborRelevance,
  }));
  await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
  
  console.log(`[News] Saved ${articles.length} articles to ${dataDir}`);
}

/**
 * Collect news from all sources
 */
export async function collectNews(options: {
  sources?: string[];
  extractContent?: boolean;
  save?: boolean;
} = {}): Promise<CollectorResult> {
  const { sources, save = true } = options;
  
  console.log('[News] Starting news collection...');
  
  const result: CollectorResult = {
    success: true,
    articlesCollected: 0,
    articlesFiltered: 0,
    errors: [],
  };
  
  const allArticles: NewsArticle[] = [];
  let totalFetched = 0;
  
  // Filter sources if specified
  const feedSources = sources
    ? Object.entries(RSS_FEEDS).filter(([key]) => sources.includes(key))
    : Object.entries(RSS_FEEDS);
  
  for (const [sourceKey, source] of feedSources) {
    for (const feedUrl of source.feeds) {
      try {
        const articles = await fetchFeed(feedUrl, sourceKey, source.name);
        totalFetched += articles.length + 10;  // Estimate total fetched
        allArticles.push(...articles);
      } catch (error) {
        result.errors.push(`${source.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  
  // Deduplicate by ID
  const uniqueArticles = Array.from(
    new Map(allArticles.map(a => [a.id, a])).values()
  );
  
  // Sort by relevance (combined score)
  uniqueArticles.sort((a, b) => 
    (b.aiRelevance + b.laborRelevance) - (a.aiRelevance + a.laborRelevance)
  );
  
  result.articlesCollected = totalFetched;
  result.articlesFiltered = uniqueArticles.length;
  
  console.log(`[News] Collected ${totalFetched} total, ${uniqueArticles.length} relevant articles`);
  
  if (save && uniqueArticles.length > 0) {
    await saveArticles(uniqueArticles);
  }
  
  if (result.errors.length > 0) {
    console.log(`[News] Completed with ${result.errors.length} errors`);
  } else {
    console.log('[News] Collection completed successfully');
  }
  
  return result;
}

// CLI entry point
async function main() {
  const args = process.argv.slice(2);
  const skipSave = args.includes('--no-save');
  const sourcesArg = args.find(a => a.startsWith('--sources='));
  const sources = sourcesArg ? sourcesArg.split('=')[1].split(',') : undefined;
  
  console.log('News Collector');
  console.log('==============');
  console.log('Sources:', sources || 'all');
  console.log('');
  
  const result = await collectNews({
    sources,
    save: !skipSave,
  });
  
  console.log('\nResults:');
  console.log(`  Total fetched: ~${result.articlesCollected}`);
  console.log(`  Relevant articles: ${result.articlesFiltered}`);
  
  if (result.errors.length > 0) {
    console.log(`  Errors: ${result.errors.length}`);
    for (const error of result.errors) {
      console.log(`    - ${error}`);
    }
  }
}

if (process.argv[1]?.endsWith('news.ts') || process.argv[1]?.endsWith('news.js')) {
  main();
}

export default { collectNews };
