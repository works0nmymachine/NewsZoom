# NewsZoom: serverinrichting (eenmalig, als root)

**Status: §0 uitgevoerd op 27 november 2026** (poort 8096 vrij, 1,4 GiB beschikbaar, 7,2 GB schijf vrij, geen bestaande rol of schema). Draaiboek volgens het helpout-patroon, met eigen NewsZoom-namen. Je hoeft geen andere repository te openen.

De commando's zijn voor een **Bash-rootconsole op de Linux-server**, niet voor je Mac. Voer ze per genummerde paragraaf uit en controleer de uitvoer. Stop bij fouten. **Tip:** de webconsole verminkt lange blokken; plak per blok.

De code voor de eerste release is er; §10 (backup) doe je na die release.

## Waarden

| Onderdeel | Waarde |
| --- | --- |
| Domein | **newszoom.craftstudio.work** (vastgesteld 27 november 2026) |
| Hostpoort app | 8096 (voorstel; was vrij op 17 november, opnieuw meten in §0) |
| Publiek IPv4 | 178.104.160.209 (uit de helpout-inventaris; controleren in §0) |
| App-root | /srv/newszoom |
| Compose-project | newszoom, plus extern netwerk supabase_default |
| Services | newszoom-app (Next.js, containerpoort 3000) en newszoom-ingest (feeds en koersen) |
| Databaserol | newszoom (LOGIN, geen superuser, geen BYPASSRLS) |
| Schema's | newszoom (tabellen) en newszoom_jobs (taakwachtrij) |
| Wrappers | /usr/local/sbin/newszoom-db en newszoom-stack |
| Servergeheimen | /srv/newszoom/app/.env.newszoom (600, deploy) |
| nginx-vhost | /etc/nginx/conf.d/newszoom.conf |
| Deploygebruiker | deploy (bestaat al) |
| Supabase-compose | /root/docker/webapps/infrastructure/supabase |

## Volgorde

1. §0 inventaris en waarden.
2. §1–3 mappen, wrappers, sudoers.
3. §4 databaserol en schema's; §5 geheimen en onderhoudspagina.
4. §6 SSH-key, daarna GitHub volgens [OWNER_SETUP](OWNER_SETUP.md).
5. §8.1–8.3 Cloudflare: DNS, SSL-modus, origin-certificaat.
6. §7 certificaat opslaan, nginx schrijven en testen.
7. §8.4–8.6 Cloudflare-instellingen; §9–11 controles en regressie.
8. §12 eerste release, daarna §10 backup en hersteltest.

## 0. Inventaris (alleen lezen)

~~~bash
ss -tulnp
docker ps --format '{{.Names}}\t{{.Ports}}'
free -h
df -h /
docker stats --no-stream --format '{{.Name}}\t{{.MemUsage}}'
nginx -T 2>/dev/null | grep -E 'server_name|listen'
ls -la /srv /etc/ssl/cloudflare
test -f /etc/nginx/conf.d/cloudflare-realip.inc && echo 'realip-include aanwezig'
id deploy
curl -4 -s https://ifconfig.me; echo
~~~

~~~bash
cd /root/docker/webapps/infrastructure/supabase
printf '%s\n' "select extname, extnamespace::regnamespace from pg_extension order by 1;" \
  "select 'rol bestaat al' from pg_roles where rolname = 'newszoom';" \
  "select 'schema bestaat al: ' || nspname from pg_namespace where nspname like 'newszoom%';" |
  docker compose exec -T db psql -U postgres -d postgres -qAt
cd ~
~~~

Noteer:

- **Geheugen.** Op 17 november was 1,5 GiB van 3,7 GiB beschikbaar, vóór helpout live ging. NewsZoom vraagt 384 MiB (app) plus 192 MiB (ingest). Is `available` in `free -h` onder ±900 MiB: eerst overleggen (bijvoorbeeld een grotere Hetzner-server), niet doorgaan.
- **Poort.** 8096 mag niet in `ss -tulnp` staan. Anders een andere vrije poort kiezen.
- **Extensies.** Ter informatie; de app heeft nu geen extensies nodig.
- **Rol/schema.** Geen regels met `bestaat al`. Wel: stoppen en beoordelen.

### 0.1 Waarden vastleggen

Pas de poort aan als 8096 bezet is.

