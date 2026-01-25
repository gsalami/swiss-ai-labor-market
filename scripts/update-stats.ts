#!/usr/bin/env tsx
/**
 * Weekly Statistics Update Script
 * Collects BFS and SECO statistics, updates AI impact scores
 * 
 * Usage:
 *   npm run collect:stats
 *   npx tsx scripts/update-stats.ts
 * 
 * Clawdbot cron: Weekly on Sunday at 03:00
 */

import { collectBFSData } from '../src/collectors/bfs.js';
import { promises as fs } from 'fs';
import path from 'path';

// Configuration
const CONFIG = {
  logDir: path.join(process.cwd(), 'logs'),
  logFile: 'stats-update.log',
  maxLogSize: 1024 * 1024, // 1MB
};

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  details?: unknown;
}

interface UpdateResult {
  success: boolean;
  message: string;
  stats: {
    bfsDatasetsCollected: number;
    documentsIngested: number;
    impactScoresUpdated: number;
    errors: string[];
  };
}

/**
 * Logger class with file output
 */
class Logger {
  private entries: LogEntry[] = [];
  private logPath: string;

  constructor(logDir: string, logFile: string) {
    this.logPath = path.join(logDir, logFile);
  }

  private log(level: LogEntry['level'], message: string, details?: unknown) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details,
    };
    this.entries.push(entry);
    
    const prefix = {
      info: '✓',
      warn: '⚠',
      error: '✗',
    }[level];
    
    console.log(`[${entry.timestamp}] ${prefix} ${message}`);
    if (details) {
      console.log('  ', JSON.stringify(details));
    }
  }

  info(message: string, details?: unknown) {
    this.log('info', message, details);
  }

  warn(message: string, details?: unknown) {
    this.log('warn', message, details);
  }

  error(message: string, details?: unknown) {
    this.log('error', message, details);
  }

  async save(): Promise<void> {
    await fs.mkdir(path.dirname(this.logPath), { recursive: true });
    
    let existingLog = '';
    try {
      existingLog = await fs.readFile(this.logPath, 'utf-8');
    } catch {
      // File doesn't exist yet
    }

    const newEntries = this.entries
      .map(e => `[${e.timestamp}] [${e.level.toUpperCase()}] ${e.message}${e.details ? ' | ' + JSON.stringify(e.details) : ''}`)
      .join('\n');
    
    const fullLog = existingLog + (existingLog ? '\n' : '') + newEntries;
    
    const trimmedLog = fullLog.length > CONFIG.maxLogSize 
      ? fullLog.slice(Math.floor(fullLog.length * 0.25))
      : fullLog;
    
    await fs.writeFile(this.logPath, trimmedLog, 'utf-8');
  }

  getErrors(): LogEntry[] {
    return this.entries.filter(e => e.level === 'error');
  }

  getSummary(): { total: number; errors: number; warnings: number } {
    return {
      total: this.entries.length,
      errors: this.entries.filter(e => e.level === 'error').length,
      warnings: this.entries.filter(e => e.level === 'warn').length,
    };
  }
}

/**
 * Update AI impact scores based on new data
 */
