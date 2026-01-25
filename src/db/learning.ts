/**
 * Self-Learning Module for Swiss AI Labor Market
 * Tracks user interactions and improves search relevance over time
 */

import fs from 'fs/promises';
import path from 'path';

// Types
export interface SearchEvent {
  timestamp: string;
  query: string;
  resultsCount: number;
  clickedIds: string[];
  feedbackScores: Record<string, number>; // docId -> score (1-5)
}

export interface DocumentScore {
  docId: string;
  baseScore: number;
  learnedBoost: number;
  clickCount: number;
  avgFeedback: number;
  lastUpdated: string;
}

export interface LearningStats {
  totalSearches: number;
  totalClicks: number;
  totalFeedback: number;
  avgClickRate: number;
  avgFeedbackScore: number;
  topQueries: Array<{ query: string; count: number }>;
  topDocuments: Array<{ docId: string; title: string; score: number }>;
  learningCurve: Array<{ date: string; avgRelevance: number }>;
}

// Storage
const LEARNING_PATH = './data/learning';
let searchEvents: SearchEvent[] = [];
let documentScores: Map<string, DocumentScore> = new Map();
let initialized = false;

/**
 * Initialize learning module
 */
export async function initLearning(): Promise<void> {
  if (initialized) return;
  
  try {
    await fs.mkdir(LEARNING_PATH, { recursive: true });
    
    // Load existing data
    try {
      const eventsData = await fs.readFile(path.join(LEARNING_PATH, 'events.json'), 'utf-8');
      searchEvents = JSON.parse(eventsData);
    } catch { /* No existing data */ }
    
    try {
      const scoresData = await fs.readFile(path.join(LEARNING_PATH, 'scores.json'), 'utf-8');
      const scores = JSON.parse(scoresData) as DocumentScore[];
      for (const score of scores) {
        documentScores.set(score.docId, score);
      }
    } catch { /* No existing data */ }
    
    initialized = true;
    console.log(`[Learning] Initialized (${searchEvents.length} events, ${documentScores.size} doc scores)`);
  } catch (error) {
    console.error('[Learning] Init error:', error);
  }
}

/**
 * Save learning data
 */
async function saveLearningData(): Promise<void> {
  await fs.writeFile(
    path.join(LEARNING_PATH, 'events.json'),
    JSON.stringify(searchEvents.slice(-10000), null, 2) // Keep last 10k events
  );
  await fs.writeFile(
    path.join(LEARNING_PATH, 'scores.json'),
    JSON.stringify(Array.from(documentScores.values()), null, 2)
  );
}

/**
 * Record a search event
 */
export async function recordSearch(query: string, resultsCount: number): Promise<string> {
  if (!initialized) await initLearning();
  
  const eventId = `search_${Date.now()}`;
  const event: SearchEvent = {
    timestamp: new Date().toISOString(),
    query: query.toLowerCase().trim(),
    resultsCount,
    clickedIds: [],
    feedbackScores: {},
  };
  
  searchEvents.push(event);
  
  // Save periodically
  if (searchEvents.length % 10 === 0) {
    await saveLearningData();
  }
  
  return eventId;
}

/**
 * Record a click on a search result
 */
export async function recordClick(docId: string, query: string): Promise<void> {
  if (!initialized) await initLearning();
  
  // Update recent search event
  const recentEvent = searchEvents.slice(-50).find(e => e.query === query.toLowerCase().trim());
  if (recentEvent && !recentEvent.clickedIds.includes(docId)) {
    recentEvent.clickedIds.push(docId);
  }
  
  // Update document score
  let score = documentScores.get(docId);
  if (!score) {
    score = {
      docId,
      baseScore: 1.0,
      learnedBoost: 0,
      clickCount: 0,
      avgFeedback: 0,
      lastUpdated: new Date().toISOString(),
    };
  }
  
  score.clickCount++;
  score.learnedBoost = Math.min(0.5, score.clickCount * 0.02); // Max 50% boost
  score.lastUpdated = new Date().toISOString();
  
  documentScores.set(docId, score);
  await saveLearningData();
}

/**
 * Record feedback for a document
 */
