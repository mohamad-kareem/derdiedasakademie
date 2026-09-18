#!/usr/bin/env bash
# Sets up the DerDieDas classroom video server (LiveKit) on a fresh Ubuntu machine.
# Usage:  sudo bash setup.sh lk.your-domain.com you@example.com
set -euo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -z "$DOMAIN" ]]; then
  echo "Usage: sudo bash setup.sh lk.your-domain.com you@example.com"
  exit 1
fi
if [[ $EUID -ne 0 ]]; then
  echo "Please run with sudo."
  exit 1
fi

echo "==> 1/6  Installing Docker (skipped if already there)"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

echo "==> 2/6  Opening the ports the classroom needs"
# Oracle's Ubuntu images block everything except SSH, so add rules before the REJECT rule.
open_tcp() { iptables -C INPUT -p tcp --dport "$1" -j ACCEPT 2>/dev/null || iptables -I INPUT 1 -p tcp --dport "$1" -j ACCEPT; }
open_udp() { iptables -C INPUT -p udp --dport "$1" -j ACCEPT 2>/dev/null || iptables -I INPUT 1 -p udp --dport "$1" -j ACCEPT; }
open_udp_range() { iptables -C INPUT -p udp --dport "$1:$2" -j ACCEPT 2>/dev/null || iptables -I INPUT 1 -p udp --dport "$1:$2" -j ACCEPT; }
for p in 80 443 7881; do open_tcp "$p"; done
open_udp 3478
open_udp_range 50000 60000
if command -v netfilter-persistent >/dev/null 2>&1; then
  netfilter-persistent save >/dev/null 2>&1 || true
else
  DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent >/dev/null 2>&1 || true
  netfilter-persistent save >/dev/null 2>&1 || true
fi
echo "    Ports opened on the machine. Remember the same ports in the cloud firewall (see the guide)."

echo "==> 3/6  Creating the access keys (kept in $DIR/.env)"
if [[ ! -f "$DIR/.env" ]]; then
  API_KEY="API$(head -c 9 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 12)"
  API_SECRET="$(head -c 48 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 48)"
  cat > "$DIR/.env" <<ENV
LK_DOMAIN=$DOMAIN
LK_API_KEY=$API_KEY
LK_API_SECRET=$API_SECRET
LK_EMAIL=$EMAIL
ENV
  chmod 600 "$DIR/.env"
fi
# shellcheck disable=SC1091
set -a; . "$DIR/.env"; set +a
LK_DOMAIN="$DOMAIN"
sed -i "s|^LK_DOMAIN=.*|LK_DOMAIN=$DOMAIN|" "$DIR/.env"

echo "==> 4/6  Writing the server configuration"
sed -e "s|\${LK_DOMAIN}|$LK_DOMAIN|g" \
    -e "s|\${LK_API_KEY}|$LK_API_KEY|g" \
    -e "s|\${LK_API_SECRET}|$LK_API_SECRET|g" \
    "$DIR/livekit.yaml" > "$DIR/livekit.generated.yaml"
chmod 600 "$DIR/livekit.generated.yaml"

echo "==> 5/6  Starting the server"
cd "$DIR"
docker compose pull -q
docker compose up -d

echo "==> 6/6  Checking"
sleep 6
docker compose ps
echo
echo "------------------------------------------------------------------"
echo " Put these three values in Vercel → Settings → Environment Variables"
echo "------------------------------------------------------------------"
echo "LIVEKIT_URL=wss://$LK_DOMAIN"
echo "LIVEKIT_API_KEY=$LK_API_KEY"
echo "LIVEKIT_API_SECRET=$LK_API_SECRET"
echo "------------------------------------------------------------------"
echo "Test in a browser:  https://$LK_DOMAIN   → should show OK"
echo "(The certificate can take a minute on the first start.)"
