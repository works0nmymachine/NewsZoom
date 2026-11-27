# Build log

## 2026-11-27: repo-basis en serverdraaiboek

- helpout en todoist-lite bekeken als voorbeeld voor server, GitHub en docs.
- Toegevoegd: `AGENTS.md`, `CLAUDE.md`, `.gitignore`, `.env.example`, [SETUP](SETUP.md), [SERVER_SETUP](SERVER_SETUP.md), [OWNER_SETUP](OWNER_SETUP.md), [DEPLOYMENT](DEPLOYMENT.md).
- Besluiten vastgelegd: domein, opslag op de gedeelde server, account via craftstudio-login, alleen `main`, handmatig deployen zonder workflow bij push.

### Status

Alleen documentatie. Geen code, database, workflow, serverwijziging of deployment. Het draaiboek is niet op de server getest; de serverwaarden komen uit de helpout-inventaris van 17 november 2026 en moeten opnieuw gemeten worden (SERVER_SETUP §0).

### Volgende stap

Eigenaar: server, Cloudflare en GitHub inrichten volgens OWNER_SETUP, en de inhoud voor de eerste proef kiezen. Claude: app-skelet met healthroute, Dockerfile en handmatige deployworkflow.
