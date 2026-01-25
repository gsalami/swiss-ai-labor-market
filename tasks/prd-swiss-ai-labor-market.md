# PRD: Swiss AI Labor Market Intelligence

## Overview

Build a self-learning knowledge base about the Swiss labor market with focus on AI's impact. Uses ruVector for vector storage with GNN learning, exposes data via MCP for AI agents, and provides a web dashboard for exploration.

## Goals

1. Aggregate Swiss labor market data from multiple sources
2. Enable semantic search and graph queries
3. Provide ground truth for AI agents via MCP
4. Track how AI is impacting different industries and jobs
5. Auto-update with new data regularly

---

## Phase 1: Foundation

### Story 1.1: Project Setup
**As a** developer  
**I want** a properly structured Node.js project  
**So that** I can build the system incrementally

**Acceptance Criteria:**
- [ ] package.json with proper dependencies (ruvector, @modelcontextprotocol/sdk, etc.)
- [ ] TypeScript configuration
- [ ] ESLint + Prettier setup
- [ ] Basic folder structure (src/, data/, scripts/)
- [ ] Environment variables setup (.env.example)

### Story 1.2: ruVector Integration
**As a** developer  
**I want** ruVector installed and configured  
**So that** I can store and query embeddings

**Acceptance Criteria:**
- [ ] ruVector installed and running
- [ ] Basic CRUD operations working
- [ ] Cypher queries working
- [ ] Test with sample data (10 documents)
- [ ] Script to start/stop ruVector

### Story 1.3: Embedding Pipeline
**As a** developer  
**I want** a pipeline to embed documents  
**So that** I can add data to the vector DB

**Acceptance Criteria:**
- [ ] Function to chunk documents
- [ ] Function to generate embeddings (local ONNX or OpenAI)
- [ ] Function to store embeddings with metadata
- [ ] Support for different document types (text, markdown, JSON)
- [ ] Batch processing for efficiency

---

## Phase 2: Data Collection

### Story 2.1: BFS Data Collector
**As a** system  
**I want** to collect data from Bundesamt für Statistik  
**So that** I have official Swiss labor statistics

**Acceptance Criteria:**
- [ ] Fetch employment statistics by industry
- [ ] Fetch unemployment rates by canton
- [ ] Fetch salary data by profession
- [ ] Store raw data in data/bfs/
- [ ] Transform to standard format
- [ ] Embed and store in ruVector

**Data Points:**
- Employment by sector (NOGA classification)
- Unemployment by region
- Wage statistics
- Working hours trends

### Story 2.2: SECO Data Collector
**As a** system  
**I want** to collect data from SECO  
**So that** I have economic labor market data

**Acceptance Criteria:**
- [ ] Fetch job vacancy statistics
- [ ] Fetch labor market indicators
- [ ] Parse and transform data
- [ ] Embed and store in ruVector

### Story 2.3: News Collector
**As a** system  
**I want** to collect AI-related labor market news  
**So that** I have current developments

**Acceptance Criteria:**
- [ ] RSS/Atom feed parser for Swiss news sources
- [ ] Filter for AI + labor market keywords
- [ ] Extract article content
- [ ] Embed and store with metadata (date, source, topic)
- [ ] Sources: NZZ, Tages-Anzeiger, SRF, Handelszeitung

### Story 2.4: Research Paper Collector
**As a** system  
**I want** to collect academic research  
**So that** I have expert analysis

**Acceptance Criteria:**
- [ ] Search for Swiss AI labor market papers
- [ ] Download PDFs or abstracts
- [ ] Extract key findings
- [ ] Embed and store in ruVector
- [ ] Sources: ETH, Uni Zürich, ZHAW research repositories

### Story 2.5: Job Market Collector
**As a** system  
**I want** to collect job posting data  
**So that** I have real-time market signals

**Acceptance Criteria:**
- [ ] Scrape or API access to jobs.ch trends
- [ ] Track which jobs mention AI/ML skills
- [ ] Track job counts by industry
- [ ] Weekly snapshots for trend analysis
- [ ] Respect robots.txt and rate limits

---

## Phase 3: Knowledge Graph

