# Swiss AI Labor Market Intelligence 🇨🇭🤖

Eine selbstlernende Wissensbasis zum Schweizer Arbeitsmarkt und dem Einfluss von KI. Mit MCP-Server für Claude Desktop, Clawdbot und andere AI-Agenten.

## 🚀 Quick Start

```bash
# Repository klonen
git clone https://github.com/gsalami/swiss-ai-labor-market.git
cd swiss-ai-labor-market

# Dependencies installieren
npm install

# Environment konfigurieren
cp .env.example .env
# Dann OPENAI_API_KEY in .env eintragen

# Dashboard starten
npm run dashboard

# Öffne http://localhost:9001
```

## 📊 Features

- **Echte Quellen** – McKinsey, WEF, BFS, SECO, Stanford HAI, OECD mit verifizierten URLs
- **Semantic Search** – Vector-basierte Suche mit OpenAI Embeddings
- **AI Impact Scores** – Analyse welche Branchen/Jobs am stärksten betroffen sind
- **MCP Server** – Integration mit Claude Desktop und anderen AI-Agenten
- **Auto-Updates** – Tägliche News und wöchentliche Statistik-Updates

## 🔧 MCP Integration

### Claude Desktop

1. Öffne die Claude Desktop Config:
   ```
   ~/Library/Application Support/Claude/claude_desktop_config.json
   ```

2. Füge den Server hinzu:
   ```json
   {
     "mcpServers": {
       "swiss-labor-market": {
         "command": "npx",
         "args": ["tsx", "/DEIN/PFAD/swiss-ai-labor-market/src/mcp/server.ts"]
       }
     }
   }
   ```

3. Claude Desktop neu starten

4. Du siehst jetzt ein 🔧 Icon mit den verfügbaren Tools

### Verfügbare MCP Tools

| Tool | Beschreibung | Beispiel |
|------|--------------|----------|
| `search_labor_market` | Semantische Suche | "AI Impact Schweizer Banken" |
| `get_ai_impact` | Impact Score für Branche/Job | `{target: "Finanzdienstleistungen", target_type: "industry"}` |
| `get_job_trends` | Arbeitsmarkt-Trends | `{metric: "employment", timeframe: "1y"}` |

### Beispiel-Prompts für Claude

```
"Wie stark ist die Finanzbranche in der Schweiz von AI betroffen?"

"Welche Skills sind aktuell am gefragtesten im Schweizer Arbeitsmarkt?"

"Zeig mir die Arbeitsmarkt-Trends der letzten 12 Monate"

"Was sagt die McKinsey-Studie über Generative AI?"
```

## 🌐 Web Dashboard

Das Dashboard bietet:
- **Übersicht** – Key Metrics (Beschäftigung, Arbeitslosigkeit, AI-Adoption, Löhne)
- **Suche** – Volltextsuche mit Filtern
- **Branchen** – AI Impact Scores pro Branche
- **Trends** – Visualisierungen der Entwicklung
- **Quellen** – Alle verwendeten Studien mit Links

### Starten

```bash
npm run dashboard
# → http://localhost:9001
```

### Via Proxy (für externe Zugriffe)

Wenn du einen Proxy auf Port 9000 hast, füge diese Route hinzu:

```javascript
// In deinem proxy-server.js
if (url.startsWith('/swiss-ai-labor-market/api/')) {
  return swissLaborProxy(req, res);  // → localhost:9001
}
```

## 📁 Projektstruktur

```
swiss-ai-labor-market/
├── src/
│   ├── api/           # Express API Server
│   ├── collectors/    # Daten-Sammler (BFS, News, Research)
│   ├── db/            # ruVector Datenbank
│   ├── graph/         # Entity Extraction & Impact Scoring
│   ├── mcp/           # MCP Server & Tools
│   └── pipeline/      # Embedding & Ingestion Pipeline
├── data/
│   ├── bfs/           # BFS Statistiken
│   ├── news/          # News-Artikel
│   ├── research/      # Research Papers
│   └── ruvector/      # Vector Datenbank
├── dashboard/         # Web UI
├── scripts/           # Utility Scripts
└── logs/              # Log Files
```

## 🔄 Auto-Updates

### Manuell ausführen

```bash
# News aktualisieren
npx tsx scripts/update-news.ts

# Statistiken aktualisieren
npx tsx scripts/update-stats.ts
```

### Mit Cron (Clawdbot)

```yaml
# Täglich um 08:00 - News
- name: swiss-labor-news-daily
  schedule: "0 8 * * *"
  command: "cd /path/to/swiss-ai-labor-market && npx tsx scripts/update-news.ts"

# Montags um 09:00 - Statistiken
- name: swiss-labor-stats-weekly  
  schedule: "0 9 * * 1"
  command: "cd /path/to/swiss-ai-labor-market && npx tsx scripts/update-stats.ts"
```

## 📚 Datenquellen

| Quelle | Institution | URL |
|--------|-------------|-----|
| GenAI Economic Potential | McKinsey | [Link](https://www.mckinsey.com/capabilities/mckinsey-digital/our-insights/the-economic-potential-of-generative-ai-the-next-productivity-frontier) |
| Future of Jobs Report | WEF | [Link](https://www.weforum.org/publications/the-future-of-jobs-report-2023/) |
| Arbeitsmarktindikatoren | BFS | [Link](https://www.bfs.admin.ch/bfs/de/home/statistiken/arbeit-erwerb.html) |
| Konjunkturprognosen | SECO | [Link](https://www.seco.admin.ch/seco/de/home/wirtschaftslage---wirtschaftspolitik/Wirtschaftslage/konjunkturprognosen.html) |
| AI Index Report | Stanford HAI | [Link](https://aiindex.stanford.edu/report/) |
| Employment Outlook | OECD | [Link](https://www.oecd.org/employment/outlook/) |

## 🛠 API Endpoints

| Endpoint | Beschreibung |
|----------|--------------|
| `GET /api/stats` | Übersicht-Statistiken |
| `GET /api/industries` | Branchen mit AI Impact Scores |
| `GET /api/trends` | Trend-Daten für Charts |
| `GET /api/sources` | Alle Quellen mit URLs |
| `GET /api/search?q=...` | Semantische Suche |
| `GET /api/industry/:name` | Details zu einer Branche |

## 🤝 Contributing

PRs willkommen! Bitte:
1. Fork das Repository
2. Erstelle einen Feature Branch
3. Committe mit Conventional Commits
4. Erstelle einen Pull Request

## 📄 License

MIT – siehe [LICENSE](LICENSE)

---

**Built with** [ruVector](https://github.com/ruvnet/ruvector) • [MCP](https://modelcontextprotocol.io) • [Clawdbot](https://clawd.bot)
