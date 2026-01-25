/**
 * MCP Search Tool for Swiss Labor Market
 * Story 4.2 - Semantic search across all documents
 */

import * as db from '../../db/ruvector.js';
import { CANTON_MAP } from '../../graph/entities.js';

export interface SearchFilters {
  industry?: string;
  canton?: string;
  timeframe?: string;
  source_type?: 'bfs' | 'news' | 'research' | 'all';
}

export interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  source: string;
  sourceUrl?: string;
  relevanceScore: number;
  metadata: {
    industry?: string;
    canton?: string;
    date?: string;
    aiImpactScore?: number;
  };
}

export interface SearchResponse {
  query: string;
  filters: SearchFilters;
  totalResults: number;
  results: SearchResult[];
  suggestions?: string[];
}

// Industry name standardization for better matching
const INDUSTRY_ALIASES: Record<string, string[]> = {
  'Finanzdienstleistungen': ['finance', 'banking', 'fintech', 'bank', 'versicherung', 'insurance'],
  'Information und Kommunikation': ['IT', 'tech', 'software', 'digital', 'ict', 'technologie'],
  'Pharma und Chemie': ['pharma', 'pharmaceutical', 'biotech', 'life sciences', 'chemie'],
  'Verarbeitendes Gewerbe': ['manufacturing', 'produktion', 'industrie', 'fabrik'],
  'Gesundheits- und Sozialwesen': ['healthcare', 'gesundheit', 'spital', 'hospital', 'pflege'],
  'Handel': ['retail', 'commerce', 'detailhandel', 'einzelhandel', 'shopping'],
  'Gastgewerbe': ['hospitality', 'hotel', 'tourism', 'restaurant', 'tourismus'],
  'Baugewerbe': ['construction', 'bau', 'immobilien', 'real estate'],
  'Verkehr und Lagerei': ['transport', 'logistik', 'logistics', 'shipping', 'spedition'],
};

/**
 * Normalize canton input
 */
function normalizeCanton(canton: string): string | undefined {
  const upperCanton = canton.toUpperCase().trim();
  
  // Direct canton code
  if (CANTON_MAP[upperCanton]) {
    return CANTON_MAP[upperCanton];
  }
  
  // Full canton name
  const fullName = Object.values(CANTON_MAP).find(
    name => name.toLowerCase() === canton.toLowerCase()
  );
  if (fullName) return fullName;
  
  return undefined;
}

/**
 * Normalize industry input
 */
function normalizeIndustry(industry: string): string | undefined {
  const lowIndustry = industry.toLowerCase();
  
  // Direct match
  for (const [standard, aliases] of Object.entries(INDUSTRY_ALIASES)) {
    if (standard.toLowerCase() === lowIndustry) return standard;
    if (aliases.some(a => a.toLowerCase() === lowIndustry)) return standard;
    if (aliases.some(a => lowIndustry.includes(a))) return standard;
  }
  
  return industry; // Return original if no match
}

/**
 * Extract snippet from content
 */
