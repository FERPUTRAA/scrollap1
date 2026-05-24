#!/bin/bash

TAILSCALED=/nix/store/xdqdr208nmr26a0wpbm7p9qb5db3s5xb-tailscale-1.82.5/bin/tailscaled
TAILSCALE=/nix/store/xdqdr208nmr26a0wpbm7p9qb5db3s5xb-tailscale-1.82.5/bin/tailscale

# ── Tailscale — background, non-blocking ─────────────────────────────────────
(
  mkdir -p /tmp/tailscale-state
  pkill tailscaled 2>/dev/null || true
  sleep 1

  "$TAILSCALED" \
    --tun=userspace-networking \
    --statedir=/tmp/tailscale-state \
    --socket=/tmp/tailscale.sock \
    --port=41641 \
    --socks5-server=localhost:1055 \
    --outbound-http-proxy-listen=localhost:1056 \
    2>/tmp/tailscaled.log &

  for i in $(seq 1 20); do
    sleep 1
    [ -S /tmp/tailscale.sock ] && break
  done

  if [ -S /tmp/tailscale.sock ]; then
    "$TAILSCALE" --socket=/tmp/tailscale.sock up \
      --authkey="$TAILSCALE_AUTH_KEY" \
      --accept-routes \
      --advertise-exit-node \
      --hostname="scrollap-server" 2>&1 || true
    "$TAILSCALE" --socket=/tmp/tailscale.sock set --advertise-exit-node 2>/dev/null || true
    echo "[tailscale] IP: $("$TAILSCALE" --socket=/tmp/tailscale.sock ip -4 2>/dev/null || echo 'pending')"
  fi
) &

# ── API Server — foreground (keeps workflow alive, port 8080) ─────────────────
echo "[api] Starting on port 8080..."
export PORT=8080
exec pnpm run --filter @workspace/api-server dev
