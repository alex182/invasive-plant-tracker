#!/usr/bin/env bash
# Converts the most recent Playwright .webm recording in demo/videos/ to an
# iMessage/Messages/Photos-compatible H.264 MP4 (Playwright records VP8/webm,
# which Apple's Messages app won't preview or play).
set -euo pipefail

cd "$(dirname "$0")/videos"

latest=$(ls -t *.webm 2>/dev/null | head -1)
if [ -z "${latest:-}" ]; then
  echo "No .webm recordings found in demo/videos/ — run 'npm run demo' first." >&2
  exit 1
fi

out="${latest%.webm}.mp4"
echo "Converting $latest -> $out"

ffmpeg -y -i "$latest" \
  -c:v libx264 -pix_fmt yuv420p -profile:v baseline -level 3.0 \
  -movflags +faststart -crf 23 -preset medium \
  "$out"

echo "Done: demo/videos/$out"
