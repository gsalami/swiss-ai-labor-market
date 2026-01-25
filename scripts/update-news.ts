#!/usr/bin/env tsx
/**
 * Daily News Update Script
 * Collects AI-related labor market news from Swiss sources
 * 
 * Usage:
 *   npm run collect:news
 *   npx tsx scripts/update-news.ts
 * 
 * Clawdbot cron: Daily at 07:00
 */

import { collectNews } from '../src/collectors/news.js';
import { promises as fs } from 'fs';
import path from 'path';

// Configuration
const CONFIG = {
  logDir: path.join(process.cwd(), 'logs'),
  logFile: 'news-update.log',
  maxLogSize: 1024 * 1024, // 1MB
  maxLogAge: 30, // days
};

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  details?: unknown;
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
    
    // Read existing log
    let existingLog = '';
    try {
      existingLog = await fs.readFile(this.logPath, 'utf-8');
    } catch {
      // File doesn't exist yet
    }

    // Append new entries
    const newEntries = this.entries
      .map(e => `[${e.timestamp}] [${e.level.toUpperCase()}] ${e.message}${e.details ? ' | ' + JSON.stringify(e.details) : ''}`)
      .join('\n');
    
    const fullLog = existingLog + (existingLog ? '\n' : '') + newEntries;
    
    // Trim if too large (keep last 75%)
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
 * Main update function
 */
async function updateNews(): Promise<{ success: boolean; message: string }> {
  const logger = new Logger(CONFIG.logDir, CONFIG.logFile);
  const startTime = Date.now();
  
  logger.info('=== Daily News Update Started ===');
  logger.info('Working directory', { cwd: process.cwd() });
  
  try {
    // Run news collection
    logger.info('Starting news collection...');
    const result = await collectNews({
      save: true,
    });
    
    logger.info('News collection completed', {
      articlesCollected: result.articlesCollected,
      articlesFiltered: result.articlesFiltered,
    });
    
    // Log any errors from collection
    if (result.errors.length > 0) {
      for (const error of result.errors) {
        logger.warn('Collection error', { error });
      }
    }
    
    // Check data directory for saved articles
    const dataDir = path.join(process.cwd(), 'data', 'news');
    try {
      const files = await fs.readdir(dataDir);
      const jsonFiles = files.filter(f => f.endsWith('.json') && f !== 'index.json');
      logger.info('Articles in database', { count: jsonFiles.length });
    } catch {
      logger.warn('Could not read data directory');
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.info(`=== Update completed in ${duration}s ===`);
    
    // Save log
    await logger.save();
    
    const summary = logger.getSummary();
    return {
      success: summary.errors === 0,
      message: `News update completed: ${result.articlesFiltered} articles collected (${duration}s)`,
    };
    
  } catch (error) {
    logger.error('Fatal error during update', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    await logger.save();
    
    return {
      success: false,
      message: `News update failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Add entry to update-log.json for the dashboard
 */
async function addToUpdateLog(result: { success: boolean; message: string; articlesFound?: number; articlesAdded?: number }) {
  const logPath = path.join(process.cwd(), 'data', 'update-log.json');
  
  try {
    let log: any[] = [];
    try {
      const existing = await fs.readFile(logPath, 'utf-8');
      log = JSON.parse(existing);
    } catch {
      // File doesn't exist or is invalid
    }
    
    const entry = {
      timestamp: new Date().toISOString(),
      type: 'news',
      status: result.success ? 'success' : 'error',
      title: 'Tägliches News Update',
      description: result.message,
      results: [],
      stats: {
        searched: 'Schweizer Quellen',
        found: String(result.articlesFound || 0),
        added: String(result.articlesAdded || 0)
      }
    };
    
    // Add to beginning of array
    log.unshift(entry);
    
    // Keep only last 100 entries
    if (log.length > 100) {
      log = log.slice(0, 100);
    }
    
    await fs.writeFile(logPath, JSON.stringify(log, null, 2), 'utf-8');
    console.log('✓ Added entry to update-log.json');
  } catch (error) {
    console.error('Could not update log:', error);
  }
}

/**
 * Entry point
 */
async function main() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   Swiss AI Labor Market - News Update  ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  const result = await updateNews();
  
  // Add to dashboard log
  await addToUpdateLog(result);
  
  console.log('\n' + '─'.repeat(50));
  console.log(result.success ? '✓ SUCCESS' : '✗ FAILED');
  console.log(result.message);
  console.log('─'.repeat(50) + '\n');
  
  if (!result.success) {
    process.exit(1);
  }
}

main();

export { updateNews };
