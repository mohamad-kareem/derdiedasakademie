#!/usr/bin/env python3
"""
Course material for Die DerDieDas Akademie.

The files themselves live in an ordinary folder on this machine:

    /srv/ddd-material/A1/Hören/01 - Lektion 3.mp3
    /srv/ddd-material/A1/Arbeitsblätter/01 - Lektion 3.pdf

and Caddy sends them to the students. This small program only decides
*whether* it may. Every address the platform hands a student carries a
signature and an expiry time; a link pasted into a group chat stops working
within hours, and one somebody makes up never works at all.

It also does the three things the platform cannot do from Vercel:
list what is in the folder, take an upload straight from Bilal's browser, and
remove a file. Each of those is signed the same way, with the one secret the
platform and this machine share (MATERIAL_SECRET).

Only the standard library is used, so there is nothing to install or keep
updated. It listens on 127.0.0.1 only; the outside world reaches it through
Caddy.
"""
import hashlib
import hmac
import json
import os
import secrets
import shutil
import stat
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote

ROOT = os.path.realpath(os.environ.get("MATERIAL_ROOT", "/srv/ddd-material"))
SECRET = os.environ.get("MATERIAL_SECRET", "").encode()
LISTEN = os.environ.get("MATERIAL_LISTEN", "127.0.0.1:7890")
MAX_BYTES = int(os.environ.get("MATERIAL_MAX_MB", "500")) * 1024 * 1024
# Never fill the disk: the classroom needs room for its logs, and a full disk
# stops the video server too.
KEEP_FREE = 2 * 1024 * 1024 * 1024
LEVELS = ("A1", "A2", "B1", "B2", "C1")
# What may arrive through the upload box. Files you copy in yourself are not
# limited by this; it only keeps a browser from putting a web page on the
# classroom's address.
UPLOADABLE = {
    ".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".odt", ".txt", ".rtf", ".csv",
    ".jpg", ".jpeg", ".png", ".gif", ".webp",
    ".mp3", ".m4a", ".wav", ".ogg", ".oga", ".opus", ".aac", ".weba",
    ".mp4", ".webm", ".mov", ".zip",
}
CHUNK = 1024 * 1024


def sign(*parts) -> str:
    message = "\n".join(str(p) for p in parts).encode("utf-8")
    return hmac.new(SECRET, message, hashlib.sha256).hexdigest()[:32]


def valid(query: dict, *parts) -> str:
    """'' when the signature is good and in date, otherwise the reason."""
    try:
        expires = int(query.get("e", [""])[0])
    except ValueError:
        return "bad-signature"
    given = query.get("s", [""])[0]
    if not hmac.compare_digest(sign(parts[0], parts[1], expires, *parts[2:]), given):
        return "bad-signature"
    if expires < time.time():
        return "expired"
    return ""


def level_of(name: str) -> str:
    up = name.upper()
    return up if up in LEVELS else ""


def safe_parts(rel: str):
    """Split a path inside the material folder, or None if it reaches outside,
    names something hidden, or is not under a level."""
    if not rel or len(rel) > 600 or rel.startswith("/") or "\\" in rel:
        return None
    parts = rel.split("/")
    if len(parts) < 2:
        return None
    for p in parts:
        if not p or p in (".", "..") or p.startswith(".") or any(ord(c) < 32 for c in p):
            return None
    if not level_of(parts[0]):
        return None
    return parts


def inside(path: str) -> bool:
    real = os.path.realpath(path)
    return real == ROOT or real.startswith(ROOT + os.sep)


def listing():
    files = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = sorted(d for d in dirnames if not d.startswith("."))
        here = os.path.relpath(dirpath, ROOT)
        for name in filenames:
            if name.startswith("."):
                continue
            rel = name if here == "." else here.replace(os.sep, "/") + "/" + name
            parts = rel.split("/")
            if len(parts) < 2 or not level_of(parts[0]):
                continue
            try:
                rel.encode("utf-8")  # a name that is not valid UTF-8 cannot be linked to
                st = os.stat(os.path.join(dirpath, name))
            except (UnicodeEncodeError, OSError):
                continue
            if stat.S_ISREG(st.st_mode):
                files.append({"p": rel, "s": st.st_size, "m": int(st.st_mtime)})
    disk = shutil.disk_usage(ROOT)
    return {
        "ok": True,
        "files": files,
        "bytes": sum(f["s"] for f in files),
        "disk": {"total": disk.total, "used": disk.used, "free": disk.free},
    }