~~~bash
install -d -m 700 /root/newszoom-setup
(umask 077; cat > /root/newszoom-setup/values.sh <<'EOF'
export NZ_DOMAIN=newszoom.craftstudio.work
export NZ_APP_PORT=8096
export NZ_SERVER_IP=178.104.160.209
EOF
)
source /root/newszoom-setup/values.sh
if ss -H -ltn "sport = :$NZ_APP_PORT" | grep -q .; then echo 'POORT BEZET'; else echo 'poort vrij'; fi
~~~

In iedere nieuwe Bash-sessie eerst: `source /root/newszoom-setup/values.sh`.

### 0.2 Nulmeting bestaande sites

Leest alle hostnamen uit nginx en noteert per site de HTTP-status. Na de inrichting vergelijk je hiermee (§11).

~~~bash
nginx -T 2>/dev/null |
  awk '$1 == "server_name" { for (i = 2; i <= NF; i++) { gsub(";", "", $i); print $i } }' |
  grep -vE '^_$|\*|^localhost$' | sort -u > /root/newszoom-setup/baseline-hosts.txt
while IFS= read -r h; do
  printf '%s %s\n' "$h" "$(curl --max-time 20 -s -o /dev/null -w '%{http_code}' "https://$h/")"
done < /root/newszoom-setup/baseline-hosts.txt > /root/newszoom-setup/baseline-before.txt
cat /root/newszoom-setup/baseline-before.txt
~~~

## 1. Mappen

~~~bash
test ! -e /srv/newszoom && echo 'vrij'
~~~

Alleen als dat `vrij` geeft:

~~~bash
install -d -o deploy -g deploy -m 711 /srv/newszoom
install -d -o deploy -g deploy -m 750 \
  /srv/newszoom/app /srv/newszoom/app/releases /srv/newszoom/deploy
install -d -o deploy -g deploy -m 755 /srv/newszoom/static
install -d -o deploy -g deploy -m 700 /srv/newszoom/backups
~~~

| Pad | Gebruik |
| --- | --- |
| app/releases/COMMIT | Buildcontext per commit |
| app/docker-compose.yml | Definitie van de containers (door de deploy geschreven) |
| app/.env | NZ_TAG en NZ_APP_PORT, geen geheimen |
| app/.env.newszoom | Servergeheimen, mode 600 |
| static/onderhoud.html | Foutpagina als de app niet draait |
| deploy | Deploylogs, lock en laatste geslaagde release |
| backups | Schemadumps vóór migraties |

## 2. Wrappers

~~~bash
cat > /usr/local/sbin/newszoom-db <<'EOF'
#!/bin/bash
set -euo pipefail
cd /root/docker/webapps/infrastructure/supabase
case "${1:-}" in
  psql)
    shift
    exec docker compose exec -T db psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres "$@"
    ;;
  dump)
    exec docker compose exec -T db pg_dump -U postgres -d postgres -Fc \
      --schema=newszoom --schema=newszoom_jobs
    ;;
  *)
    echo 'usage: newszoom-db psql [args] | dump' >&2
    exit 2
    ;;
esac
EOF
cat > /usr/local/sbin/newszoom-stack <<'EOF'
#!/bin/bash
set -euo pipefail
cd /srv/newszoom/app
export COMPOSE_PROJECT_NAME=newszoom
case "${1:-}" in
  build)   exec docker compose -f docker-compose.yml build ;;
  migrate) exec docker compose -f docker-compose.yml run --rm --no-deps app node scripts/migrate.mjs ;;
  up)      exec docker compose -f docker-compose.yml up -d --remove-orphans ;;
  ps)      exec docker compose -f docker-compose.yml ps ;;
  logs)    exec docker compose -f docker-compose.yml logs --tail=80 ;;
  *) echo 'usage: newszoom-stack build|migrate|up|ps|logs' >&2; exit 2 ;;
esac
EOF
chown root:root /usr/local/sbin/newszoom-db /usr/local/sbin/newszoom-stack
chmod 755 /usr/local/sbin/newszoom-db /usr/local/sbin/newszoom-stack
bash -n /usr/local/sbin/newszoom-db && bash -n /usr/local/sbin/newszoom-stack && echo 'syntax ok'
~~~

`newszoom-db psql` is alleen voor root. Migraties draaien als de beperkte rol via `newszoom-stack migrate`.

## 3. Sudoers

