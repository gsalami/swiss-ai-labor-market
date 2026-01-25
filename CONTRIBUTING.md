# Contributing to Swiss AI Labor Market Intelligence

Danke für dein Interesse an diesem Projekt! 🇨🇭

## Wie du beitragen kannst

### Bug Reports

1. Überprüfe, ob der Bug bereits gemeldet wurde
2. Erstelle ein [Issue](../../issues/new) mit:
   - Klarer Beschreibung des Problems
   - Schritte zur Reproduktion
   - Erwartetes vs. tatsächliches Verhalten
   - System-Infos (Node.js Version, OS)

### Feature Requests

1. Überprüfe bestehende Issues/Discussions
2. Beschreibe das Feature klar und den Use Case
3. Wenn möglich: Skizziere eine mögliche Implementierung

### Pull Requests

1. Fork das Repository
2. Erstelle einen Feature Branch: `git checkout -b feature/mein-feature`
3. Committe deine Änderungen: `git commit -m "feat: Beschreibung"`
4. Push zum Branch: `git push origin feature/mein-feature`
5. Öffne einen Pull Request

## Development Setup

```bash
# Repository klonen
git clone https://github.com/kuble/swiss-ai-labor-market.git
cd swiss-ai-labor-market

# Dependencies installieren
npm install

# TypeScript kompilieren
npm run build

# Development Server starten
npm run dashboard:dev
```

## Code Style

- **TypeScript** für alle Source-Dateien
- **ESLint** für Linting (falls konfiguriert)
- **Prettier** für Formatierung
- Funktions- und Variablennamen auf Englisch
- Kommentare auf Deutsch oder Englisch

### Commit Messages

Wir folgen [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: Neues Feature
fix: Bugfix
docs: Dokumentation
style: Formatierung (keine Code-Änderung)
refactor: Code-Refactoring
test: Tests hinzufügen/ändern
chore: Build, Dependencies, etc.
```

Beispiele:
```
feat: Add job trends API endpoint
fix: Correct date parsing in news collector
docs: Update MCP integration guide
```

## Projekt-Struktur

```
swiss-ai-labor-market/
├── src/
│   ├── api/          # Express API Server
│   ├── collectors/   # Daten-Sammler (BFS, News, Research)
│   ├── db/           # ruVector Datenbank
│   ├── graph/        # Graph-Operationen, Impact Scoring
│   ├── mcp/          # MCP Server
│   └── pipeline/     # Ingestion Pipeline
├── scripts/          # Automation Scripts
├── dashboard/        # Web Dashboard (HTML/JS)
├── data/             # Gesammelte Daten
└── logs/             # Update Logs
```

## Neue Datenquellen hinzufügen

1. Erstelle einen Collector in `src/collectors/`:

```typescript
// src/collectors/my-source.ts
export interface CollectorResult {
  success: boolean;
  documentsCollected: number;
  errors: string[];
}

export async function collectMySource(): Promise<CollectorResult> {
  // Implementation
}
```

2. Füge ihn zur Ingestion Pipeline hinzu
3. Aktualisiere die Dokumentation

## Tests

```bash
# Tests ausführen (wenn vorhanden)
npm test

# Manuell testen
npm run collect:news -- --no-save
npm run collect:stats -- --no-save
```

## Dokumentation

- README.md aktuell halten
- JSDoc für öffentliche Funktionen
- CHANGELOG.md bei Releases pflegen

## Code of Conduct

- Sei respektvoll und konstruktiv
- Keine Diskriminierung
- Fokus auf das Projekt und seine Ziele

## Fragen?

Erstelle ein Issue mit dem Label `question` oder kontaktiere den Maintainer.

---

Vielen Dank für deinen Beitrag! 🙏
