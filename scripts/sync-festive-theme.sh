#!/bin/sh
# Copia el tema festivo (fuente: frontend-v2/public/festive-theme.js) a cada landing.
SRC="${1:-../frontend-v2/public/festive-theme.js}"
for d in fc27 psplus gamepassultimate grandtheftautovi fisicos politica-tratamiento-datos rewards; do
  cp "$SRC" "$(dirname "$0")/../$d/festive-theme.js"
done