~~~bash
cat > /etc/sudoers.d/deploy-newszoom <<'EOF'
deploy ALL=(root) NOPASSWD: /usr/local/sbin/newszoom-db dump, /usr/local/sbin/newszoom-stack build, /usr/local/sbin/newszoom-stack migrate, /usr/local/sbin/newszoom-stack up, /usr/local/sbin/newszoom-stack ps, /usr/local/sbin/newszoom-stack logs
EOF
chown root:root /etc/sudoers.d/deploy-newszoom
chmod 440 /etc/sudoers.d/deploy-newszoom
visudo -cf /etc/sudoers.d/deploy-newszoom
~~~

Verwacht `parsed OK`.

## 4. Databaserol en schema's

### 4.1 Rol, schema's en DATABASE_URL in één stap

Maakt een sterk wachtwoord, schrijft `DATABASE_URL` in het geheimenbestand en geeft de database alleen een SCRAM-hash. Het wachtwoord verschijnt niet op het scherm. §1 moet gedaan zijn.

~~~bash
test -e /srv/newszoom/app/.env.newszoom ||
  install -m 600 -o deploy -g deploy /dev/null /srv/newszoom/app/.env.newszoom
NZ_SQL=$(mktemp /root/newszoom-setup/role.XXXXXX.sql)
python3 - "$NZ_SQL" <<'PY'
import base64, hashlib, hmac, os, secrets, sys
from pathlib import Path
env = Path("/srv/newszoom/app/.env.newszoom")
if any(l.startswith("DATABASE_URL=") for l in env.read_text().splitlines()):
    raise SystemExit("DATABASE_URL bestaat al; niets gewijzigd")
pw = secrets.token_hex(32)
salt = os.urandom(16)
it = 4096
salted = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt, it)
client_key = hmac.new(salted, b"Client Key", "sha256").digest()
stored = hashlib.sha256(client_key).digest()
server = hmac.new(salted, b"Server Key", "sha256").digest()
b = lambda x: base64.b64encode(x).decode()
verifier = f"SCRAM-SHA-256${it}:{b(salt)}${b(stored)}:{b(server)}"
sql = f"""
CREATE ROLE newszoom LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT
  NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 20 PASSWORD '{verifier}';
DO $$ BEGIN
  IF NOT (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) THEN
    EXECUTE format('GRANT newszoom TO %I WITH INHERIT FALSE, SET TRUE', current_user);
  END IF;
END $$;
CREATE SCHEMA newszoom AUTHORIZATION newszoom;
CREATE SCHEMA newszoom_jobs AUTHORIZATION newszoom;
ALTER ROLE newszoom SET search_path = newszoom, extensions;
ALTER ROLE newszoom SET statement_timeout = '30s';
ALTER ROLE newszoom SET idle_in_transaction_session_timeout = '60s';
"""
Path(sys.argv[1]).write_text(sql)
with env.open("a") as f:
    f.write(f"DATABASE_URL=postgresql://newszoom:{pw}@supabase-db:5432/postgres\n")
print("Rol-SQL klaar; DATABASE_URL opgeslagen, wachtwoord niet getoond")
PY
/usr/local/sbin/newszoom-db psql -q < "$NZ_SQL" && echo 'rol en schema aangemaakt'
shred -u "$NZ_SQL"; unset NZ_SQL
~~~

Mislukt de psql-stap, dan staat `DATABASE_URL` al in het bestand maar bestaat de rol niet. Verwijder dan alleen die regel uit `.env.newszoom` en draai het blok opnieuw.

### 4.2 Isolatie controleren

~~~bash
printf '%s\n' "select n.nspname || '.' || c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where c.relkind in ('r','v','m','p','f') and n.nspname not in ('pg_catalog','information_schema','newszoom','newszoom_jobs') and has_schema_privilege('newszoom', n.oid, 'USAGE') and has_table_privilege('newszoom', c.oid, 'SELECT,INSERT,UPDATE,DELETE') order by 1;" |
  /usr/local/sbin/newszoom-db psql -qAt
~~~

Verwacht geen tabellen van andere apps. Alleen `net._http_response` en `net.http_request_queue` (pg_net, Supabase-standaardrechten) zijn bekend en geaccepteerd, net als bij helpout.

Op deze server staan `pg_trgm` en `vector` in schema `public` (gemeten 27 november 2026). De app gebruikt ze nu niet. Komt dat later wel, dan is dat een apart besluit; `public` hoort niet standaard in het `search_path` van de rol.

### 4.3 Verbinding vanuit het Docker-netwerk testen

