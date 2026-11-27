# Deployment

**Status: nog niet gebouwd.** Dit is het contract voor de code die nog moet komen. Werkwijze en scripts volgen helpout.

## Beleid (vastgesteld 27 november 2026)

- Alleen branch `main`. Wijzigingen worden direct op `main` gecommit en gepusht.
- Een push start **geen** workflow, ook geen checks. Dat spaart Actions-minuten.
- Productie gaat alleen live als de eigenaar zelf **Deploy NewsZoom** start (GitHub → Actions → Deploy NewsZoom → Run workflow → main). Die rolt alle commits sinds de vorige release in één keer uit.

## Wat de workflow doet

1. Checks: `npm ci`, lint, typecheck, tests, `next build`. Faalt er iets, dan verandert er niets op de server.
2. Configuratie controleren: secrets en variables aanwezig, SSH met vaste hostkey.
3. Precies deze commit uploaden naar `/srv/newszoom/app/releases/COMMIT`.
4. Op de server via `scripts/deploy.sh`: image bouwen, schemadump maken, migreren als rol `newszoom`, `NZ_TAG` omzetten, containers starten.
5. `/api/health` lokaal en publiek controleren op de juiste commit. Pas dan wordt `/srv/newszoom/deploy/last-successful` bijgewerkt.
6. Bij een fout: vorige tag en compose terugzetten en opnieuw starten. De database wordt nooit automatisch teruggezet.

## Nog te bouwen

- `Dockerfile` (Next.js standalone, met `scripts/` en `db/migrations/`).
- `/api/health` met commit en databasecheck.
- `deploy/docker-compose.yml` (app op `127.0.0.1:${NZ_APP_PORT}`, geheugenlimiet, netwerk `supabase_default`).
- `scripts/deploy.sh` en `.github/workflows/deploy.yml` (alleen `workflow_dispatch`).
- CSP met nonce in de app.