### Story 3.1: Entity Extraction
**As a** system  
**I want** to extract entities from documents  
**So that** I can build relationships

**Acceptance Criteria:**
- [ ] Extract industries (banking, pharma, manufacturing, etc.)
- [ ] Extract job roles (software engineer, analyst, etc.)
- [ ] Extract skills (Python, ML, data analysis, etc.)
- [ ] Extract locations (Zürich, Basel, Geneva, etc.)
- [ ] Extract AI technologies (LLMs, automation, robotics)

### Story 3.2: Relationship Building
**As a** system  
**I want** to create graph relationships  
**So that** I can query connections

**Acceptance Criteria:**
- [ ] Industry → affected by → AI Technology
- [ ] Job Role → requires → Skill
- [ ] Job Role → located in → Canton
- [ ] Industry → employs → Job Role
- [ ] AI Technology → impacts → Job Role
- [ ] Store relationships in ruVector graph

### Story 3.3: Impact Scoring
**As a** system  
**I want** to calculate AI impact scores  
**So that** users can understand risk levels

**Acceptance Criteria:**
- [ ] Algorithm to score AI impact per job role
- [ ] Factors: automation potential, AI mentions in news, job trend
- [ ] Scale: 1-10 (1 = low impact, 10 = high disruption)
- [ ] Update scores as new data comes in
- [ ] Store scores in graph

---

## Phase 4: MCP Server

### Story 4.1: MCP Server Setup
**As a** developer  
**I want** a basic MCP server  
**So that** AI agents can connect

**Acceptance Criteria:**
- [ ] MCP server using @modelcontextprotocol/sdk
- [ ] Proper server manifest with capabilities
- [ ] Health check endpoint
- [ ] Logging for debugging
- [ ] Start script in package.json

### Story 4.2: Search Tool
**As an** AI agent  
**I want** to search the labor market data  
**So that** I can answer user questions

**Tool: `search_labor_market`**
```typescript
{
  query: string,          // Natural language query
  filters?: {
    industry?: string,
    canton?: string,
    timeframe?: string,   // "last_month", "last_year", etc.
    source_type?: string  // "statistics", "news", "research"
  },
  limit?: number
}
```

**Acceptance Criteria:**
- [ ] Semantic search across all documents
- [ ] Filter support
- [ ] Returns relevant snippets with sources
- [ ] Includes confidence score

### Story 4.3: AI Impact Tool
**As an** AI agent  
**I want** to query AI impact data  
**So that** I can advise on career risks

**Tool: `get_ai_impact`**
```typescript
{
  target: string,         // Industry or job role
  target_type: "industry" | "job_role",
  include_trends?: boolean
}
```

**Acceptance Criteria:**
- [ ] Returns impact score (1-10)
- [ ] Explains reasoning
- [ ] Lists affected job roles (for industry)
- [ ] Lists required adaptation skills
- [ ] Includes news/research citations

### Story 4.4: Trends Tool
**As an** AI agent  
**I want** to query job market trends  
**So that** I can show changes over time

**Tool: `get_job_trends`**
```typescript
{
  metric: "employment" | "vacancies" | "salaries" | "ai_jobs",
  industry?: string,
  canton?: string,
  timeframe: "1m" | "3m" | "6m" | "1y" | "5y"
}
```

**Acceptance Criteria:**
- [ ] Returns time series data
- [ ] Includes percent change
- [ ] Comparison to national average
- [ ] Data visualization friendly format

### Story 4.5: Skills Tool
**As an** AI agent  
**I want** to query in-demand skills  
**So that** I can advise on upskilling

**Tool: `get_skills_demand`**
```typescript
{
  category?: "technical" | "soft" | "ai_specific",
  industry?: string,
  trending?: boolean
}
```

**Acceptance Criteria:**
- [ ] Returns ranked list of skills
- [ ] Includes demand growth percentage
- [ ] Links to relevant job roles
- [ ] Suggests learning resources

### Story 4.6: Comparison Tool
**As an** AI agent  
**I want** to compare regions or industries  
**So that** I can provide context