class Handler(BaseHTTPRequestHandler):
    server_version = "ddd-material"
    sys_version = ""
    # A stalled upload must not hold a thread for ever.
    timeout = 120

    # -- plumbing -------------------------------------------------------------
    def split(self):
        path, _, query = self.path.partition("?")
        return path, parse_qs(query, keep_blank_values=True)

    def cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "600")

    def reply(self, code: int, body: dict):
        data = json.dumps(body).encode()
        self.send_response(code)
        self.cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def fail(self, code: int, reason: str):
        self.reply(code, {"ok": False, "error": reason})

    def log_message(self, fmt, *args):
        # Caddy asks /verify for every byte range of every audio file; logging
        # each one would bury anything worth reading.
        if self.path.startswith("/verify") and len(args) > 1 and str(args[1]) == "200":
            return
        sys.stderr.write("%s %s\n" % (self.command, fmt % args))

    # -- routes ---------------------------------------------------------------
    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        path, query = self.split()
        if path == "/verify":
            return self.verify()
        if path == "/m-api/health":
            return self.reply(200, {"ok": True})
        if path == "/m-api/index":
            reason = valid(query, "INDEX", "")
            if reason:
                return self.fail(403, reason)
            return self.reply(200, listing())
        return self.fail(404, "not-found")

    def verify(self):
        """Asked by Caddy before it sends a file: is this address signed?"""
        method = self.headers.get("X-Forwarded-Method", "GET")
        uri = self.headers.get("X-Forwarded-Uri", "")
        path, _, raw = uri.partition("?")
        rel = unquote(path)
        ok = method in ("GET", "HEAD") and rel.startswith("/m/")
        rel = rel[3:]
        if ok and safe_parts(rel) and not valid(parse_qs(raw), "GET", rel):
            self.send_response(200)
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        body = b"This link has expired or is not valid. Open the material again from your course page.\n"
        self.send_response(403)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def do_PUT(self):
        path, query = self.split()
        prefix = "/m-api/upload/"
        if not path.startswith(prefix):
            return self.fail(404, "not-found")
        rel = unquote(path[len(prefix):])
        parts = safe_parts(rel)
        if not parts:
            return self.fail(400, "bad-path")
        try:
            size = int(query.get("n", [""])[0])
            length = int(self.headers.get("Content-Length", "-1"))
        except ValueError:
            return self.fail(400, "bad-size")
        reason = valid(query, "PUT", rel, size)
        if reason:
            return self.fail(403, reason)
        if os.path.splitext(parts[-1])[1].lower() not in UPLOADABLE:
            return self.fail(415, "type")
        if size < 0 or size > MAX_BYTES:
            return self.fail(413, "too-big")
        if length != size:
            return self.fail(400, "bad-size")
        if shutil.disk_usage(ROOT).free - size < KEEP_FREE:
            return self.fail(507, "disk-full")

        target = os.path.join(ROOT, *parts)
        folder = os.path.dirname(target)
        if not inside(folder if os.path.exists(folder) else ROOT):
            return self.fail(400, "bad-path")
        if os.path.lexists(target):
            return self.fail(409, "exists")
        os.makedirs(folder, exist_ok=True)
        if not inside(folder):
            return self.fail(400, "bad-path")

        temp = os.path.join(folder, ".upload-" + secrets.token_hex(6))
        left = size
        try:
            with open(temp, "wb") as out:
                while left > 0:
                    chunk = self.rfile.read(min(CHUNK, left))
                    if not chunk:
                        break
                    out.write(chunk)
                    left -= len(chunk)
            if left:
                raise IOError("short")
            os.chmod(temp, 0o644)
            # link() refuses to replace, so two uploads of the same name
            # cannot overwrite each other.
            os.link(temp, target)
        except FileExistsError:
            return self.fail(409, "exists")
        except Exception:  # noqa: BLE001 — the browser only needs to know it failed
            return self.fail(400, "short-body")
        finally:
            if os.path.exists(temp):
                os.unlink(temp)
        return self.reply(201, {"ok": True, "p": rel})

    def do_DELETE(self):
        path, query = self.split()
        prefix = "/m-api/file/"
        if not path.startswith(prefix):
            return self.fail(404, "not-found")
        rel = unquote(path[len(prefix):])
        parts = safe_parts(rel)
        if not parts:
            return self.fail(400, "bad-path")
        reason = valid(query, "DELETE", rel)
        if reason:
            return self.fail(403, reason)
        target = os.path.join(ROOT, *parts)
        if not inside(target) or not os.path.isfile(target):
            return self.fail(404, "not-found")
        os.unlink(target)
        # Tidy away a section folder that is now empty, but never a level.
        level = os.path.join(ROOT, parts[0])
        folder = os.path.dirname(target)
        while folder != level and inside(folder) and folder != ROOT:
            try:
                os.rmdir(folder)
            except OSError:
                break
            folder = os.path.dirname(folder)
        return self.reply(200, {"ok": True})


def main():
    if len(SECRET) < 24:
        sys.exit("MATERIAL_SECRET is missing or too short — run material-setup.sh")
    os.makedirs(ROOT, exist_ok=True)
    host, _, port = LISTEN.rpartition(":")
    server = ThreadingHTTPServer((host or "127.0.0.1", int(port)), Handler)
    server.daemon_threads = True
    sys.stderr.write("serving %s on %s\n" % (ROOT, LISTEN))
    server.serve_forever()


if __name__ == "__main__":
    main()
