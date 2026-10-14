#!/bin/bash
# Samples the server process once a second from /proc: CPU (% of one core), RSS (MB), and
# bytes written by the process (KB, from /proc/<pid>/io wchar: sockets and files).
PID=$1; SAIDA=$2; DURACAO=$3
ticks=$(getconf CLK_TCK)
prev=$(awk '{print $14+$15}' /proc/$PID/stat)
prev_w=$(awk '/^wchar/{print $2}' /proc/$PID/io)
echo "t_s cpu_pct rss_mb written_kb_s" > "$SAIDA"
for i in $(seq 1 $DURACAO); do
  sleep 1
  now=$(awk '{print $14+$15}' /proc/$PID/stat)
  now_w=$(awk '/^wchar/{print $2}' /proc/$PID/io)
  rss=$(awk '/VmRSS/{print int($2/1024)}' /proc/$PID/status)
  echo "$i $(( (now-prev)*100/ticks )) $rss $(( (now_w-prev_w)/1024 ))" >> "$SAIDA"
  prev=$now
  prev_w=$now_w
done
