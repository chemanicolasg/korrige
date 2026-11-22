#!/usr/bin/env bash
# Copia los tutoriales renderizados a public/tutoriales/ en versión ligera para la web
# (H.264 1080p, ~2-4 MB por vídeo), con su póster y sus subtítulos.
#   bash video/publish-web.sh
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p public/tutoriales
for mp4 in video/build/out/*.mp4; do
  slug=$(basename "$mp4" .mp4)
  ffmpeg -v error -y -i "$mp4" -c:v libx264 -preset slow -crf 27 -tune stillimage -pix_fmt yuv420p \
    -c:a aac -b:a 96k -ac 1 -movflags +faststart "public/tutoriales/$slug.mp4"
  ffmpeg -v error -y -i "video/build/out/$slug.jpg" -vf scale=1280:-2 -q:v 4 "public/tutoriales/$slug.jpg"
  cp "video/build/out/$slug.vtt" "public/tutoriales/$slug.vtt"
  echo "✓ $slug $(du -h "public/tutoriales/$slug.mp4" | cut -f1)"
done
