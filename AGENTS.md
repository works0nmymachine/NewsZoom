# NewsZoom

Lees eerst [README](README.md), [Besluiten](docs/BESLUITEN.md) en [SETUP](docs/SETUP.md).

- Werk in het Nederlands.
- Maak zo min mogelijk productaannames. Onderscheid **vastgesteld**, **voorstel** en **open**.
- Git: alleen `main`. Commit en push direct naar `main`. Geen andere branches of pull requests, tenzij de gebruiker erom vraagt.
- Een push deployt niets en start geen workflow (Actions-minuten sparen). Productie gaat alleen live via de handmatige workflow **Deploy NewsZoom**, die zelf eerst de checks draait.
- De Hetzner-server wordt gedeeld met andere apps (helpout, todo, Stek, Supabase en meer). Wijzig geen andere apps en geen globale nginx-, Cloudflare- of Supabase-instellingen als bijeffect.
- Gebruik helpout als serverpatroon. Kopieer geen poorten, IDs, keys of secrets.
- Geheimen staan alleen op de server in `/srv/newszoom/app/.env.newszoom` of als GitHub-secret. Nooit in de repository, de chat of logs.
- Documenteer status eerlijk: een plan is geen werkende feature en een overgeslagen deploy is geen uitrol. Werk [BUILD_LOG](docs/BUILD_LOG.md) bij.
- Nieuwe gebruikersbesluiten gaan boven eerdere voorstellen. Houd de docs onderling consistent.