~~~bash
NZ_PGIMAGE=$(docker inspect --format '{{.Config.Image}}' supabase-db)
docker run --rm --network supabase_default \
  --env-file /srv/newszoom/app/.env.newszoom --entrypoint sh "$NZ_PGIMAGE" \
  -c 'psql "$DATABASE_URL" -qAtc "select current_user, current_schema"'
~~~

Verwacht `newszoom|newszoom`. Bij `no pg_hba.conf entry` of een authenticatiefout: stoppen, niets aan de gedeelde Supabase aanpassen zonder apart besluit.

### 4.4 Applicatieregels

- Migraties draaien als `newszoom` en maken alleen objecten in de eigen schema's. Geen `CREATE EXTENSION`, geen `public.`-objecten.
- Autorisatie gebeurt in de app: iedere query is gebonden aan de ingelogde gebruiker.

## 5. Geheimen en onderhoudspagina

### 5.1 Geheimen

`DATABASE_URL` staat er al. Voeg de rest toe met een editor, niet als shellcommando met waarden:

~~~bash
nano /srv/newszoom/app/.env.newszoom
~~~

| Variabele | Waarde | Wanneer |
| --- | --- | --- |
| DATABASE_URL | Door §4.1 gezet | Nu |
| APP_URL | https://newszoom.craftstudio.work | Nu |
| CRAFTSTUDIO_AUTH_URL | http://supabase-kong:8000 | Nu |
| CRAFTSTUDIO_AUTH_KEY | De publieke **anon key** van supabase.craftstudio.work (dezelfde als in de todo-app en helpout) | Nu |
| NZ_INGEST_MINUTEN e.a. | Optioneel, zie [DEPLOYMENT](DEPLOYMENT.md) | Niet nodig |
| Later | LLM-key | Pas na besluit over provider |

Geen aanhalingstekens rond waarden: Docker `env_file` neemt ze letterlijk over. Nooit de service-role key.

De anon key opzoeken (alleen in de rootconsole):

~~~bash
grep '^ANON_KEY=' /root/docker/webapps/infrastructure/supabase/.env
~~~

Controle zonder waarden te tonen:

~~~bash
stat -c '%a %U:%G %n' /srv/newszoom/app/.env.newszoom
cut -d= -f1 /srv/newszoom/app/.env.newszoom | sort | uniq -d
for k in DATABASE_URL APP_URL CRAFTSTUDIO_AUTH_URL CRAFTSTUDIO_AUTH_KEY; do
  grep -q "^$k=." /srv/newszoom/app/.env.newszoom && echo "$k: aanwezig" || echo "$k: ONTBREEKT"
done
~~~

Verwacht `600 deploy:deploy`, geen dubbele namen en alles aanwezig.

### 5.2 Onderhoudspagina

~~~bash
printf '%s\n' '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>NewsZoom</title><p>NewsZoom is even niet bereikbaar. Probeer het straks opnieuw.</p>' \
  > /srv/newszoom/static/onderhoud.html
chown deploy:deploy /srv/newszoom/static/onderhoud.html
chmod 644 /srv/newszoom/static/onderhoud.html
~~~

## 6. SSH-key voor GitHub

Een eigen key voor NewsZoom. Hergebruik niet de key van helpout.

~~~bash
source /root/newszoom-setup/values.sh
cp -a /home/deploy/.ssh/authorized_keys \
  "/root/newszoom-setup/authorized_keys.before.$(date +%Y%m%d%H%M%S)"
ssh-keygen -t ed25519 -N '' -C newszoom-deploy -f /root/newszoom-setup/deploy-key
printf '\nrestrict %s\n' "$(cat /root/newszoom-setup/deploy-key.pub)" \
  >> /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
printf '%s %s\n' "$NZ_SERVER_IP" "$(cut -d' ' -f1,2 /etc/ssh/ssh_host_ed25519_key.pub)" \
  > /root/newszoom-setup/known-hosts-line
ssh-keygen -lf /home/deploy/.ssh/authorized_keys
~~~

Zet nu de GitHub-secrets volgens [OWNER_SETUP](OWNER_SETUP.md). Ruim de private key pas op als `SERVER_SSH_KEY` in GitHub staat:

~~~bash
shred -u /root/newszoom-setup/deploy-key && rm /root/newszoom-setup/deploy-key.pub
~~~

## 7. nginx en certificaat

Eerst §8.1–8.3 doen en `source /root/newszoom-setup/values.sh`.

### 7.1 Origin-certificaat opslaan