export async function recordFeedback(docId: string, rating: number, query?: string): Promise<void> {
  if (!initialized) await initLearning();
  
  const normalizedRating = Math.max(1, Math.min(5, rating));
  
  // Update recent search event
  if (query) {
    const recentEvent = searchEvents.slice(-50).find(e => e.query === query.toLowerCase().trim());
    if (recentEvent) {
      recentEvent.feedbackScores[docId] = normalizedRating;
    }
  }
  
  // Update document score
  let score = documentScores.get(docId);
  if (!score) {
    score = {
      docId,
      baseScore: 1.0,
      learnedBoost: 0,
      clickCount: 0,
      avgFeedback: normalizedRating,
      lastUpdated: new Date().toISOString(),
    };
  } else {
    // Rolling average
    const feedbackCount = Object.keys(
      searchEvents.filter(e => e.feedbackScores[docId]).length || 1
    );
    score.avgFeedback = (score.avgFeedback * (feedbackCount - 1) + normalizedRating) / feedbackCount;
  }
  
  // Adjust boost based on feedback
  if (score.avgFeedback >= 4) {
    score.learnedBoost += 0.1;
  } else if (score.avgFeedback <= 2) {
    score.learnedBoost -= 0.1;
  }
  score.learnedBoost = Math.max(-0.3, Math.min(0.5, score.learnedBoost));
  score.lastUpdated = new Date().toISOString();
  
  documentScores.set(docId, score);
  await saveLearningData();
}

/**
 * Get learned boost for a document
 */
export function getLearnedBoost(docId: string): number {
  const score = documentScores.get(docId);
  return score?.learnedBoost || 0;
}

/**
 * Get learning statistics for visualization
 */
export async function getLearningStats(): Promise<LearningStats> {
  if (!initialized) await initLearning();
  
  // Calculate stats
  const totalSearches = searchEvents.length;
  const totalClicks = searchEvents.reduce((sum, e) => sum + e.clickedIds.length, 0);
  const allFeedback = searchEvents.flatMap(e => Object.values(e.feedbackScores));
  const totalFeedback = allFeedback.length;
  
  const avgClickRate = totalSearches > 0 ? totalClicks / totalSearches : 0;
  const avgFeedbackScore = totalFeedback > 0 
    ? allFeedback.reduce((a, b) => a + b, 0) / totalFeedback 
    : 0;
  
  // Top queries
  const queryCounts: Record<string, number> = {};
  for (const event of searchEvents) {
    queryCounts[event.query] = (queryCounts[event.query] || 0) + 1;
  }
  const topQueries = Object.entries(queryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([query, count]) => ({ query, count }));
  
  // Top documents by learned score
  const topDocuments = Array.from(documentScores.values())
    .sort((a, b) => (b.learnedBoost + b.clickCount * 0.01) - (a.learnedBoost + a.clickCount * 0.01))
    .slice(0, 10)
    .map(d => ({
      docId: d.docId,
      title: d.docId, // Would need to look up actual title
      score: d.baseScore + d.learnedBoost,
    }));
  
  // Learning curve (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const dailyRelevance: Record<string, number[]> = {};
  for (const event of searchEvents) {
    const eventDate = new Date(event.timestamp);
    if (eventDate >= thirtyDaysAgo) {
      const dateKey = eventDate.toISOString().split('T')[0];
      if (!dailyRelevance[dateKey]) dailyRelevance[dateKey] = [];
      
      // Relevance = click rate + avg feedback
      const eventRelevance = event.clickedIds.length / Math.max(1, event.resultsCount);
      dailyRelevance[dateKey].push(eventRelevance);
    }
  }
  
  const learningCurve = Object.entries(dailyRelevance)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, scores]) => ({
      date,
      avgRelevance: scores.reduce((a, b) => a + b, 0) / scores.length,
    }));
  
  return {
    totalSearches,
    totalClicks,
    totalFeedback,
    avgClickRate,
    avgFeedbackScore,
    topQueries,
    topDocuments,
    learningCurve,
  };
}

/**
 * Export learning data as JSON (for API/dashboard)
 */
export async function exportLearningData(): Promise<{
  stats: LearningStats;
  documentScores: DocumentScore[];
  recentEvents: SearchEvent[];
}> {
  const stats = await getLearningStats();
  
  return {
    stats,
    documentScores: Array.from(documentScores.values()),
    recentEvents: searchEvents.slice(-100),
  };
}

export default {
  initLearning,
  recordSearch,
  recordClick,
  recordFeedback,
  getLearnedBoost,
  getLearningStats,
  exportLearningData,
};
