#!/bin/bash
mkdir -p /tmp/tailscale-state

# Kill any existing tailscaled
pkill tailscaled 2>/dev/null
sleep 1

# Coba aktifkan IP forwarding (mungkin tidak berhasil di Replit, tapi tidak masalah)
sysctl -w net.ipv4.ip_forward=1 2>/dev/null || true
sysctl -w net.ipv6.conf.all.forwarding=1 2>/dev/null || true

# Start tailscaled dalam userspace mode
tailscaled \
  --tun=userspace-networking \
  --statedir=/tmp/tailscale-state \
  --socket=/tmp/tailscale.sock \
  --port=41641 \
  --socks5-server=localhost:1055 \
  --outbound-http-proxy-listen=localhost:1056 &

TSPID=$!
echo "tailscaled started with PID $TSPID"

# Tunggu socket siap
for i in $(seq 1 15); do
  sleep 1
  if [ -S /tmp/tailscale.sock ]; then
    echo "Socket ready after ${i}s"
    break
  fi
  echo "Waiting for socket... $i"
done

# Connect + advertise sebagai exit node
tailscale --socket=/tmp/tailscale.sock up \
  --authkey="$TAILSCALE_AUTH_KEY" \
  --accept-routes \
  --advertise-exit-node \
  --hostname="scrollap-server" 2>&1

# Pastikan exit node aktif
tailscale --socket=/tmp/tailscale.sock set --advertise-exit-node 2>&1

echo ""
echo "=== Tailscale Connected ==="
tailscale --socket=/tmp/tailscale.sock status 2>&1
echo ""
echo "=== Tailscale IP ==="
TS_IP=$(tailscale --socket=/tmp/tailscale.sock ip -4 2>/dev/null)
echo "$TS_IP"
echo ""
echo "=== Exit Node AKTIF ==="
echo "Server ini berbagi internet ke HP kamu via Tailscale."
echo "Cara pakai di HP:"
echo "  1. Buka Tailscale di HP -> tap 'Exit node'"
echo "  2. Pilih 'scrollap-server'"
echo "  3. Internet HP sekarang lewat server ini"
echo ""

# Keep process alive
wait $TSPID
