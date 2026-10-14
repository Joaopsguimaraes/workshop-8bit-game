#!/bin/bash
# One burst run against the production build, with or without the CPU profile.
# Uses a fresh SQLite file so every run starts from an empty Room.
# Usage: run-burst.sh <rajada|espalhado> <players> <profile|no-profile> <work-dir> <out-dir>
# Needs `pnpm exec next build` at the repo root first.
set -euo pipefail

MODE=$1; PLAYERS=$2; PROFILE=$3
REPO=${REPO_ALVO:-/home/joao-victor-guimaraes/studies-projects/workshop-prompt-engineering}
REPORT=/home/joao-victor-guimaraes/studies-projects/workshop-prompt-engineering/.scratch/workshop-game/relatorio-testes
PORT=3100
# Resolved before the script changes directory.
WORK=$(realpath -m "$4"); OUT=$(realpath -m "$5")

rm -rf "$WORK" && mkdir -p "$WORK/profile" "$OUT"
DB="$WORK/workshop.db"

PROFILE_FLAGS=()
if [ "$PROFILE" = "profile" ]; then
  PROFILE_FLAGS=(--cpu-prof --cpu-prof-dir="$WORK/profile")
fi

cd "$REPO"
env PORT=$PORT NODE_ENV=production FACILITADOR_PIN=4321 DATABASE_URL="file:$DB" \
  node "${PROFILE_FLAGS[@]}" --import tsx --import "$REPORT/scripts/stop-on-sigint.mjs" server.ts \
  > "$WORK/server.log" 2>&1 &
SERVER=$!

for _ in $(seq 1 120); do
  grep -q "Pronto" "$WORK/server.log" 2>/dev/null && break
  sleep 0.5
done
grep -q "Pronto" "$WORK/server.log" || { echo "server did not start"; cat "$WORK/server.log"; kill "$SERVER"; exit 1; }

# CPU % of one core and RSS, sampled once a second from /proc (see amostrar.sh).
bash "$REPORT/scripts/amostrar.sh" "$SERVER" "$WORK/cpu.txt" 60 &
SAMPLER=$!

node "${CARGA:-$REPORT/scripts/carga.mjs}" "$PLAYERS" 3 "$MODE" trabalho-remoto > "$WORK/resultado.json"

wait "$SAMPLER"
kill -INT "$SERVER"
wait "$SERVER" || true

cp "$WORK/resultado.json" "$WORK/cpu.txt" "$WORK/server.log" "$OUT/"
if [ "$PROFILE" = "profile" ]; then
  cp "$WORK"/profile/*.cpuprofile "$OUT/profile.cpuprofile"
fi
echo "done: $OUT"
