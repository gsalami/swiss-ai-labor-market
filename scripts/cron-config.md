# Clawdbot Cron Integration

Diese Anleitung beschreibt, wie du die automatische Datenaktualisierung für Swiss AI Labor Market mit Clawdbot einrichtest.

## Übersicht

| Script | Häufigkeit | Empfohlene Zeit | Dauer |
|--------|------------|-----------------|-------|
| `update-news.ts` | Täglich | 07:00 | ~2 min |
| `update-stats.ts` | Wöchentlich | Sonntag 03:00 | ~5 min |

## Clawdbot Heartbeat Setup

### Option 1: Einfache Konfiguration

Füge in deinem `HEARTBEAT.md` folgende Tasks hinzu:

```markdown
## Daily Tasks
- [ ] 07:00 - Swiss Labor Market News Update
  - Run: `cd /path/to/swiss-ai-labor-market && npm run collect:news`
  - On error: Log to #alerts

## Weekly Tasks (Sunday)
- [ ] 03:00 - Swiss Labor Market Stats Update
  - Run: `cd /path/to/swiss-ai-labor-market && npm run collect:stats`
  - On error: Log to #alerts
```

### Option 2: Programmierte Tasks

Erstelle einen Agent-Task in `~/.clawdbot/tasks/swiss-labor-market.yaml`:

```yaml
name: swiss-labor-market-updates
description: Automated data collection for Swiss AI Labor Market

tasks:
  - id: daily-news
    schedule: "0 7 * * *"  # Daily at 07:00
    command: npm run collect:news
    workdir: /path/to/swiss-ai-labor-market
    timeout: 300  # 5 minutes
    on_failure:
      notify: true
      retry: 2
      retry_delay: 600  # 10 minutes

  - id: weekly-stats
    schedule: "0 3 * * 0"  # Sunday at 03:00
    command: npm run collect:stats
    workdir: /path/to/swiss-ai-labor-market
    timeout: 600  # 10 minutes
    on_failure:
      notify: true
      retry: 1
```

## Manuelle Ausführung

```bash
# News Update (täglich)
npm run collect:news

# Stats Update (wöchentlich)
npm run collect:stats

# Direkt mit tsx
npx tsx scripts/update-news.ts
npx tsx scripts/update-stats.ts
```

## Logs

Die Scripts speichern Logs in `/logs/`:

- `logs/news-update.log` - News Collection Log
- `logs/stats-update.log` - Statistics Update Log

### Log Format

```
[2025-01-26T07:00:00.000Z] [INFO] === Daily News Update Started ===
[2025-01-26T07:00:01.234Z] [INFO] Starting news collection...
[2025-01-26T07:00:15.567Z] [INFO] News collection completed | {"articlesCollected":45,"articlesFiltered":12}
[2025-01-26T07:00:16.000Z] [INFO] === Update completed in 16.0s ===
```

## Fehlerbehandlung

### Exit Codes

| Code | Bedeutung |
|------|-----------|
| 0 | Erfolgreich |
| 1 | Fehler aufgetreten |

### Benachrichtigungen

Bei Fehlern kannst du Clawdbot so konfigurieren, dass er dich benachrichtigt:

```yaml
# In tasks config
on_failure:
  notify:
    channel: "#swiss-labor-alerts"
    message: "Swiss Labor Market Update failed: {error}"
```

## Datenverzeichnisse

Die Scripts speichern Daten in:

```
data/
├── news/          # News Artikel (täglich)
│   ├── index.json
│   ├── news-*.json
│   └── news-*.md
├── bfs/           # BFS Statistiken (wöchentlich)
│   ├── bfs-employment-sectors.json
│   ├── bfs-unemployment-cantons.json
│   └── bfs-wages-sectors.json
└── last-update.json  # Letzte Update-Info
```

## Monitoring

### Status prüfen

```bash
# Letztes Update anzeigen
cat data/last-update.json

# News-Log der letzten Einträge
tail -50 logs/news-update.log

# Stats-Log der letzten Einträge
tail -50 logs/stats-update.log
```

### Dashboard Integration

Das Dashboard zeigt den Update-Status unter "System Status":

- Letztes News Update
- Letztes Stats Update
- Anzahl Dokumente
- Fehler (falls vorhanden)

## Troubleshooting

### Häufige Probleme

**1. RSS Feeds nicht erreichbar**
```
[WARN] Collection error | {"error":"NZZ: timeout"}
```
→ Netzwerkproblem oder Feed temporär down. Retry automatisch beim nächsten Run.

**2. opendata.swiss API Fehler**
```
[WARN] BFS error | {"error":"Request failed with status 503"}
```
→ API temporär überlastet. Script verwendet Fallback-Daten.

**3. Disk voll**
```
[ERROR] ENOSPC: no space left on device
```
→ Alte Daten löschen: `npm run clean:data` oder manuell `rm -rf data/news/*.json`

### Support

Bei Problemen:
1. Prüfe die Logs in `logs/`
2. Führe das Script manuell aus
3. Kontaktiere den Maintainer