**Tool: `compare_labor_markets`**
```typescript
{
  compare_type: "cantons" | "industries",
  items: string[],        // e.g., ["Zürich", "Basel"] or ["Banking", "Pharma"]
  metrics: string[]       // e.g., ["employment", "ai_impact", "salaries"]
}
```

**Acceptance Criteria:**
- [ ] Side-by-side comparison
- [ ] Highlights key differences
- [ ] Includes context/explanation

---

## Phase 5: Web Dashboard

### Story 5.1: Dashboard Setup
**As a** user  
**I want** a web interface  
**So that** I can explore the data visually

**Acceptance Criteria:**
- [ ] Simple HTML/CSS/JS dashboard (no framework needed)
- [ ] Served via the existing proxy server on port 9000
- [ ] Located at /swiss-ai-labor-market/
- [ ] Responsive design
- [ ] Dark theme (consistent with Kuble's Apps)

### Story 5.2: Search Interface
**As a** user  
**I want** to search the knowledge base  
**So that** I can find specific information

**Acceptance Criteria:**
- [ ] Search box with auto-suggestions
- [ ] Filter panel (industry, canton, date range)
- [ ] Results with snippets and sources
- [ ] Click to expand full document

### Story 5.3: AI Impact Explorer
**As a** user  
**I want** to explore AI impact by industry  
**So that** I can understand the landscape

**Acceptance Criteria:**
- [ ] Industry cards with impact scores
- [ ] Drill down to job roles
- [ ] Visual indicators (color coding for risk)
- [ ] Trend charts

### Story 5.4: Statistics Dashboard
**As a** user  
**I want** to see key statistics  
**So that** I get a quick overview

**Acceptance Criteria:**
- [ ] Key metrics cards (employment rate, AI job growth, etc.)
- [ ] Charts for trends
- [ ] Canton comparison map (optional)
- [ ] Last updated timestamp

---

## Phase 6: Automation & Polish

### Story 6.1: Auto-Update Pipeline
**As a** system  
**I want** to automatically update data  
**So that** the knowledge base stays current

**Acceptance Criteria:**
- [ ] Cron job for daily news collection
- [ ] Cron job for weekly statistics update
- [ ] Cron job for monthly research scan
- [ ] Logging and error notifications
- [ ] Integration with Clawdbot cron

### Story 6.2: Data Quality Checks
**As a** system  
**I want** to validate incoming data  
**So that** the knowledge base is reliable

**Acceptance Criteria:**
- [ ] Duplicate detection
- [ ] Source verification
- [ ] Freshness tracking
- [ ] Quality score per document

### Story 6.3: Documentation
**As a** developer  
**I want** comprehensive documentation  
**So that** others can contribute

**Acceptance Criteria:**
- [ ] API documentation for MCP tools
- [ ] Data source documentation
- [ ] Setup guide
- [ ] Contributing guidelines
- [ ] Architecture diagram

### Story 6.4: GitHub Release
**As a** project maintainer  
**I want** the project on GitHub  
**So that** it's open source

**Acceptance Criteria:**
- [ ] Clean git history
- [ ] MIT License
- [ ] GitHub Actions for CI (optional)
- [ ] Release tags
- [ ] Published to npm (optional)

---

## Technical Constraints

- **Runtime:** Node.js 20+
- **Database:** ruVector
- **MCP:** @modelcontextprotocol/sdk
- **Embeddings:** Local ONNX (preferred) or OpenAI API
- **Language:** TypeScript
- **No heavy frameworks:** Keep it simple (vanilla JS for dashboard)

## Success Metrics

- [ ] 1000+ documents in knowledge base
- [ ] <100ms query latency
- [ ] MCP tools working in Claude Desktop
- [ ] Daily auto-updates running
- [ ] 5+ industries with impact scores

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Foundation | 1 day | None |
| Phase 2: Data Collection | 2 days | Phase 1 |
| Phase 3: Knowledge Graph | 1 day | Phase 2 |
| Phase 4: MCP Server | 1 day | Phase 1 |
| Phase 5: Web Dashboard | 1 day | Phase 2 |
| Phase 6: Automation | 1 day | All |

**Total: ~7 days** (with Ralph parallelizing where possible)
