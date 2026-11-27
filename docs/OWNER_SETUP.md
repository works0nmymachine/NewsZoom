# Owner setup

Wat de eigenaar zelf moet doen. Claude kan vanuit een cloudsessie niet via SSH bij de server en kan geen GitHub-secrets of -environments zetten. Pushen naar `main` kan wel.

## Checklist

- [ ] Server inrichten volgens [SERVER_SETUP](SERVER_SETUP.md) §0–§7 en §9–§11.
- [ ] Cloudflare volgens [SERVER_SETUP](SERVER_SETUP.md) §8: DNS-record, Full (strict), origin-certificaat.
- [ ] GitHub-environment `production` met secrets en variables (hieronder).
- [ ] Een craftstudio-account hebben (dezelfde login als de todo-app). Daarmee log je straks in op NewsZoom.
- [ ] Inhoud voor de eerste proef kiezen (hieronder).
- [ ] Later: provider en budget voor de LLM-duiding, en een bron voor koersdata.

## GitHub: environment `production`

De deployworkflow leest twee **secrets** en vier **variables**. Zet de variables echt als *Variables*, niet als secrets; anders faalt de controle in de workflow (dat ging bij helpout mis).

| Soort | Naam | Waarde | Waar vandaan |
| --- | --- | --- | --- |
| Secret | `SERVER_SSH_KEY` | Private key, inclusief de regels `-----BEGIN…` en `-----END…` | `/root/newszoom-setup/deploy-key` (SERVER_SETUP §6) |
| Secret | `SERVER_SSH_KNOWN_HOSTS` | Eén regel: IP, keytype, hostkey | `/root/newszoom-setup/known-hosts-line` (SERVER_SETUP §6) |
| Variable | `SERVER_IP` | `178.104.160.209` | SERVER_SETUP §0 |
| Variable | `SERVER_USERNAME` | `deploy` | vast |
| Variable | `NZ_DOMAIN` | `newszoom.craftstudio.work` | vast |
| Variable | `NZ_APP_PORT` | `8096` (of de poort uit SERVER_SETUP §0.1) | SERVER_SETUP §0.1 |

Database-, login- en API-geheimen staan **niet** in GitHub, alleen op de server in `.env.newszoom`. De build heeft geen geheimen nodig.

### Manier A: via de website

1. Ga naar https://github.com/works0nmymachine/NewsZoom/settings/environments → **New environment** → naam `production` → **Configure environment**.
2. Toon in de rootconsole van de server de twee secretwaarden en kopieer ze:

   ~~~bash
   cat /root/newszoom-setup/deploy-key
   cat /root/newszoom-setup/known-hosts-line
   ~~~

3. **Environment secrets** → **Add environment secret**: `SERVER_SSH_KEY` (het hele key-blok) en `SERVER_SSH_KNOWN_HOSTS` (de ene regel).
4. **Environment variables** → **Add environment variable**: de vier variables uit de tabel.

Let op: een webconsole kan lange blokken verminken bij kopiëren. Werkt de deploy later niet met een SSH-fout, gebruik dan manier B.

### Manier B: met de GitHub CLI op je Mac

Vereist `gh` (`brew install gh`, daarna `gh auth login`) en SSH-toegang als root tot de server. De private key gaat dan rechtstreeks van de server naar GitHub, zonder kopiëren.

~~~bash
gh api -X PUT repos/works0nmymachine/NewsZoom/environments/production
~~~

~~~bash
ssh root@178.104.160.209 cat /root/newszoom-setup/deploy-key | gh secret set SERVER_SSH_KEY --env production --repo works0nmymachine/NewsZoom
~~~

~~~bash
ssh root@178.104.160.209 cat /root/newszoom-setup/known-hosts-line | gh secret set SERVER_SSH_KNOWN_HOSTS --env production --repo works0nmymachine/NewsZoom
~~~

~~~bash
gh variable set SERVER_IP --env production --repo works0nmymachine/NewsZoom --body 178.104.160.209
gh variable set SERVER_USERNAME --env production --repo works0nmymachine/NewsZoom --body deploy
gh variable set NZ_DOMAIN --env production --repo works0nmymachine/NewsZoom --body newszoom.craftstudio.work
gh variable set NZ_APP_PORT --env production --repo works0nmymachine/NewsZoom --body 8096
~~~

Controle:

~~~bash
gh secret list --env production --repo works0nmymachine/NewsZoom
gh variable list --env production --repo works0nmymachine/NewsZoom
~~~

Verwacht twee secrets en vier variables. Ruim daarna de private key op de server op (SERVER_SETUP §6, laatste blok).

### Actions-minuten

- Er draait **geen** workflow bij een push. Alleen **Deploy NewsZoom** gebruikt minuten, en alleen als je hem zelf start.
- Bij een privé-repository heeft een gratis GitHub-account 2.000 minuten per maand. Een deploy kost naar schatting 5–10 minuten.
- Controleer onder https://github.com/settings/billing dat het uitgavenlimiet voor Actions op $0 staat; dan kan het nooit geld kosten.

### Later: Capacitor-app

Pas nodig als de webapp draait.

- **Android:** een eigen ondertekensleutel, als repository-secrets `ANDROID_KEYSTORE_BASE64` en `ANDROID_KEYSTORE_PASSWORD`. Bewaar de sleutel ook in je wachtwoordmanager: met een andere sleutel kun je de geïnstalleerde app niet bijwerken. Het maken van de sleutel gaat zoals in helpout `docs/ANDROID.md`, met alias `newszoom`.
- **iPhone (optioneel):** een Mac met Xcode en een Apple Developer-account ($99 per jaar).

## Inhoud voor de eerste proef

De [MVP](MVP.md) gebruikt geen echte nieuwsfeeds, maar een kleine, handgemaakte set berichten. Daarvoor zijn drie keuzes nodig:

1. **Lokaal gebied.** Welke plaats, wijk of streek wil je als voorbeeld zien bij Lokaal nieuws? Bijvoorbeeld je eigen woonplaats.
2. **Dossiers.** Welke 2 à 3 lopende nieuwsverhalen wil je als voorbeeld uitgewerkt zien, met Kort, Deze week, Afgelopen maanden en Vanaf het begin? Bijvoorbeeld een kabinetsformatie, een oorlog of een lokaal bouwproject.
3. **Echt of verzonnen.** Gebaseerd op echte gebeurtenissen (geloofwaardiger, maar Claude schrijft de samenvattingen en linkt naar echte bronnen) of volledig verzonnen (sneller, geen discussie over juistheid)? In beide gevallen staat er een label "voorbeelddata" bij.
