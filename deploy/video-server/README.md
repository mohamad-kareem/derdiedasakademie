# Your own classroom video server (free)

This folder sets up **LiveKit** — the video engine behind the DerDieDas classroom — on your own
machine, so classes have **no monthly minute limits**. The platform itself doesn't change: you
only point it at your server with three values.

Roughly 800 class-minutes a day needs about **1.5–2 TB of traffic a month**, which fits comfortably
in Oracle's free allowance (10 TB).

---

## Part 1 — Create the free server (Oracle Cloud)

1. Sign up at <https://signup.cloud.oracle.com>. A card is requested to verify your identity; the
   Always Free resources are not charged. Choose a **home region near your students** (e.g. Frankfurt) —
   it can't be changed later.
2. In the console: **Compute → Instances → Create instance**
   - **Image:** Ubuntu 24.04 (or 22.04)
   - **Shape:** *Ampere* → `VM.Standard.A1.Flex` → **4 OCPUs, 24 GB memory** (the whole free allowance;
     drop to 2 / 12 if Oracle answers *out of host capacity*)
   - **Networking:** assign a **public IPv4 address**
   - **SSH keys:** save the private key that it offers you — you need it to log in
3. Open the ports: **Networking → Virtual Cloud Networks → your VCN → Subnet → Security List → Add Ingress Rules**.
   Source `0.0.0.0/0` each time:

   | Protocol | Ports |
   | --- | --- |
   | TCP | 80, 443, 7881 |
   | UDP | 3478 |
   | UDP | 50000–60000 |

4. Point a name at the server: create a DNS **A record**, e.g. `lk.your-domain.com` → the public IP.
   No domain yet? A free one from <https://duckdns.org> works fine.

## Part 2 — Install (about 3 minutes)

Copy this folder to the server and run the script:

```bash
scp -i your-key.pem -r deploy/video-server ubuntu@SERVER_IP:~/
ssh -i your-key.pem ubuntu@SERVER_IP
sudo bash ~/video-server/setup.sh lk.your-domain.com you@example.com
```

The script installs Docker, opens the ports on the machine, creates your access keys, starts
LiveKit with an automatic HTTPS certificate, and prints three lines at the end.

Check it: open `https://lk.your-domain.com` in a browser — it should show **OK**.

## Part 3 — Point the platform at it

In **Vercel → Settings → Environment Variables**, replace the three LiveKit values with the ones the
script printed, then redeploy:

```
LIVEKIT_URL=wss://lk.your-domain.com
LIVEKIT_API_KEY=API…
LIVEKIT_API_SECRET=…
```

Run a test class with two browsers. Nothing else changes — whiteboard, PDFs, chat, quizzes and
attendance all keep working.

## Part 4 — Show the numbers in the admin area (optional, 1 minute)

So the teacher can see how much of the free allowance is actually used, the server can publish its
own traffic figures. On the server:

```bash
sudo bash ~/video-server/usage-setup.sh
```

It installs `vnstat` (the traffic counter), writes a small report to `/srv/ddd-usage/usage.json`
every 5 minutes, and serves it at `https://lk.your-domain.com/usage.json` — readable only with a
token it prints. Add the two printed values in **Vercel → Environment Variables** and redeploy:

```
SERVER_USAGE_URL=https://lk.your-domain.com/usage.json
SERVER_USAGE_TOKEN=…
```

The figures then appear under **Admin → Usage**. Check the token works:

```bash
curl -s https://lk.your-domain.com/usage.json                       # → unauthorized
curl -s -H "Authorization: Bearer TOKEN" https://lk.your-domain.com/usage.json | head -c 200
```

`vnstat` counts from the moment it is installed, so the first month is partial — the page says
since when it has been counting.

---

## Keeping it healthy

- **Updates (about once a month):** `cd ~/video-server && sudo docker compose pull && sudo docker compose up -d`
- **Is it running?** `sudo docker compose ps` · **Logs:** `sudo docker compose logs -f livekit`
- **Restart:** `sudo docker compose restart`
- **Keys:** stored in `~/video-server/.env`. Keep that file private; if it leaks, delete it, run the
  script again to create new keys, and update the three values in Vercel.
- **Traffic report:** `systemctl status ddd-usage.timer` · run it now with `sudo /usr/local/bin/ddd-usage.py`

## Two things to watch on Oracle's free tier

- **"Out of host capacity" when creating the instance.** Free Ampere machines are popular. Try another
  availability domain, or retry later — it usually works within a day.
- **Idle machines can be reclaimed.** Oracle may take back a free instance if, over 7 days, its
  processor, network *and* memory use all stay under 20%. Regular classes usually keep it busy enough;
  to be completely safe, upgrade the account to *Pay As You Go* — resources inside the Always Free
  limits stay free, and reclamation no longer applies.

## If a student can't connect

Almost always a closed port. Check the cloud Security List rules from Part 1, especially
**UDP 50000–60000**. The classroom falls back to TCP port 7881 automatically, so if that one is open
the class still works, just with a little more delay.
