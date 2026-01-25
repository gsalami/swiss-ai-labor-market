#!/usr/bin/env node
/**
 * Swiss AI Labor Market MCP Server
 * Provides tools for querying the Swiss labor market knowledge base
 * 
 * Story 4.1 - MCP Server Setup
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as db from '../db/ruvector.js';
import { searchLaborMarket, SearchFilters } from './tools/search.js';
import { getAIImpact, ImpactTargetType } from './tools/ai-impact.js';
import { getJobTrends, TrendMetric } from './tools/trends.js';

// Server info
const SERVER_NAME = 'swiss-ai-labor-market';
const SERVER_VERSION = '0.1.0';

// Tool definitions
const TOOLS = [
  {
    name: 'search_labor_market',
    description: `Search the Swiss labor market knowledge base for information about employment, AI impact, industries, and job trends. 
    
Use this tool to:
- Find information about specific industries or job roles
- Search for AI-related labor market news
- Look up employment statistics and research
- Get context about Swiss labor market developments`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Search query in natural language (German or English)',
        },
        filters: {
          type: 'object',
          description: 'Optional filters to narrow results',
          properties: {
            industry: {
              type: 'string',
              description: 'Filter by industry (e.g., "Finanzdienstleistungen", "IT")',
            },
            canton: {
              type: 'string',
              description: 'Filter by Swiss canton (e.g., "ZH", "Zürich")',
            },
            timeframe: {
              type: 'string',
              description: 'Filter by timeframe (e.g., "2024", "last_year")',
            },
            source_type: {
              type: 'string',
              enum: ['bfs', 'news', 'research', 'all'],
              description: 'Filter by source type',
            },
          },
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 5, max: 20)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_ai_impact',
    description: `Get AI impact analysis for a specific industry or job role in Switzerland.
    
Returns:
- Impact score (1-10) indicating how much AI affects this target
- Reasoning explaining the score
- Key factors: automation potential, adoption rate, skills gap
- Related entities and affected roles/skills`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        target: {
          type: 'string',
          description: 'Industry or job role to analyze (e.g., "Finanzdienstleistungen", "Software Developer")',
        },
        target_type: {
          type: 'string',
          enum: ['industry', 'job_role'],
          description: 'Type of target to analyze',
        },
      },
      required: ['target', 'target_type'],
    },
  },
  {
    name: 'get_job_trends',
    description: `Get job market trends and statistics for Switzerland.
    
Available metrics:
- employment: Total employment numbers
- unemployment: Unemployment rates
- wages: Wage/salary data
- job_postings: Job posting trends
- ai_adoption: AI adoption in workforce

Returns time series data with historical values and percent changes.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        metric: {
          type: 'string',
          enum: ['employment', 'unemployment', 'wages', 'job_postings', 'ai_adoption'],
          description: 'The metric to retrieve',
        },
        industry: {
          type: 'string',
          description: 'Optional: Filter by industry',
        },
        canton: {
          type: 'string',
          description: 'Optional: Filter by Swiss canton',
        },
        timeframe: {
          type: 'string',
          description: 'Optional: Timeframe like "2020-2024", "last_5_years"',
        },
      },
      required: ['metric'],
    },
  },
];

/**
 * Create and configure the MCP server
 */
function createServer(): Server {
  const server = new Server(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'search_labor_market': {
          const query = args?.query as string;
          const filters = args?.filters as SearchFilters | undefined;
          const limit = Math.min(args?.limit as number || 5, 20);

          const results = await searchLaborMarket(query, filters, limit);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(results, null, 2),
              },
            ],
          };
        }

        case 'get_ai_impact': {
          const target = args?.target as string;
          const targetType = args?.target_type as ImpactTargetType;

          const impact = await getAIImpact(target, targetType);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(impact, null, 2),
              },
            ],
          };
        }

        case 'get_job_trends': {
          const metric = args?.metric as TrendMetric;
          const industry = args?.industry as string | undefined;
          const canton = args?.canton as string | undefined;
          const timeframe = args?.timeframe as string | undefined;

          const trends = await getJobTrends(metric, industry, canton, timeframe);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(trends, null, 2),
              },
            ],
          };
        }

        default:
          return {
            content: [
              {
                type: 'text',
                text: `Unknown tool: ${name}`,
              },
            ],
            isError: true,
          };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[MCP] Tool error (${name}):`, errorMessage);
      
      return {
        content: [
          {
            type: 'text',
            text: `Error executing ${name}: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  console.error(`[MCP] Starting ${SERVER_NAME} v${SERVER_VERSION}...`);
  
  // Initialize database
  await db.init();
  console.error('[MCP] Database initialized');

  // Create and start server
  const server = createServer();
  const transport = new StdioServerTransport();
  
  await server.connect(transport);
  console.error('[MCP] Server connected via stdio');
  console.error('[MCP] Ready to handle requests');
}

// Run server
main().catch((error) => {
  console.error('[MCP] Fatal error:', error);
  process.exit(1);
});

export { createServer, SERVER_NAME, SERVER_VERSION };
