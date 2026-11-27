# Deployment

**Status: gebouwd, nog nooit uitgevoerd.** De workflow werkt pas als de server ([SERVER_SETUP](SERVER_SETUP.md)) en GitHub ([OWNER_SETUP](OWNER_SETUP.md)) zijn ingericht. Werkwijze en scripts volgen helpout.

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

## Bestanden

| Bestand | Rol |
| --- | --- |
| `.github/workflows/deploy.yml` | Handmatige workflow: checks, upload, deploy, controle van buitenaf |
| `scripts/deploy.sh` | Draait op de server als `deploy`: build, dump, migratie, start, health, terugdraaien bij fout |
| `deploy/docker-compose.yml` | App op `127.0.0.1:${NZ_APP_PORT}`, 384 MiB, netwerk `supabase_default` |
| `Dockerfile` | Next.js standalone, met `scripts/` en `db/migrations/` |
| `src/app/api/health/route.ts` | `{status, commit}` plus databasecheck |
| `scripts/migrate.mjs` | Past `db/migrations/*.sql` toe, bijgehouden in `nz_migraties` |

## Oude releases

`deploy.sh` bewaart de huidige en de drie vorige releasemappen. Docker-images ruimt hij niet op. Doe dat af en toe als root, alleen voor NewsZoom:

~~~bash
docker images newszoom-app --format '{{.Tag}} {{.CreatedSince}}'
~~~

~~~bash
docker rmi newszoom-app:OUDE_TAG
~~~

Houd de huidige (`/srv/newszoom/app/.env`) en de vorige tag.