function extractSnippet(content: string, query: string, maxLength: number = 300): string {
  const queryTerms = query.toLowerCase().split(/\s+/);
  const contentLower = content.toLowerCase();
  
  // Find the best position containing query terms
  let bestPos = 0;
  let bestScore = 0;
  
  for (let i = 0; i < content.length - maxLength; i += 50) {
    const section = contentLower.substring(i, i + maxLength);
    let score = 0;
    for (const term of queryTerms) {
      if (section.includes(term)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestPos = i;
    }
  }
  
  // Extract snippet
  let snippet = content.substring(bestPos, bestPos + maxLength);
  
  // Clean up start/end
  const firstSpace = snippet.indexOf(' ');
  if (firstSpace > 0 && firstSpace < 30) {
    snippet = snippet.substring(firstSpace + 1);
  }
  
  const lastSpace = snippet.lastIndexOf(' ');
  if (lastSpace > maxLength - 50) {
    snippet = snippet.substring(0, lastSpace);
  }
  
  return snippet.trim() + '...';
}

/**
 * Parse timeframe filter
 */
function parseTimeframe(timeframe: string): { from?: string; to?: string } {
  const currentYear = new Date().getFullYear();
  
  // Year range: "2020-2024"
  const rangeMatch = timeframe.match(/^(\d{4})-(\d{4})$/);
  if (rangeMatch) {
    return { from: rangeMatch[1], to: rangeMatch[2] };
  }
  
  // Single year: "2024"
  const yearMatch = timeframe.match(/^(\d{4})$/);
  if (yearMatch) {
    return { from: yearMatch[1], to: yearMatch[1] };
  }
  
  // Relative: "last_year", "last_5_years"
  if (timeframe.includes('last')) {
    const numMatch = timeframe.match(/(\d+)/);
    const years = numMatch ? parseInt(numMatch[1]) : 1;
    return {
      from: String(currentYear - years),
      to: String(currentYear),
    };
  }
  
  return {};
}

/**
 * Search the labor market knowledge base
 */
export async function searchLaborMarket(
  query: string,
  filters?: SearchFilters,
  limit: number = 5
): Promise<SearchResponse> {
  await db.init();
  
  // Normalize filters
  const normalizedFilters: SearchFilters = { ...filters };
  if (filters?.canton) {
    const normalized = normalizeCanton(filters.canton);
    if (normalized) normalizedFilters.canton = normalized;
  }
  if (filters?.industry) {
    normalizedFilters.industry = normalizeIndustry(filters.industry);
  }
  
  // Build search options
  const searchOptions: {
    limit: number;
    filter?: {
      source?: string;
      industry?: string;
      canton?: string;
      dateFrom?: string;
      dateTo?: string;
    };
  } = {
    limit: limit * 3, // Fetch more for filtering
  };
  
  if (normalizedFilters.source_type && normalizedFilters.source_type !== 'all') {
    searchOptions.filter = searchOptions.filter || {};
    searchOptions.filter.source = normalizedFilters.source_type;
  }
  
  if (normalizedFilters.industry) {
    searchOptions.filter = searchOptions.filter || {};
    searchOptions.filter.industry = normalizedFilters.industry;
  }
  
  if (normalizedFilters.canton) {
    searchOptions.filter = searchOptions.filter || {};
    searchOptions.filter.canton = normalizedFilters.canton;
  }
  
  if (normalizedFilters.timeframe) {
    const { from, to } = parseTimeframe(normalizedFilters.timeframe);
    if (from || to) {
      searchOptions.filter = searchOptions.filter || {};
      searchOptions.filter.dateFrom = from;
      searchOptions.filter.dateTo = to;
    }
  }
  
  // Perform search
  const rawResults = await db.search(query, searchOptions);
  
  // Also search for query variations
  const queryVariations = generateQueryVariations(query);
  for (const variation of queryVariations) {
    const additionalResults = await db.search(variation, { limit: 5 });
    for (const result of additionalResults) {
      if (!rawResults.some(r => r.id === result.id)) {
        rawResults.push({ ...result, score: result.score * 0.8 });
      }
    }
  }
  
  // Transform and filter results
  const results: SearchResult[] = rawResults
    .filter(r => !r.id.startsWith('entity:') && !r.id.startsWith('impact:'))
    .map(r => ({
      id: r.id,
      title: r.metadata.title || extractTitle(r.content),
      snippet: extractSnippet(r.content, query),
      source: r.metadata.source || 'unknown',
      sourceUrl: r.metadata.sourceUrl,
      relevanceScore: Math.round(r.score * 100) / 100,
      metadata: {
        industry: r.metadata.industry,
        canton: r.metadata.canton,
        date: r.metadata.date,
        aiImpactScore: r.metadata.aiImpactScore,
      },
    }))
    .slice(0, limit);
  
  // Generate suggestions if few results
  const suggestions = results.length < 3 
    ? generateSearchSuggestions(query, normalizedFilters)
    : undefined;
  
  return {
    query,
    filters: normalizedFilters,
    totalResults: results.length,
    results,
    suggestions,
  };
}

/**
 * Extract title from content
 */
function extractTitle(content: string): string {
  const firstLine = content.split('\n')[0];
  return firstLine.length > 100 
    ? firstLine.substring(0, 100) + '...'
    : firstLine;
}

/**
 * Generate query variations for broader search
 */
function generateQueryVariations(query: string): string[] {
  const variations: string[] = [];
  const lowQuery = query.toLowerCase();
  
  // German/English translations for common terms
  const translations: Record<string, string> = {
    'job': 'Arbeit',
    'jobs': 'Arbeitsplätze',
    'employment': 'Beschäftigung',
    'unemployment': 'Arbeitslosigkeit',
    'salary': 'Lohn',
    'wages': 'Löhne',
    'ai': 'Künstliche Intelligenz',
    'artificial intelligence': 'KI',
    'automation': 'Automatisierung',
    'industry': 'Branche',
    'technology': 'Technologie',
    'arbeitsmarkt': 'labor market',
    'beschäftigung': 'employment',
    'ki': 'AI',
  };
  
  for (const [from, to] of Object.entries(translations)) {
    if (lowQuery.includes(from)) {
      variations.push(query.replace(new RegExp(from, 'gi'), to));
    }
  }
  
  return variations.slice(0, 3);
}

/**
 * Generate search suggestions
 */
function generateSearchSuggestions(query: string, filters: SearchFilters): string[] {
  const suggestions: string[] = [];
  
  // Suggest broader search
  if (filters.industry || filters.canton) {
    suggestions.push(`Try searching "${query}" without filters for more results`);
  }
  
  // Suggest related queries
  const lowQuery = query.toLowerCase();
  if (lowQuery.includes('ai') || lowQuery.includes('ki')) {
    suggestions.push('Try: "AI Automatisierung Arbeitsmarkt Schweiz"');
  }
  if (lowQuery.includes('job') || lowQuery.includes('arbeit')) {
    suggestions.push('Try: "Beschäftigung Trends Schweiz"');
  }
  
  // Suggest industry-specific
  suggestions.push('Add an industry filter: Finanzdienstleistungen, IT, Pharma');
  
  return suggestions.slice(0, 3);
}

export default { searchLaborMarket };