~~~bash
install -d -m 755 /etc/ssl/cloudflare
test ! -e "/etc/ssl/cloudflare/$NZ_DOMAIN.pem" && test ! -e "/etc/ssl/cloudflare/$NZ_DOMAIN.key" && echo 'vrij'
~~~

Alleen bij `vrij`. Plak de inhoud uit Cloudflare in de editor:

~~~bash
install -m 644 /dev/null "/etc/ssl/cloudflare/$NZ_DOMAIN.pem"
install -m 600 /dev/null "/etc/ssl/cloudflare/$NZ_DOMAIN.key"
nano "/etc/ssl/cloudflare/$NZ_DOMAIN.pem"
nano "/etc/ssl/cloudflare/$NZ_DOMAIN.key"
openssl x509 -in "/etc/ssl/cloudflare/$NZ_DOMAIN.pem" -noout -subject -enddate -ext subjectAltName
test "$(openssl x509 -in "/etc/ssl/cloudflare/$NZ_DOMAIN.pem" -noout -pubkey | sha256sum)" = \
     "$(openssl pkey -in "/etc/ssl/cloudflare/$NZ_DOMAIN.key" -pubout | sha256sum)" \
  && echo 'Certificaat en key horen bij elkaar'
~~~

De SAN moet `newszoom.craftstudio.work` (of `*.craftstudio.work`) bevatten.

### 7.2 Headers

De gedeelde `/etc/nginx/conf.d/cloudflare-realip.inc` bestaat al (helpout); niet aanpassen.

~~~bash
cat > /etc/nginx/conf.d/newszoom-headers.inc <<'EOF'
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(self)" always;
add_header Strict-Transport-Security "max-age=31536000" always;
EOF
~~~

Geen Content-Security-Policy in nginx; die zet de app zelf met een nonce.

### 7.3 Vhost

~~~bash
cat > /root/newszoom-setup/nginx.template <<'EOF'
server {
    listen 80;
    server_name __DOMAIN__;
    access_log off;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name __DOMAIN__;
    ssl_certificate /etc/ssl/cloudflare/__DOMAIN__.pem;
    ssl_certificate_key /etc/ssl/cloudflare/__DOMAIN__.key;
    ssl_protocols TLSv1.2 TLSv1.3;

    include /etc/nginx/conf.d/cloudflare-realip.inc;

    access_log off;
    error_log /var/log/nginx/newszoom-error.log crit;
    client_max_body_size 1m;

    error_page 502 503 504 =503 /onderhoud.html;
    location = /onderhoud.html {
        root /srv/newszoom/static;
        internal;
        add_header Cache-Control "no-store" always;
        include /etc/nginx/conf.d/newszoom-headers.inc;
    }

    location / {
        proxy_pass http://127.0.0.1:__PORT__;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
        proxy_read_timeout 60s;
        include /etc/nginx/conf.d/newszoom-headers.inc;
    }
}
EOF
python3 - <<'PY'
import os
from pathlib import Path
t = Path("/root/newszoom-setup/nginx.template").read_text()
t = t.replace("__DOMAIN__", os.environ["NZ_DOMAIN"]).replace("__PORT__", os.environ["NZ_APP_PORT"])
target = Path("/etc/nginx/conf.d/newszoom.conf")
if target.exists():
    raise SystemExit("Vhost bestaat al: eerst vergelijken en back-uppen")
target.write_text(t)
print("Vhost geschreven")
PY
~~~

### 7.4 Activeren en testen

~~~bash
nginx -t && systemctl reload nginx
~~~

Bij een testfout niet reloaden; alleen de eigen configuratie herstellen.

Zolang de app niet draait, geeft nginx bewust 503 met de onderhoudspagina (een 502 vervangt Cloudflare door een eigen foutpagina).

~~~bash
curl --max-time 20 --resolve "$NZ_DOMAIN:443:127.0.0.1" -k -s -w ' %{http_code}\n' "https://$NZ_DOMAIN/" | grep -o 'niet bereikbaar.* [0-9]*$'
curl --max-time 20 -s -w ' %{http_code}\n' "https://$NZ_DOMAIN/" | grep -o 'niet bereikbaar.* [0-9]*$'
~~~

Verwacht tweemaal `niet bereikbaar` met `503`.

| Symptoom | Controle |
| --- | --- |
| 503 zonder onderhoudstekst | Rechten /srv/newszoom (711) en static (755) |
| `error code: 502` publiek | `=503` ontbreekt in `error_page` |
| 526 | Origin-certificaat, hostname of key |
| 522 | DNS, firewall of origin niet bereikbaar |

