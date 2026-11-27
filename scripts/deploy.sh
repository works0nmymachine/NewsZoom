#!/usr/bin/env bash
# Draait als deploy op de server, vanuit een geëxporteerde releasemap. Gestart door de workflow Deploy NewsZoom.
set -Eeuo pipefail
umask 077
tag=${1:?commit vereist}
port=${2:?poort vereist}
domain=${3:?domein vereist}
[[ "$tag" =~ ^[0-9a-f]{40}$ ]]
[[ "$port" =~ ^[0-9]+$ ]] && (( port > 1024 && port < 65536 ))
[[ "$domain" == newszoom.craftstudio.work ]]
root=/srv/newszoom/app
release="$root/releases/$tag"
[[ "$(pwd -P)" == "$release" ]]
test -s "$root/.env.newszoom"
grep -q '^DATABASE_URL=.' "$root/.env.newszoom"
grep -qx "APP_URL=https://$domain" "$root/.env.newszoom"
test -x /usr/local/sbin/newszoom-stack && test -x /usr/local/sbin/newszoom-db
# Minstens 2 GiB vrij voor build en dump.
test "$(df -Pk "$root" | awk 'NR==2 {print $4}')" -gt 2097152
mkdir -p /srv/newszoom/deploy /srv/newszoom/backups
exec 9>/srv/newszoom/deploy/release.lock
flock -n 9
state=$(mktemp -d /srv/newszoom/deploy/rollback.XXXXXX)
had_env=false
had_compose=false
test ! -f "$root/.env" || { cp "$root/.env" "$state/env"; had_env=true; }
test ! -f "$root/docker-compose.yml" || { cp "$root/docker-compose.yml" "$state/compose"; had_compose=true; }
switched=false
rollback() {
  result=$?
  trap - EXIT
  if (( result != 0 )); then
    if $had_env; then cp "$state/env" "$root/.env"; else rm -f "$root/.env"; fi
    if $had_compose; then
      cp "$state/compose" "$root/docker-compose.yml"
      if $switched && $had_env; then
        sudo -n /usr/local/sbin/newszoom-stack up || echo 'TERUGDRAAIEN MISLUKT: server controleren' >&2
      fi
    else
      echo 'Eerste release mislukt; er is geen vorige app. Controleer de container.' >&2
    fi
    echo 'Deploy mislukt; de database wordt nooit automatisch teruggezet.' >&2
  fi
  exit "$result"
}
trap rollback EXIT
cp deploy/docker-compose.yml "$root/docker-compose.yml"
printf 'NZ_TAG=%s\nNZ_APP_PORT=%s\n' "$tag" "$port" > "$root/.env"
sudo -n /usr/local/sbin/newszoom-stack build
backup="/srv/newszoom/backups/pre-$tag-$(date -u +%Y%m%dT%H%M%SZ).dump"
sudo -n /usr/local/sbin/newszoom-db dump > "$backup"
test -s "$backup"
sudo -n /usr/local/sbin/newszoom-stack migrate
switched=true
sudo -n /usr/local/sbin/newszoom-stack up
check_health() {
  curl --fail --silent --max-time 8 "$1" |
    python3 -c 'import json,sys; d=json.load(sys.stdin); assert d.get("status")=="ok" and d.get("commit")==sys.argv[1]' "$tag"
}
ready=false
for attempt in {1..30}; do
  if check_health "http://127.0.0.1:$port/api/health"; then ready=true; break; fi
  sleep 2
done
$ready
check_health "https://$domain/api/health"
printf '%s\n' "$tag" > /srv/newszoom/deploy/last-successful
# Oude releasemappen opruimen; de huidige en de vorige drie blijven.
ls -1dt "$root"/releases/*/ | tail -n +5 | xargs -r rm -rf --
sudo -n /usr/local/sbin/newszoom-stack ps
echo "Uitgerold: $tag"
