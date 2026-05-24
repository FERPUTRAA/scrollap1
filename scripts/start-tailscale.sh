#!/bin/bash

TAILSCALED=/nix/store/xdqdr208nmr26a0wpbm7p9qb5db3s5xb-tailscale-1.82.5/bin/tailscaled
TAILSCALE=/nix/store/xdqdr208nmr26a0wpbm7p9qb5db3s5xb-tailscale-1.82.5/bin/tailscale

mkdir -p /tmp/tailscale-state

pkill tailscaled 2>/dev/null || true
sleep 1

sysctl -w net.ipv4.ip_forward=1 2>/dev/null || true
sysctl -w net.ipv6.conf.all.forwarding=1 2>/dev/null || true

"$TAILSCALED" \
  --tun=userspace-networking \
  --statedir=/tmp/tailscale-state \
  --socket=/tmp/tailscale.sock \
  --port=41641 \
  --socks5-server=localhost:1055 \
  --outbound-http-proxy-listen=localhost:1056 &

TSPID=$!
echo "tailscaled started with PID $TSPID"

for i in $(seq 1 20); do
  sleep 1
  if [ -S /tmp/tailscale.sock ]; then
    echo "Socket ready after ${i}s"
    break
  fi
  echo "Waiting for socket... $i"
done

if [ ! -S /tmp/tailscale.sock ]; then
  echo "WARNING: Socket not ready, will retry connection later"
else
  "$TAILSCALE" --socket=/tmp/tailscale.sock up \
    --authkey="$TAILSCALE_AUTH_KEY" \
    --accept-routes \
    --advertise-exit-node \
    --hostname="scrollap-server" 2>&1 || true

  "$TAILSCALE" --socket=/tmp/tailscale.sock set --advertise-exit-node 2>/dev/null || true

  echo ""
  echo "=== Tailscale Connected ==="
  "$TAILSCALE" --socket=/tmp/tailscale.sock status 2>&1 || true
  echo ""
  TS_IP=$("$TAILSCALE" --socket=/tmp/tailscale.sock ip -4 2>/dev/null || echo "pending")
  echo "IP: $TS_IP"
  echo ""
  echo "Exit Node aktif — HP bisa pakai internet server ini via Tailscale."
fi

wait $TSPID