## 8. Cloudflare (in het Cloudflare-dashboard, zone craftstudio.work)

1. **DNS:** A-record `newszoom` → 178.104.160.209, **Proxied** (oranje wolk). Geen andere records aanpassen.
2. **SSL/TLS:** Full (strict). Staat dit al zonebreed zo voor helpout en de andere apps, dan hoeft er niets te veranderen.
3. **Origin-certificaat:** SSL/TLS → Origin Server → Create certificate, hostname `newszoom.craftstudio.work`. Kopieer certificaat en key naar §7.1 en houd het venster open tot de controle slaagt.
4. **Cache:** geen "Cache Everything"-regel voor deze hostname.
5. **Beveiliging:** geen interactieve challenge op `/api/`; een challenge breekt formulieren en de app.
6. **Rocket Loader** en andere HTML/JS-herschrijving uit; ze breken Next.js.

## 9. Controles als deploy

~~~bash
su - deploy -c 'test -w /srv/newszoom/app && echo dir-ok'
su - deploy -c 'sudo -n -l' | grep newszoom
~~~

Verwacht `dir-ok` en de regels uit §3.

## 10. Backups en hersteltest (na de eerste migratie)

~~~bash
sudo -u deploy bash <<'EOF'
set -euo pipefail
umask 077
f=$(mktemp /srv/newszoom/backups/newszoom.XXXXXX.dump)
sudo -n /usr/local/sbin/newszoom-db dump > "$f"
test -s "$f" && echo "Dump gemaakt: $f"
EOF
~~~

Herstel testen in een losse tijdelijke database, nooit in `postgres`:

~~~bash
cd /root/docker/webapps/infrastructure/supabase
docker compose exec -T db createdb -U postgres newszoom_hersteltest
docker compose exec -T db pg_restore -U postgres -d newszoom_hersteltest --no-owner --role=postgres \
  < "$(ls -t /srv/newszoom/backups/*.dump | head -1)"
docker compose exec -T db psql -U postgres -d newszoom_hersteltest -qAtc '\dt newszoom.*'
docker compose exec -T db dropdb -U postgres newszoom_hersteltest
cd ~
~~~

## 11. Regressiecontrole

Na nginx en na de eerste release:

~~~bash
while IFS= read -r h; do
  printf '%s %s\n' "$h" "$(curl --max-time 20 -s -o /dev/null -w '%{http_code}' "https://$h/")"
done < /root/newszoom-setup/baseline-hosts.txt > /root/newszoom-setup/baseline-after.txt
diff -u /root/newszoom-setup/baseline-before.txt /root/newszoom-setup/baseline-after.txt && echo 'geen verschil'
free -h
~~~

## 12. Eerste release

De code is er (Dockerfile, healthroute, compose, deployscript, workflow). Starten: GitHub → Actions → Deploy NewsZoom → Run workflow → main.

~~~bash
source /root/newszoom-setup/values.sh
curl --fail --max-time 20 "http://127.0.0.1:$NZ_APP_PORT/api/health"
curl --fail --max-time 20 "https://$NZ_DOMAIN/api/health"
sudo -n /usr/local/sbin/newszoom-stack ps
~~~

## 13. Terugdraaien en verwijderen

| Onderdeel | Herstel |
| --- | --- |
| App | Vorige `NZ_TAG` in `/srv/newszoom/app/.env`, `newszoom-stack up` |
| nginx | Alleen `newszoom.conf` en `newszoom-headers.inc` herstellen of verwijderen; `nginx -t` vóór reload |
| Database | Beoordeeld herstel uit een verse dump; nooit automatisch |
| Databasewachtwoord | Nieuwe SCRAM-hash met de §4.1-methode, `DATABASE_URL` vervangen, `newszoom-stack up` |

Volledig verwijderen (alleen bij expliciet besluit, eerst een dump): stack down, vhost en headers weg, `DROP SCHEMA newszoom, newszoom_jobs CASCADE`, `DROP ROLE newszoom`, `/srv/newszoom`, `/usr/local/sbin/newszoom-*` en `/etc/sudoers.d/deploy-newszoom` weg, DNS-record weg.

## 14. Uitvoering registreren

Noteer na echte uitvoering in [BUILD_LOG](BUILD_LOG.md): datum, stappen, afwijkingen en regressieresultaat. Geen secrets.
