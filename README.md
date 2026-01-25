# Swiss AI Labor Market Intelligence 🇨🇭🤖

Eine selbstlernende Wissensdatenbank über den Schweizer Arbeitsmarkt und die Auswirkungen von KI. Gebaut mit [ruVector](https://github.com/ruvnet/ruvector) für semantische Suche und Graph-Abfragen, exponiert via MCP für Claude Desktop, Clawdbot und andere KI-Agenten.

## Features

- **Automatisierte Datensammlung** - Aggregiert Daten von BFS, SECO, und Schweizer News-Quellen
- **Selbstlernende Vector DB** - ruVector's GNN verbessert die Suchqualität über Zeit
- **Graph-Beziehungen** - Cypher-Abfragen für Industrie ↔ Jobs ↔ Skills ↔ KI-Impact
- **MCP Server** - Nutzbar als Tool in Claude Desktop, Claude Code oder Clawdbot
- **Web Dashboard** - Durchsuche und erkunde die Wissensdatenbank

## Architektur

```
Datenquellen → Ingestion Pipeline → ruVector DB → MCP Server → KI-Agenten
                                         ↓
                                   Web Dashboard
```

## Voraussetzungen

- Node.js 20+
- npm oder pnpm

## Installation

```bash
# Repository klonen
git clone https://github.com/kuble/swiss-ai-labor-market.git
cd swiss-ai-labor-market

# Dependencies installieren
npm install

# TypeScript kompilieren (optional)
npm run build
```

## Quick Start

### 1. Daten sammeln

```bash
# News sammeln (täglich empfohlen)
npm run collect:news

# BFS Statistiken sammeln (wöchentlich empfohlen)
npm run collect:stats
```

### 2. Dashboard starten

```bash
# API Server starten (Port 9001)
npm run dashboard

# Oder mit Hot-Reload für Development
npm run dashboard:dev
```

Das Dashboard ist dann erreichbar unter: http://localhost:9001

### 3. MCP Server starten

```bash
npm run mcp:start
```

## npm Scripts

| Script | Beschreibung |
|--------|-------------|
| `npm start` | Startet den API Server (Production) |
| `npm run build` | Kompiliert TypeScript |
| `npm run dashboard` | Startet das Dashboard + API |
| `npm run dashboard:dev` | Dashboard mit Hot-Reload |
| `npm run mcp:start` | Startet den MCP Server |
| `npm run collect:news` | Sammelt News-Artikel |
| `npm run collect:stats` | Sammelt BFS Statistiken |
| `npm run ingest` | Führt die Ingestion Pipeline aus |

## MCP Integration

### Claude Desktop

Füge zu `~/Library/Application Support/Claude/claude_desktop_config.json` hinzu:

```json
{
  "mcpServers": {
    "swiss-labor-market": {
      "command": "npx",
      "args": ["tsx", "/pfad/zu/swiss-ai-labor-market/src/mcp/server.ts"]
    }
  }
}
```

### Clawdbot

Füge zu deiner Clawdbot MCP-Konfiguration hinzu:

```yaml
mcp:
  servers:
    - name: swiss-labor-market
      command: npx tsx /pfad/zu/swiss-ai-labor-market/src/mcp/server.ts
```

## MCP Tools

| Tool | Beschreibung |
|------|-------------|
| `search_labor_market` | Semantische Suche über alle Daten |
| `get_ai_impact` | KI-Impact-Analyse nach Industrie/Rolle |
| `get_job_trends` | Arbeitsmarkt-Trends über Zeit |

### Beispiel-Abfragen

```
"Wie wirkt sich KI auf den Schweizer Finanzsektor aus?"
"Welche Berufe sind am stärksten von Automatisierung betroffen?"
"Zeige mir die Arbeitslosenquote nach Kantonen"
```

## API Endpoints

Der API Server läuft standardmässig auf Port 9001.

| Endpoint | Method | Beschreibung |
|----------|--------|-------------|
| `GET /api/search` | GET | Suche mit Query-Parameter `q` |
| `GET /api/industries` | GET | Liste aller Industrien mit KI-Impact-Scores |
| `GET /api/trends` | GET | Arbeitsmarkt-Trends |
| `GET /api/stats` | GET | Übersichts-Statistiken |
| `GET /api/health` | GET | Health Check |

### Beispiele

```bash
# Suche
curl "http://localhost:9001/api/search?q=fintech"

# Industrien
curl "http://localhost:9001/api/industries"

# Health Check
curl "http://localhost:9001/api/health"
```

## Automatische Updates

Das Projekt enthält Scripts für automatische Datenaktualisierung:

- **Täglich**: `scripts/update-news.ts` - Sammelt aktuelle News
- **Wöchentlich**: `scripts/update-stats.ts` - Aktualisiert BFS-Statistiken

Siehe [scripts/cron-config.md](scripts/cron-config.md) für Clawdbot Cron-Integration.

## Datenquellen

- **BFS** - Bundesamt für Statistik (offizielle Statistiken)
- **SECO** - Staatssekretariat für Wirtschaft (Wirtschaftsdaten)
- **News** - NZZ, Tages-Anzeiger, SRF, Handelszeitung (KI-relevante Artikel)
- **opendata.swiss** - Schweizer Open Data Portal

## Projektstruktur

```
swiss-ai-labor-market/
├── src/
│   ├── api/          # Express API Server
│   ├── collectors/   # Daten-Sammler
│   ├── db/           # ruVector Datenbank
│   ├── graph/        # Graph-Operationen
│   ├── mcp/          # MCP Server
│   └── pipeline/     # Ingestion Pipeline
├── scripts/          # Automation Scripts
├── dashboard/        # Web Dashboard (HTML/CSS/JS)
├── data/             # Gesammelte Daten
└── logs/             # Update Logs
```

## Development

```bash
# Mit Hot-Reload entwickeln
npm run dashboard:dev

# Nur News sammeln ohne zu speichern
npm run collect:news -- --no-save

# Tests (falls vorhanden)
npm test
```

## Troubleshooting

### Port bereits belegt
```bash
# Anderen Port verwenden
PORT=9002 npm run dashboard
```

### RSS Feeds nicht erreichbar
Einige Feeds können temporär nicht verfügbar sein. Das Script loggt Fehler und fährt mit den verfügbaren Quellen fort.

### ruVector Initialisierung
ruVector wird automatisch beim ersten Start initialisiert. Die Datenbank liegt in `data/`.

## License

MIT - siehe [LICENSE](LICENSE)

## Contributing

Beiträge sind willkommen! Siehe [CONTRIBUTING.md](CONTRIBUTING.md) für Guidelines.

---

Gebaut mit ❤️ für den Schweizer Arbeitsmarkt
