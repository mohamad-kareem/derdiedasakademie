#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Die DerDieDas Akademie — video server check-up
#
# Run this ON THE VIDEO SERVER when a class has had connection trouble:
#
#     sudo bash doctor.sh
#
# It answers the question the reconnect banner cannot: was it the server, the
# network, or one student's wifi. Nothing is changed — it only reports.
# ---------------------------------------------------------------------------
set -uo pipefail

ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }
bad()  { printf '  \033[31m✗\033[0m %s\n' "$1"; FAULTS=$((FAULTS+1)); }
warn() { printf '  \033[33m!\033[0m %s\n' "$1"; }
head_() { printf '\n\033[1m%s\033[0m\n' "$1"; }

FAULTS=0
cd "$(dirname "$0")" 2>/dev/null || true
[ -f .env ] && . ./.env

head_ "1. The machine"
printf '  up %s, load%s\n' "$(uptime -p | sed 's/^up //')" "$(cut -d' ' -f1-3 /proc/loadavg | sed 's/^/ /')"
free -m | awk '/^Mem:/ {printf "  memory: %s MB used of %s MB", $3, $2; if ($3/$2 > 0.9) printf "  <-- nearly full"; print ""}'
df -h / | awk 'NR==2 {printf "  disk: %s used of %s (%s)\n", $3, $2, $5}'
if [ "$(uptime -p | grep -c 'minute')" = 1 ] && [ "$(uptime -p | grep -c 'hour\|day')" = 0 ]; then
  warn "the machine rebooted within the hour — that alone would drop every class"
fi

head_ "2. The containers"
if ! command -v docker >/dev/null 2>&1; then
  bad "docker is not installed"
else
  for name in livekit caddy; do
    state=$(docker inspect -f '{{.State.Status}}' "$name" 2>/dev/null)
    if [ -z "$state" ]; then
      bad "$name is not running at all"
      continue
    fi
    restarts=$(docker inspect -f '{{.RestartCount}}' "$name" 2>/dev/null)
    since=$(docker inspect -f '{{.State.StartedAt}}' "$name" 2>/dev/null | cut -dT -f1,2 | cut -d. -f1 | tr T ' ')
    if [ "$state" != "running" ]; then
      bad "$name is $state"
    elif [ "${restarts:-0}" -gt 0 ]; then
      bad "$name has restarted $restarts time(s) — last start $since UTC"
      echo "      Every restart disconnects the whole class. Cause is usually memory."
    else
      ok "$name running since $since UTC, never restarted"
    fi
  done
fi

head_ "3. Errors in the last hour"
if command -v docker >/dev/null 2>&1; then
  errs=$(docker logs --since 1h livekit 2>&1 | grep -ciE '\b(error|panic|fatal)\b' || true)
  if [ "${errs:-0}" -gt 0 ]; then
    bad "$errs error lines from livekit — the last few:"
    docker logs --since 1h livekit 2>&1 | grep -iE '\b(error|panic|fatal)\b' | tail -5 | sed 's/^/      /'
  else
    ok "no errors logged by livekit"
  fi
  oom=$(dmesg 2>/dev/null | grep -ci 'out of memory\|oom-kill' || true)
  [ "${oom:-0}" -gt 0 ] && bad "the kernel killed a process for memory $oom time(s) — see: dmesg | grep -i oom"
fi

head_ "4. Ports on the machine"
listening() { ss -lntu 2>/dev/null | awk -v p=":$1" '$5 ~ p"$" {found=1} END {exit !found}'; }
for spec in "7880 tcp signalling" "7881 tcp media fallback" "3478 udp turn" "443 tcp https"; do
  set -- $spec
  if listening "$1"; then ok "$1/$2 — $3"; else bad "$1/$2 is not listening — $3"; fi
done
if ss -lnu 2>/dev/null | grep -qE ':(5[0-9]{4}|60000)\b'; then
  ok "media UDP ports are in use"
else
  warn "no media UDP port in use right now (normal when nobody is in a class)"
fi

head_ "5. The machine's own firewall"
if command -v iptables >/dev/null 2>&1; then
  for rule in "tcp 7880" "tcp 7881" "udp 3478"; do
    set -- $rule
    if iptables -C INPUT -p "$1" --dport "$2" -j ACCEPT 2>/dev/null; then ok "$2/$1 allowed"; else bad "$2/$1 is NOT allowed by iptables"; fi
  done
  if iptables -C INPUT -p udp --dport 50000:60000 -j ACCEPT 2>/dev/null; then
    ok "50000-60000/udp allowed (the media range)"
  else
    bad "50000-60000/udp is NOT allowed — video will fall back to TCP and stutter"
  fi
else
  warn "iptables not available; cannot check the local firewall"
fi

head_ "6. The address students connect to"
mine=$(curl -s -m 5 https://api.ipify.org || echo "?")
dns=$(getent hosts "${LK_DOMAIN:-}" 2>/dev/null | awk '{print $1; exit}')
printf '  domain     %s\n  points to  %s\n  really is  %s\n' "${LK_DOMAIN:-not set}" "${dns:-unresolved}" "$mine"
if [ -n "$dns" ] && [ "$dns" != "$mine" ]; then
  bad "the domain points somewhere else — students cannot reach this machine"
  echo "      The public IP changed (it does when the instance is stopped and started)."
  echo "      Update it at duckdns.org, then wait a minute."
elif [ -n "$dns" ]; then
  ok "the domain points at this machine"
fi

head_ "7. Answering from outside"
code=$(curl -s -m 8 -o /dev/null -w '%{http_code}' "https://${LK_DOMAIN:-localhost}/" || echo 000)
if [ "$code" = "200" ]; then ok "https answers (200)"; else bad "https answered $code — students would not get in"; fi

head_ "8. Is the server new enough for the browsers?"
# Browsers ask for the new signalling path first (/rtc/v1). An older server
# answers 404, the browser notices, and tries the old path — a wasted round
# trip on every single join AND on every reconnect. On a shaky phone
# connection that wasted trip is often the difference between a wobble that
# recovers quietly and the red banner.
if command -v docker >/dev/null 2>&1; then
  ver=$(docker exec livekit /livekit-server --version 2>/dev/null | head -1)
  [ -n "$ver" ] && printf '  running   %s\n' "$ver"
fi
v1=$(curl -s -m 8 -o /dev/null -w '%{http_code}' "http://127.0.0.1:7880/rtc/v1?access_token=probe" || echo 000)
if [ "$v1" = "404" ]; then
  bad "this server does not speak the new signalling path — every join costs an extra failed attempt"
  echo "      Fix it in one minute, from this folder:"
  echo "          sudo docker compose pull && sudo docker compose up -d"
  echo "      Do it between classes: it restarts the server, which disconnects anyone in a class."
else
  ok "the new signalling path is served (answered $v1)"
fi

printf '\n'
if [ "$FAULTS" -eq 0 ]; then
  printf '\033[32mNothing wrong on the server.\033[0m If a class still dropped, it was one\n'
  printf 'person'"'"'s own connection. The classroom now keeps a connection log —\n'
  printf 'open People during the class to see who is struggling.\n'
else
  printf '\033[31m%s problem(s) found above.\033[0m Fix those first.\n' "$FAULTS"
fi
printf '\nPorts that must ALSO be open in the Oracle firewall (Networking → Network\nSecurity Group): TCP 22, 80, 443, 7880, 7881 · UDP 3478, 50000-60000\n\n'
