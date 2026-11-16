"""Private browser login for the existing single-user LifeOS server.

No access to, or mutation of, workspace data. Legacy HTTP Basic remains supported.
"""
import base64
import hashlib
import hmac
import html
import secrets
import threading
import time
from http.cookies import SimpleCookie
from urllib.parse import parse_qs, urlparse

COOKIE_NAME = "lifeos_browser_v153"
MAX_AGE = 12 * 60 * 60
_attempts = {}
_lock = threading.Lock()


def _key(password, token):
    return hashlib.sha256(("LifeOS browser session v153\x00" + password + "\x00" + token).encode()).digest()


def _sign(payload, password, token):
    return hmac.new(_key(password, token), payload.encode("ascii"), hashlib.sha256).hexdigest()


def is_signed_in(headers, password, token):
    try:
        cookie = SimpleCookie()
        cookie.load(headers.get("Cookie", ""))
        value = cookie[COOKIE_NAME].value
        payload, signature = value.rsplit(".", 1)
        version, issued, nonce = payload.split(":", 2)
        age = time.time() - int(issued)
        return (version == "1" and 0 <= age <= MAX_AGE and
                len(nonce) >= 12 and hmac.compare_digest(_sign(payload, password, token), signature))
    except (KeyError, ValueError, TypeError):
        return False


def _response(handler, status, body, cookie=None, redirect=None):
    blob = body.encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "text/html; charset=utf-8")
    handler.send_header("Content-Length", str(len(blob)))
    handler.send_header("Cache-Control", "no-store")
    handler.send_header("X-Content-Type-Options", "nosniff")
    handler.send_header("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'")
    handler.send_header("Referrer-Policy", "no-referrer")
    handler.send_header("X-Frame-Options", "DENY")
    if cookie:
        handler.send_header("Set-Cookie", cookie)
    if redirect:
        handler.send_header("Location", redirect)
    handler.end_headers()
    handler.wfile.write(blob)


def _page(error=False):
    message = '<p role="alert" class="error">Credentials not accepted. Please try again.</p>' if error else ""
    return """<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sign in · LifeOS Personal</title>
<style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#020b1d;color:#f2f8fc;font:16px system-ui,-apple-system,sans-serif;padding:22px}
main{width:min(100%,420px);padding:28px;border:1px solid #315166;border-radius:24px;background:#07172b;box-shadow:0 16px 50px #0006}
.logo{font-weight:800;color:#53c5aa;letter-spacing:.04em}h1{font-size:28px;margin:20px 0 8px}p{color:#a9c1ce;line-height:1.55}
label{display:block;margin-top:20px;font-weight:600}input{width:100%;margin-top:8px;padding:14px;border-radius:12px;border:1px solid #446177;background:#10243b;color:white;font:inherit;min-height:50px}
input:focus-visible,button:focus-visible{outline:3px solid #6ddcc0;outline-offset:3px}
button{margin-top:24px;width:100%;border:0;border-radius:13px;background:#087c65;color:#fff;font:inherit;font-weight:800;padding:16px;min-height:54px}
.error{color:#ffb4ae}small{display:block;color:#99b0c2;margin-top:20px;line-height:1.5}
</style></head><body><main><div class="logo">LIFEOS · PERSONAL</div>
<h1>Welcome back</h1><p>Sign in to open your private workspace. Your activity history stays unchanged.</p>
""" + message + """
<form method="post" action="/login" autocomplete="on">
<label for="username">Username</label><input id="username" name="username" autocomplete="username" required maxlength="200">
<label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required>
<button type="submit">Sign in securely</button></form>
<small>Use your existing LifeOS browser username and password. The cloud sync token is separate.</small>
</main></body></html>"""


def show_login(handler):
    _response(handler, 200, _page())


def _same_origin(handler):
    # Reject cross-site requests. Modern browsers send Origin on form POST.
    origin = handler.headers.get("Origin", "")
    host = handler.headers.get("Host", "")
    if not origin or not host:
        return False
    parsed = urlparse(origin)
    return parsed.scheme in ("https", "http") and parsed.netloc == host


def login(handler, username, password, token):
    if not _same_origin(handler):
        _response(handler, 403, "Forbidden")
        return
    try:
        length = int(handler.headers.get("Content-Length", "0"))
    except ValueError:
        length = 0
    if length <= 0 or length > 4096:
        _response(handler, 413, "Invalid form")
        return
    fields = parse_qs(handler.rfile.read(length).decode("utf-8"), keep_blank_values=True)
    typed_user = fields.get("username", [""])[0]
    typed_password = fields.get("password", [""])[0]
    remote = handler.client_address[0]
    now = time.monotonic()
    with _lock:
        recent = [t for t in _attempts.get(remote, []) if now - t < 300]
        if len(recent) >= 12:
            _attempts[remote] = recent
            _response(handler, 429, "Too many sign-in attempts. Try again later.")
            return
    valid = (hmac.compare_digest(typed_user, username) and
             hmac.compare_digest(typed_password, password))
    if not valid:
        with _lock:
            _attempts[remote] = recent + [now]
        _response(handler, 401, _page(error=True))
        return
    with _lock:
        _attempts.pop(remote, None)
    payload = "1:" + str(int(time.time())) + ":" + secrets.token_urlsafe(18)
    value = payload + "." + _sign(payload, password, token)
    secure = handler.headers.get("X-Forwarded-Proto", "").split(",")[0].strip() == "https"
    cookie = COOKIE_NAME + "=" + value + "; Path=/; HttpOnly; SameSite=Strict; Max-Age=" + str(MAX_AGE)
    if secure:
        cookie += "; Secure"
    _response(handler, 303, "", cookie=cookie, redirect="/")


def unauthenticated(handler, path, method):
    if method == "GET" and path in ("/", "/index.html", "/calendar.html"):
        _response(handler, 303, "", redirect="/login")
        return
    handler.send_response(401)
    handler.send_header("Content-Length", "0")
    handler.send_header("Cache-Control", "no-store")
    handler.send_header("X-Content-Type-Options", "nosniff")
    handler.end_headers()
