#!/bin/bash
set -e

# ── Tailscale (background) ──────────────────────────────────────────────────
echo "[tailscale] Starting..."
mkdir -p /tmp/tailscale-state
pkill tailscaled 2>/dev/null; sleep 1

tailscaled \
  --tun=userspace-networking \
  --statedir=/tmp/tailscale-state \
  --socket=/tmp/tailscale.sock \
  --port=41641 \
  --socks5-server=localhost:1055 \
  --outbound-http-proxy-listen=localhost:1056 &

for i in $(seq 1 15); do
  sleep 1
  [ -S /tmp/tailscale.sock ] && echo "[tailscale] Socket ready" && break
done

tailscale --socket=/tmp/tailscale.sock up \
  --authkey="$TAILSCALE_AUTH_KEY" \
  --accept-routes \
  --advertise-exit-node \
  --hostname="scrollap-server" 2>&1

tailscale --socket=/tmp/tailscale.sock set --advertise-exit-node 2>/dev/null || true
echo "[tailscale] Connected — IP: $(tailscale --socket=/tmp/tailscale.sock ip -4 2>/dev/null)"

# ── API Server (background) ─────────────────────────────────────────────────
echo "[api] Starting on port 8080..."
PORT=8080 pnpm run --filter @workspace/api-server dev &

# ── Web UI (foreground — keeps container alive) ─────────────────────────────
echo "[web] Starting on port 5000..."
exec PORT=5000 BASE_PATH=/ pnpm run --filter @workspace/tiktok-ui dev
