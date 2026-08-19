// Genera sitemap.xml consultando la API publica de productos, para que el
// sitemap (y por tanto el prerender de scripts/prerender.mjs, que lo lee)
// cubra SIEMPRE el catalogo completo y no una foto vieja. Sin argumentos
// escribe a stdout; con un argumento escribe a ese archivo.
//
//   node scripts/generate-sitemap.mjs [salida.xml]
//
// Aborta (exit 1) si la API devuelve menos de MIN_PRODUCTS productos, para
// que un fallo de la API nunca publique un sitemap casi vacio.

import { writeFileSync } from "fs";

const API_URL =
  process.env.SITEMAP_API_URL ||
  "https://api.hardcoregames.co/products/filter?limit=1000";
const BASE = process.env.SITEMAP_BASE_URL || "https://www.hardcoregames.co";
const MIN_PRODUCTS = Number(process.env.SITEMAP_MIN_PRODUCTS || 200);

const STATIC_ROUTES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/filters", changefreq: "hourly", priority: "0.9" },
  { path: "/week-offers", changefreq: "daily", priority: "0.9" },
  { path: "/new-releases", changefreq: "daily", priority: "0.8" },
  { path: "/destacados", changefreq: "daily", priority: "0.8" },
  { path: "/most-sold", changefreq: "daily", priority: "0.8" },
  // Landings estaticas propias (carpeta fisica con su index.html, no rutas
  // del SPA): no tenian entrada aqui y por tanto nunca las descubria el
  // crawler via sitemap (GSC 18/08/2026).
  { path: "/fc27", changefreq: "weekly", priority: "0.8" },
  { path: "/gamepassultimate", changefreq: "weekly", priority: "0.8" },
  { path: "/psplus", changefreq: "weekly", priority: "0.8" },
  { path: "/grandtheftautovi", changefreq: "weekly", priority: "0.8" },
];

function urlTag({ loc, lastmod, changefreq, priority }) {
  return (
    "  <url>" +
    `<loc>${loc}</loc>` +
    (lastmod ? `<lastmod>${lastmod}</lastmod>` : "") +
    (changefreq ? `<changefreq>${changefreq}</changefreq>` : "") +
    (priority ? `<priority>${priority}</priority>` : "") +
    "</url>"
  );
}

const res = await fetch(API_URL);
if (!res.ok) {
  console.error(`API respondio ${res.status} en ${API_URL}`);
  process.exit(1);
}
const body = await res.json();
const products = Array.isArray(body?.data) ? body.data : [];

const seen = new Set();
const productUrls = [];
for (const p of products) {
  const id = p?.id_product;
  if (!Number.isInteger(id) || seen.has(id)) continue;
  seen.add(id);
  const lastmod = p.date_last_modified || p.date_register || null;
  productUrls.push({
    id,
    loc: `${BASE}/product/${id}`,
    lastmod,
    changefreq: "weekly",
    priority: "0.7",
  });
}
productUrls.sort((a, b) => a.id - b.id);

if (productUrls.length < MIN_PRODUCTS) {
  console.error(
    `Solo ${productUrls.length} productos (< ${MIN_PRODUCTS}); no se genera sitemap.`
  );
  process.exit(1);
}

const lines = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...STATIC_ROUTES.map((r) => urlTag({ ...r, loc: BASE + r.path })),
  ...productUrls.map(urlTag),
  "</urlset>",
  "",
];
const xml = lines.join("\n");

const outFile = process.argv[2];
if (outFile) {
  writeFileSync(outFile, xml, "utf8");
  console.error(
    `Sitemap con ${STATIC_ROUTES.length + productUrls.length} URLs -> ${outFile}`
  );
} else {
  process.stdout.write(xml);
}
