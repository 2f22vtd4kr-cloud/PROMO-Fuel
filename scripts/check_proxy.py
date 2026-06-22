#!/usr/bin/env python3
"""
Proxy health checker — tests a SOCKS5 proxy by connecting to Telegram DC2.
Usage: python3 scripts/check_proxy.py <socks5://user:pass@host:port>
Outputs JSON: {"alive": bool, "latency_ms": int|null, "error": str|null}
"""
import sys, socket, struct, time, json
from urllib.parse import urlparse

# Telegram DC2 — well-known stable IP
TARGET_HOST = "149.154.167.51"
TARGET_PORT = 443
TIMEOUT = 8


def check(proxy_url: str) -> dict:
    p = urlparse(proxy_url.strip())
    if not p.hostname or not p.port:
        return {"alive": False, "latency_ms": None, "error": "Invalid proxy URL"}

    user = p.username or ""
    pwd  = p.password or ""
    host = p.hostname
    port = p.port

    t0 = time.monotonic()
    try:
        sock = socket.create_connection((host, port), timeout=TIMEOUT)
    except Exception as e:
        return {"alive": False, "latency_ms": None, "error": f"TCP connect failed: {e}"}

    try:
        # SOCKS5 greeting: support NoAuth (0x00) and UserPass (0x02)
        if user:
            sock.sendall(b"\x05\x02\x00\x02")  # methods: no-auth + user/pass
        else:
            sock.sendall(b"\x05\x01\x00")       # methods: no-auth only

        resp = _recv_exact(sock, 2)
        if resp[0] != 5:
            raise ValueError("Not a SOCKS5 server")

        chosen = resp[1]
        if chosen == 0xFF:
            raise ValueError("No acceptable auth method")

        # User/pass sub-negotiation
        if chosen == 0x02:
            ub = user.encode()
            pb = pwd.encode()
            auth = bytes([1, len(ub)]) + ub + bytes([len(pb)]) + pb
            sock.sendall(auth)
            ar = _recv_exact(sock, 2)
            if ar[1] != 0:
                raise ValueError("SOCKS5 auth rejected")

        # CONNECT to Telegram DC2
        host_b = TARGET_HOST.encode()
        req = struct.pack("!BBB", 5, 1, 0)           # VER CMD RSV
        req += b"\x01"                                 # ATYP = IPv4
        req += socket.inet_aton(TARGET_HOST)           # DST.ADDR
        req += struct.pack("!H", TARGET_PORT)          # DST.PORT
        sock.sendall(req)

        rep = _recv_exact(sock, 4)
        if rep[1] != 0:
            raise ValueError(f"SOCKS5 CONNECT refused (code {rep[1]})")

        # Skip remaining reply bytes (BND.ADDR + BND.PORT)
        atyp = rep[3]
        if   atyp == 1: _recv_exact(sock, 4 + 2)
        elif atyp == 3: skip = _recv_exact(sock, 1); _recv_exact(sock, skip[0] + 2)
        elif atyp == 4: _recv_exact(sock, 16 + 2)

        latency = int((time.monotonic() - t0) * 1000)
        return {"alive": True, "latency_ms": latency, "error": None}

    except Exception as e:
        return {"alive": False, "latency_ms": None, "error": str(e)}
    finally:
        try: sock.close()
        except: pass


def _recv_exact(sock: socket.socket, n: int) -> bytes:
    buf = b""
    while len(buf) < n:
        chunk = sock.recv(n - len(buf))
        if not chunk:
            raise ConnectionError("Connection closed")
        buf += chunk
    return buf


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"alive": False, "latency_ms": None, "error": "No proxy URL provided"}))
        sys.exit(1)
    result = check(sys.argv[1])
    print(json.dumps(result))
