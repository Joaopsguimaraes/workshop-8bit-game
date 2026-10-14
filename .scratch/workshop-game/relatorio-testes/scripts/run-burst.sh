#!/bin/bash
# One burst run against the production build, with or without the CPU profile.
# Starts from a fresh SQLite file, so every run begins with an empty Room.
# Usage: run-burst.sh <burst|spread> <players> <profile|no-profile> <work-dir> <out-dir>
# Environment:
#   PROBE=1              adds the transport probe (see burst-load-probe.mjs)
#   REPO_UNDER_TEST      checkout to run instead of this repo (used for the instrumented copy)
#   INSTRUMENTATION_FILE where the instrumented copy writes its counters at exit (instrumented copy only)
# Needs `pnpm exec next build` in the repo under test first.
set -euo pipefail

MODE=$1; PLAYERS=$2; PROFILE=$3
REPORT_DIR=$(cd "$(dirname "$0")/.." && pwd)
REPO=${REPO_UNDER_TEST:-$(cd "$REPORT_DIR/../../.." && pwd)}
PORT=3100
WORK=$(realpath -m "$4"); OUT=$(realpath -m "$5")

rm -rf "$WORK" && mkdir -p "$WORK/profile" "$OUT"
DB="$WORK/workshop.db"

PROFILE_FLAGS=()
if [ "$PROFILE" = "profile" ]; then
  PROFILE_FLAGS=(--cpu-prof --cpu-prof-dir="$WORK/profile")
fi

cd "$REPO"
env PORT=$PORT NODE_ENV=production FACILITADOR_PIN=4321 DATABASE_URL="file:$DB" \
  INSTRUMENTATION_FILE="${INSTRUMENTATION_FILE:-}" \
  node "${PROFILE_FLAGS[@]}" --import tsx --import "$REPORT_DIR/scripts/stop-on-sigint.mjs" server.ts \
  > "$WORK/server.log" 2>&1 &
SERVER=$!

for _ in $(seq 1 120); do
  grep -q "Pronto" "$WORK/server.log" 2>/dev/null && break
  sleep 0.5
done
grep -q "Pronto" "$WORK/server.log" || { echo "server did not start"; cat "$WORK/server.log"; kill "$SERVER"; exit 1; }

# CPU % of one core, RSS and bytes written, sampled once a second from /proc.
bash "$REPORT_DIR/scripts/sample-server.sh" "$SERVER" "$WORK/cpu.txt" 60 &
SAMPLER=$!

node "$REPORT_DIR/scripts/burst-load-probe.mjs" "$PLAYERS" 3 "$MODE" trabalho-remoto > "$WORK/result.json"

wait "$SAMPLER"
kill -INT "$SERVER"
wait "$SERVER" || true

cp "$WORK/result.json" "$WORK/cpu.txt" "$WORK/server.log" "$OUT/"
if [ "$PROFILE" = "profile" ]; then
  cp "$WORK"/profile/*.cpuprofile "$OUT/profile.cpuprofile"
fi
if [ -n "${INSTRUMENTATION_FILE:-}" ] && [ -f "$INSTRUMENTATION_FILE" ]; then
  cp "$INSTRUMENTATION_FILE" "$OUT/"
fi
echo "done: $OUT"
