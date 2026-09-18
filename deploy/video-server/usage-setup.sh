#!/usr/bin/env bash
# Turns on traffic measuring for the admin Usage page.
# Run once, on the video server:   sudo bash ~/video-server/usage-setup.sh
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$DIR/.env"

if [[ $EUID -ne 0 ]]; then
  echo "Please run with sudo."
  exit 1
fi
if [[ ! -f "$ENV_FILE" ]]; then
  echo "No .env found in $DIR — run setup.sh first."
  exit 1
fi

echo "==> 1/5  Installing the traffic counter"
if ! command -v vnstat >/dev/null 2>&1; then
  DEBIAN_FRONTEND=noninteractive apt-get -qq update >/dev/null
  DEBIAN_FRONTEND=noninteractive apt-get -y -qq install vnstat >/dev/null
fi
systemctl enable --now vnstat >/dev/null 2>&1 || true

echo "==> 2/5  Installing the report writer"
install -m 0755 "$DIR/ddd-usage.py" /usr/local/bin/ddd-usage.py
install -d -m 0755 /srv/ddd-usage

cat > /etc/systemd/system/ddd-usage.service <<'UNIT'
[Unit]
Description=Write the classroom traffic report
After=vnstat.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/ddd-usage.py
UNIT

cat > /etc/systemd/system/ddd-usage.timer <<'UNIT'
[Unit]
Description=Refresh the classroom traffic report every 5 minutes

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min
Persistent=true

[Install]
WantedBy=timers.target
UNIT

systemctl daemon-reload
systemctl enable --now ddd-usage.timer >/dev/null

echo "==> 3/5  Creating the read token"
if ! grep -q '^LK_USAGE_TOKEN=' "$ENV_FILE"; then
  TOKEN="$(head -c 48 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 40)"
  echo "LK_USAGE_TOKEN=$TOKEN" >> "$ENV_FILE"
fi
# shellcheck disable=SC1090
set -a; . "$ENV_FILE"; set +a

echo "==> 4/5  Restarting the web front door with the report route"
cd "$DIR"
docker compose up -d >/dev/null

echo "==> 5/5  Writing the first report"
/usr/local/bin/ddd-usage.py || echo "    (vnstat needs a few minutes of data on a fresh install — the timer will retry)"

sleep 2
echo
echo "------------------------------------------------------------------"
echo " Add these two to Vercel → Settings → Environment Variables"
echo "------------------------------------------------------------------"
echo "SERVER_USAGE_URL=https://$LK_DOMAIN/usage.json"
echo "SERVER_USAGE_TOKEN=$LK_USAGE_TOKEN"
echo "------------------------------------------------------------------"
echo "Check it works:"
echo "  curl -s -H \"Authorization: Bearer \$LK_USAGE_TOKEN\" https://$LK_DOMAIN/usage.json | head -c 300"
echo
echo "Without the token the same address must answer 'unauthorized'."
