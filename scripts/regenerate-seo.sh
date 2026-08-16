#!/bin/bash
# Regenera sitemap.xml + snapshots de prerender y los publica en
# /opt/hardcoregames/seo, que hc-frontend monta como bind-mounts de solo
# lectura (ver docker-compose.yml del repo de infraestructura). Corre por
# cron a diario; tambien se puede lanzar a mano.
#
# Publicacion SIN tocar inodes: los bind-mounts del contenedor apuntan al
# inode original de sitemap.xml y de prerender/. Por eso se publica con
# `rsync --delete` (dir) y `cat >` (archivo), nunca con mv/rm sobre los
# paths vivos — un mv dejaria al contenedor mirando el inode viejo.
set -euo pipefail

REPO=/root/frontend/www.hardcoregames.co
SEO_DIR=/opt/hardcoregames/seo
IMG=mcr.microsoft.com/playwright:v1.47.0-jammy   # misma version que devDependencies

mkdir -p "$SEO_DIR"
cd "$REPO"

echo "== regenerate-seo $(date -Is) =="

# 1) Sitemap nuevo, siempre a un archivo aparte (nunca sobre el vivo).
docker run --rm -v "$REPO":/work -v "$SEO_DIR":/seo -w /work "$IMG" \
  node scripts/generate-sitemap.mjs /seo/sitemap.next.xml

N=$(grep -c '<loc>' "$SEO_DIR/sitemap.next.xml")
if [ "$N" -lt 200 ]; then
  echo "ABORT: sitemap.next.xml solo tiene $N URLs (¿API caida?)" >&2
  exit 1
fi

# 2) Snapshots nuevos en un directorio aparte.
rm -rf "$SEO_DIR/prerender.next"
docker run --rm -v "$REPO":/work -v "$SEO_DIR":/seo -w /work \
  -e PRERENDER_SITEMAP=/seo/sitemap.next.xml \
  -e PRERENDER_OUT=/seo/prerender.next \
  "$IMG" node scripts/prerender.mjs

H=$(find "$SEO_DIR/prerender.next" -name '*.html' | wc -l)
MIN=$((N * 9 / 10))
if [ "$H" -lt "$MIN" ]; then
  echo "ABORT: solo $H snapshots de $N URLs (umbral $MIN); no se publica" >&2
  exit 1
fi

# 3) Publicar preservando los inodes montados.
mkdir -p "$SEO_DIR/prerender"
rsync -a --delete "$SEO_DIR/prerender.next/" "$SEO_DIR/prerender/"
cat "$SEO_DIR/sitemap.next.xml" > "$SEO_DIR/sitemap.xml"
rm -rf "$SEO_DIR/prerender.next" "$SEO_DIR/sitemap.next.xml"

echo "OK: $N URLs en sitemap, $H snapshots publicados"
