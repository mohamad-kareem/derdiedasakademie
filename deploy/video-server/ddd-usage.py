#!/usr/bin/env python3
"""
Writes a small traffic report to /srv/ddd-usage/usage.json every few minutes.

The numbers come from vnstat, which counts every byte the network card sends and
receives. Outbound ("tx") is what Oracle measures against the 10 TB free allowance,
so that is the figure the admin Usage page shows.

Only the standard library is used, so there is nothing to install or keep updated.
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone

OUT_DIR = "/srv/ddd-usage"
OUT_FILE = os.path.join(OUT_DIR, "usage.json")


def default_interface() -> str:
    """The network card that carries traffic to the internet."""
    try:
        out = subprocess.run(
            ["ip", "-o", "route", "get", "1.1.1.1"],
            capture_output=True, text=True, timeout=10, check=True,
        ).stdout.split()
        return out[out.index("dev") + 1]
    except Exception:
        return ""


def vnstat_json(interface: str) -> dict:
    cmd = ["vnstat", "--json"]
    if interface:
        cmd += ["-i", interface]
    raw = subprocess.run(cmd, capture_output=True, text=True, timeout=30, check=True).stdout
    return json.loads(raw)


def as_date(d: dict) -> str:
    if not d:
        return ""
    if "day" in d:
        return "%04d-%02d-%02d" % (d["year"], d["month"], d["day"])
    return "%04d-%02d" % (d["year"], d["month"])


def entry(item: dict) -> dict:
    return {
        "date": as_date(item.get("date")),
        "txBytes": int(item.get("tx", 0)),
        "rxBytes": int(item.get("rx", 0)),
    }


def system_stats() -> dict:
    stats = {}
    try:
        with open("/proc/uptime") as fh:
            stats["uptimeSeconds"] = int(float(fh.read().split()[0]))
    except Exception:
        pass
    try:
        with open("/proc/loadavg") as fh:
            stats["load1"] = float(fh.read().split()[0])
    except Exception:
        pass
    try:
        mem = {}
        with open("/proc/meminfo") as fh:
            for line in fh:
                key, _, rest = line.partition(":")
                mem[key] = int(rest.strip().split()[0]) * 1024
        stats["memTotalBytes"] = mem.get("MemTotal", 0)
        stats["memAvailableBytes"] = mem.get("MemAvailable", 0)
    except Exception:
        pass
    try:
        fs = os.statvfs("/")
        stats["diskTotalBytes"] = fs.f_blocks * fs.f_frsize
        stats["diskFreeBytes"] = fs.f_bavail * fs.f_frsize
    except Exception:
        pass
    return stats


def main() -> int:
    interface = default_interface()
    data = vnstat_json(interface)
    interfaces = data.get("interfaces") or []
    if not interfaces:
        print("vnstat has no data for this machine yet", file=sys.stderr)
        return 1
    iface = next((i for i in interfaces if i.get("name") == interface), interfaces[0])
    traffic = iface.get("traffic", {})

    days = [entry(d) for d in traffic.get("day", [])][-45:]
    months = [entry(m) for m in traffic.get("month", [])][-13:]
    today = datetime.now().strftime("%Y-%m-%d")
    this_month = datetime.now().strftime("%Y-%m")

    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "interface": iface.get("name", ""),
        "countingSince": as_date((iface.get("created") or {}).get("date")),
        "today": next((d for d in days if d["date"] == today), {"date": today, "txBytes": 0, "rxBytes": 0}),
        "month": next((m for m in months if m["date"] == this_month), {"date": this_month, "txBytes": 0, "rxBytes": 0}),
        "days": days,
        "months": months,
        "total": {
            "txBytes": int((traffic.get("total") or {}).get("tx", 0)),
            "rxBytes": int((traffic.get("total") or {}).get("rx", 0)),
        },
        "system": system_stats(),
    }

    os.makedirs(OUT_DIR, exist_ok=True)
    # Write to a temporary file first so a reader never sees a half-written report.
    fd, tmp = tempfile.mkstemp(dir=OUT_DIR)
    with os.fdopen(fd, "w") as fh:
        json.dump(report, fh, separators=(",", ":"))
    os.chmod(tmp, 0o644)
    shutil.move(tmp, OUT_FILE)
    return 0


if __name__ == "__main__":
    sys.exit(main())
