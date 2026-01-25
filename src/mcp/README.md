# Swiss AI Labor Market MCP Server

MCP (Model Context Protocol) Server für die Integration mit Claude Desktop und anderen MCP-kompatiblen Clients.

## Tools

### 1. `search_labor_market`
Suche in der Wissensdatenbank über den Schweizer Arbeitsmarkt.

**Parameter:**
- `query` (required): Suchanfrage in natürlicher Sprache (DE/EN)
- `filters` (optional): 
  - `industry`: Branchenfilter (z.B. "Finanzdienstleistungen", "IT")
  - `canton`: Kanton (z.B. "ZH", "Zürich")
  - `timeframe`: Zeitraum (z.B. "2024", "last_year")
  - `source_type`: "bfs" | "news" | "research" | "all"
- `limit` (optional): Max. Ergebnisse (default: 5, max: 20)

**Beispiel:**
```json
{
  "query": "AI Automatisierung Arbeitsplätze Schweiz",
  "filters": { "industry": "Finanzdienstleistungen" },
  "limit": 10
}
```

### 2. `get_ai_impact`
AI-Impact-Analyse für Branchen oder Berufsrollen.

**Parameter:**
- `target` (required): Branche oder Berufsrolle
- `target_type` (required): "industry" | "job_role"

**Beispiel:**
```json
{
  "target": "Software Developer",
  "target_type": "job_role"
}
```

**Rückgabe:**
- Impact Score (1-10)
- Reasoning
- Betroffene Faktoren (Automatisierungspotenzial, Adoption, Skills Gap)
- Empfehlungen

### 3. `get_job_trends`
Arbeitsmarkt-Trends und Zeitreihen.

**Parameter:**
- `metric` (required): "employment" | "unemployment" | "wages" | "job_postings" | "ai_adoption"
- `industry` (optional): Branchenfilter
- `canton` (optional): Kantonsfilter
- `timeframe` (optional): z.B. "2020-2024", "last_5_years"

**Beispiel:**
```json
{
  "metric": "ai_adoption",
  "industry": "Information und Kommunikation"
}
```

## Claude Desktop Integration

### Konfiguration

Füge folgendes zu deiner Claude Desktop Konfiguration hinzu:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "swiss-ai-labor-market": {
      "command": "npx",
      "args": ["tsx", "/Users/kuble/clawd/swiss-ai-labor-market/src/mcp/server.ts"]
    }
  }
}
```

Oder mit Node.js (nach Build):

```json
{
  "mcpServers": {
    "swiss-ai-labor-market": {
      "command": "node",
      "args": ["/Users/kuble/clawd/swiss-ai-labor-market/dist/mcp/server.js"]
    }
  }
}
```

### Starten

Der Server wird automatisch von Claude Desktop gestartet. Für manuelles Testen:

```bash
cd /Users/kuble/clawd/swiss-ai-labor-market
npm run mcp:start
```

## Beispiel-Interaktionen

Nach der Integration kannst du Claude fragen:

1. "Suche nach Informationen über AI-Auswirkungen auf den Schweizer Finanzsektor"
2. "Wie stark ist der AI-Impact auf Buchhalter in der Schweiz?"
3. "Zeige mir die Beschäftigungstrends in der IT-Branche der letzten 5 Jahre"
4. "Wie entwickelt sich die AI-Adoption in Schweizer Unternehmen?"

## Datenquellen

- Bundesamt für Statistik (BFS)
- Schweizer Medien (NZZ, SRF, etc.)
- Forschungsberichte und Studien
- Swiss AI Labor Market Knowledge Base

## Entwicklung

```bash
# Dependencies installieren
npm install

# Entwicklung mit Hot-Reload
npm run dev

# Build
npm run build

# MCP Server starten
npm run mcp:start
```
