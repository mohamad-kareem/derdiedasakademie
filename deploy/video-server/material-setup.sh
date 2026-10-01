#!/usr/bin/env bash
# Turns on course material (PDFs, audio, video) served from this machine.
# Run once, on the video server, from the video-server folder:
#
#     sudo bash ~/video-server/material-setup.sh
#
# The FIRST run restarts Caddy once (a few seconds), which drops anyone in a
# live class — run it outside class time. After that it is safe to run again
# whenever this folder is updated: it keeps the secret and the files, and
# reloads Caddy gracefully.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$DIR/.env"
ROOT=/srv/ddd-material
OWNER="${SUDO_USER:-ubuntu}"

if [[ $EUID -ne 0 ]]; then
  echo "Please run with sudo."
  exit 1
fi
if [[ ! -f "$ENV_FILE" ]]; then
  echo "No .env found in $DIR — run setup.sh first."
  exit 1
fi
if ! command -v python3 >/dev/null 2>&1; then
  DEBIAN_FRONTEND=noninteractive apt-get -qq update >/dev/null
  DEBIAN_FRONTEND=noninteractive apt-get -y -qq install python3 >/dev/null
fi

echo "==> 1/6  The material folder ($ROOT)"
install -d -m 0755 -o "$OWNER" -g "$OWNER" "$ROOT"
for level in A1 A2 B1 B2 C1; do
  install -d -m 0755 -o "$OWNER" -g "$OWNER" "$ROOT/$level"
done
# Docker may have created it as root before this script ever ran.
chown "$OWNER:$OWNER" "$ROOT" "$ROOT"/A1 "$ROOT"/A2 "$ROOT"/B1 "$ROOT"/B2 "$ROOT"/C1
echo "    You ($OWNER) can copy files straight in with scp — no sudo needed."

echo "==> 2/6  The shared secret (kept in $ENV_FILE)"
if ! grep -q '^MATERIAL_SECRET=' "$ENV_FILE"; then
  SECRET="$(head -c 64 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 48)"
  echo "MATERIAL_SECRET=$SECRET" >> "$ENV_FILE"
fi
chmod 600 "$ENV_FILE"
# shellcheck disable=SC1090
set -a; . "$ENV_FILE"; set +a

echo "==> 3/6  Installing the signature checker"
install -m 0755 "$DIR/ddd-material.py" /usr/local/bin/ddd-material.py
cat > /etc/systemd/system/ddd-material.service <<UNIT
[Unit]
Description=Course material for Die DerDieDas Akademie (signature checks and uploads)
After=network-online.target

[Service]
User=$OWNER
Group=$OWNER
EnvironmentFile=$ENV_FILE
Environment=MATERIAL_ROOT=$ROOT
Environment=MATERIAL_LISTEN=127.0.0.1:7890
ExecStart=/usr/bin/python3 /usr/local/bin/ddd-material.py
Restart=always
RestartSec=2
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=$ROOT
PrivateTmp=yes

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable ddd-material.service >/dev/null
systemctl restart ddd-material.service
sleep 1
if curl -fs -m 5 http://127.0.0.1:7890/m-api/health >/dev/null; then
  echo "    running"
else
  echo "    it did not start — see: sudo journalctl -u ddd-material -n 30"
  exit 1
fi

echo "==> 4/6  Pointing Caddy at the folder"
cd "$DIR"
# Recreates Caddy only if its settings changed (the first time: the new folder).
docker compose up -d >/dev/null

echo "==> 5/6  Loading the new Caddy routes"
# A graceful reload: connections in progress are kept.
sleep 2
docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile >/dev/null 2>&1 \
  || echo "    (reload skipped — Caddy was just recreated and already has them)"

echo "==> 6/6  Checking from outside"
sleep 2
code=$(curl -s -m 10 -o /dev/null -w '%{http_code}' "https://$LK_DOMAIN/m/A1/test.pdf" || echo 000)
if [ "$code" = "403" ]; then
  echo "    an unsigned address is refused (403) — as it should be"
else
  echo "    expected 403 for an unsigned address, got $code — check: sudo docker compose logs caddy"
fi
used=$(du -sh "$ROOT" 2>/dev/null | cut -f1)
free=$(df -h "$ROOT" | awk 'NR==2 {print $4}')
echo "    material: $used · free on this disk: $free"

echo
echo "------------------------------------------------------------------"
echo " Add these two to Vercel → Settings → Environment Variables"
echo " (and to .env.local on your computer), then redeploy:"
echo "------------------------------------------------------------------"
echo "MATERIAL_URL=https://$LK_DOMAIN"
echo "MATERIAL_SECRET=$MATERIAL_SECRET"
echo "------------------------------------------------------------------"
echo "Copy a level in from your computer (PowerShell, in the folder that holds A1):"
echo "  scp -i your-key.key -r .\\A1 $OWNER@<server-ip>:$ROOT/"
echo "A folder inside a level is a section; the file name is the title."