async function updateImpactScores(logger: Logger): Promise<number> {
  logger.info('Updating AI impact scores...');
  
  try {
    // Check if impact module exists
    const impactPath = path.join(process.cwd(), 'src', 'graph', 'impact.ts');
    try {
      await fs.access(impactPath);
    } catch {
      logger.warn('Impact scoring module not found, skipping');
      return 0;
    }
    
    // Import and run impact scoring
    const { calculateIndustryScores } = await import('../src/graph/impact.js');
    
    if (typeof calculateIndustryScores === 'function') {
      const scores = await calculateIndustryScores();
      logger.info('Impact scores calculated', { industries: scores?.length || 0 });
      return scores?.length || 0;
    } else {
      logger.info('Impact scoring available but not invoked (no function export)');
      return 0;
    }
  } catch (error) {
    logger.warn('Could not update impact scores', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return 0;
  }
}

/**
 * Clean old data files
 */
async function cleanOldData(logger: Logger, dataDir: string, maxAgeDays: number): Promise<number> {
  logger.info(`Cleaning data older than ${maxAgeDays} days...`);
  
  let cleaned = 0;
  const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;
  const now = Date.now();
  
  try {
    const files = await fs.readdir(dataDir);
    
    for (const file of files) {
      if (file === '.gitkeep' || file === 'index.json') continue;
      
      const filePath = path.join(dataDir, file);
      const stats = await fs.stat(filePath);
      
      if (now - stats.mtimeMs > maxAge) {
        await fs.unlink(filePath);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.info(`Cleaned ${cleaned} old files`);
    }
  } catch {
    // Directory might not exist
  }
  
  return cleaned;
}

/**
 * Main update function
 */
async function updateStats(): Promise<UpdateResult> {
  const logger = new Logger(CONFIG.logDir, CONFIG.logFile);
  const startTime = Date.now();
  
  const stats = {
    bfsDatasetsCollected: 0,
    documentsIngested: 0,
    impactScoresUpdated: 0,
    errors: [] as string[],
  };
  
  logger.info('=== Weekly Statistics Update Started ===');
  logger.info('Working directory', { cwd: process.cwd() });
  logger.info('Timestamp', { date: new Date().toISOString() });
  
  try {
    // Step 1: Collect BFS data
    logger.info('Step 1: Collecting BFS statistics...');
    const bfsResult = await collectBFSData({
      ingest: true,
      save: true,
    });
    
    stats.bfsDatasetsCollected = bfsResult.datasetsCollected;
    stats.documentsIngested = bfsResult.documentsIngested;
    
    logger.info('BFS collection completed', {
      datasets: bfsResult.datasetsCollected,
      documents: bfsResult.documentsIngested,
    });
    
    if (bfsResult.errors.length > 0) {
      for (const error of bfsResult.errors) {
        logger.warn('BFS error', { error });
        stats.errors.push(`BFS: ${error}`);
      }
    }
    
    // Step 2: Update impact scores
    logger.info('Step 2: Updating AI impact scores...');
    stats.impactScoresUpdated = await updateImpactScores(logger);
    
    // Step 3: Clean old news data (keep last 90 days)
    logger.info('Step 3: Cleaning old data...');
    const newsDir = path.join(process.cwd(), 'data', 'news');
    await cleanOldData(logger, newsDir, 90);
    
    // Step 4: Generate summary report
    logger.info('Step 4: Generating summary...');
    
    const summaryPath = path.join(process.cwd(), 'data', 'last-update.json');
    const summary = {
      lastUpdate: new Date().toISOString(),
      type: 'weekly-stats',
      stats,
    };
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');
    logger.info('Summary saved', { path: summaryPath });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.info(`=== Update completed in ${duration}s ===`);
    
    await logger.save();
    
    const logSummary = logger.getSummary();
    return {
      success: logSummary.errors === 0,
      message: `Stats update completed: ${stats.bfsDatasetsCollected} datasets, ${stats.documentsIngested} documents (${duration}s)`,
      stats,
    };
    
  } catch (error) {
    logger.error('Fatal error during update', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    stats.errors.push(error instanceof Error ? error.message : String(error));
    
    await logger.save();
    
    return {
      success: false,
      message: `Stats update failed: ${error instanceof Error ? error.message : String(error)}`,
      stats,
    };
  }
}

/**
 * Entry point
 */
async function main() {
  console.log('\n╔═════════════════════════════════════════════╗');
  console.log('║   Swiss AI Labor Market - Statistics Update ║');
  console.log('╚═════════════════════════════════════════════╝\n');
  
  const result = await updateStats();
  
  console.log('\n' + '─'.repeat(50));
  console.log(result.success ? '✓ SUCCESS' : '✗ FAILED');
  console.log(result.message);
  console.log('\nStatistics:');
  console.log(`  - BFS Datasets: ${result.stats.bfsDatasetsCollected}`);
  console.log(`  - Documents: ${result.stats.documentsIngested}`);
  console.log(`  - Impact Scores: ${result.stats.impactScoresUpdated}`);
  if (result.stats.errors.length > 0) {
    console.log(`  - Errors: ${result.stats.errors.length}`);
  }
  console.log('─'.repeat(50) + '\n');
  
  if (!result.success) {
    process.exit(1);
  }
}

main();

export { updateStats };
