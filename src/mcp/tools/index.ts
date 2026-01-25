/**
 * MCP Tools Index
 * Exports all MCP tools for the Swiss AI Labor Market server
 */

export { searchLaborMarket, type SearchFilters, type SearchResult, type SearchResponse } from './search.js';
export { getAIImpact, type ImpactTargetType, type AIImpactResponse, type RelatedEntity } from './ai-impact.js';
export { getJobTrends, type TrendMetric, type TrendDataPoint, type TrendResponse } from './trends.js';
