# Swiss AI Labor Market Intelligence 🇨🇭🤖

A self-learning knowledge base about the Swiss labor market and AI's impact on it. Built with [ruVector](https://github.com/ruvnet/ruvector) for semantic search and graph queries, exposed via MCP for Claude Desktop, Clawdbot, and other AI agents.

## Features

- **Automated Data Collection** - Aggregates data from BFS, SECO, job portals, and news sources
- **Self-Learning Vector DB** - ruVector's GNN improves search quality over time
- **Graph Relationships** - Cypher queries for industry ↔ jobs ↔ skills ↔ AI impact
- **MCP Server** - Use as a tool in Claude Desktop, Claude Code, or Clawdbot
- **Web Dashboard** - Browse and query the knowledge base

## Architecture

```
Data Sources → Ingestion Pipeline → ruVector DB → MCP Server → AI Agents
                                         ↓
                                   Web Dashboard
```

## Quick Start

```bash
# Install dependencies
npm install

# Start ruVector
npm run db:start

# Run data collection
npm run collect

# Start MCP server
npm run mcp:start

# Start web dashboard
npm run web:start
```

## MCP Integration

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "swiss-labor-market": {
      "command": "node",
      "args": ["/path/to/swiss-ai-labor-market/mcp-server.js"]
    }
  }
}
```

### Clawdbot

Add to your Clawdbot config:

```yaml
mcp:
  servers:
    - name: swiss-labor-market
      command: node /path/to/swiss-ai-labor-market/mcp-server.js
```

## Available MCP Tools

| Tool | Description |
|------|-------------|
| `search_labor_market` | Semantic search across all data |
| `get_ai_impact` | AI impact analysis by industry/role |
| `get_job_trends` | Job market trends over time |
| `get_skills_demand` | In-demand skills analysis |
| `get_industry_outlook` | Industry-specific forecasts |
| `compare_regions` | Compare labor markets across cantons |

## Data Sources

- **BFS** - Bundesamt für Statistik (official statistics)
- **SECO** - Staatssekretariat für Wirtschaft (economic data)
- **jobs.ch** - Job listings and trends
- **LinkedIn** - Swiss job market insights
- **News** - NZZ, Tages-Anzeiger, SRF (AI-related articles)
- **Research** - ETH, University of Zurich papers

## License

MIT

## Contributing

PRs welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.
