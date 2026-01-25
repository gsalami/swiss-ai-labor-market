/**
 * Dashboard API Server
 * Story 5.2 - Express server for the web dashboard
 * Port 9001 (proxied through 9000 at /swiss-ai-labor-market/)
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import * as db from '../db/ruvector.js';
import apiRouter from './routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 9001;

const app = express();

// Middleware
app.use(express.json());

// CORS for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// API routes
app.use('/api', apiRouter);

// Serve static dashboard files
const dashboardPath = path.resolve(__dirname, '../../dashboard');
app.use(express.static(dashboardPath));

// Fallback to index.html for SPA-like behavior
app.get('*', (req, res) => {
  res.sendFile(path.join(dashboardPath, 'index.html'));
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[API Error]', err.message);
  res.status(500).json({ error: err.message });
});

/**
 * Start the server
 */
async function start(): Promise<void> {
  // Initialize database
  await db.init();
  console.log('[API] Database initialized');

  app.listen(PORT, () => {
    console.log(`[API] Swiss AI Labor Market Dashboard running on http://localhost:${PORT}`);
    console.log(`[API] Access via proxy: http://localhost:9000/swiss-ai-labor-market/`);
  });
}

start().catch((error) => {
  console.error('[API] Failed to start:', error);
  process.exit(1);
});

export default app;
