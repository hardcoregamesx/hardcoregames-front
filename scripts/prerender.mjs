// Genera snapshots HTML estaticos de las 256 URLs de sitemap.xml visitando
// la produccion real con un navegador headless. Se usan para servirselos a
// bots (Googlebot, Bingbot, facebookexternalhit, etc) via nginx, sin tocar
// lo que ve un usuario real. No requiere el codigo fuente de React.
import { chromium } from "playwright";
import { readFileSync, mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";

const BASE_URL = process.env.PRERENDER_BASE_URL || "https://www.hardcoregames.co";
const SITEMAP_PATH = process.env.PRERENDER_SITEMAP || "sitemap.xml";
const OUT_DIR = process.env.PRERENDER_OUT || "prerender";
const CONCURRENCY = Number(process.env.PRERENDER_CONCURRENCY || 4);

function urlsFromSitemap(xml) {
  const matches = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)];
  return matches.map((m) => m[1].trim());
}

function outFileFor(pathname) {
  if (pathname === "/" || pathname === "") {
    return join(OUT_DIR, "index.html");
  }
  const clean = pathname.replace(/^\/+/, "").replace(/\/+$/, "");
  return join(OUT_DIR, `${clean}.html`);
}

async function renderOne(browser, url, i, total) {
  const pathname = new URL(url).pathname;
  const outFile = outFileFor(pathname);
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (compatible; HardcoreGamesPrerenderer/1.0; +https://www.hardcoregames.co)",
  });
  const page = await context.newPage();
  const isProduct = /^\/product\/\d+\/?$/.test(pathname);
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    try {
      await page.waitForFunction(
        (checkHeading) => {
          const main = document.querySelector("main");
          if (!main) return false;
          const hasContent = main.innerText.trim().length > 40;
          if (!checkHeading) return hasContent;
          // El heading real reemplaza al esqueleto "Cargando producto...".
          // seo-meta.js usa esta misma señal para reintentar su propio
          // poll (cada 250ms); esperamos el dato real en el DOM antes de
          // capturar, en vez de fiarnos de document.title (que puede seguir
          // en su valor por defecto si el poll de seo-meta.js aun no corrio).
          const heading = main.querySelector("h1, h2");
          const headingText =
            heading && heading.textContent ? heading.textContent.trim() : "";
          const hasRealHeading =
            headingText.length > 0 && !/^cargando/i.test(headingText);
          return hasContent && hasRealHeading;
        },
        isProduct,
        { timeout: 15000 }
      );
      if (isProduct) {
        // margen para que el poll de seo-meta.js (250ms) aplique el heading
        // real a title/meta/JSON-LD despues de que aparecio en el DOM.
        await page.waitForTimeout(500);
      }
    } catch {
      // seguimos igual: mejor un snapshot parcial que ninguno
    }
    await page.waitForTimeout(300);
    const html = await page.content();
    mkdirSync(dirname(outFile), { recursive: true });
    writeFileSync(outFile, html, "utf8");
    console.log(`[${i + 1}/${total}] OK   ${pathname} -> ${outFile}`);
  } catch (err) {
    console.error(`[${i + 1}/${total}] FAIL ${pathname}: ${err.message}`);
  } finally {
    await context.close();
  }
}

async function main() {
  const xml = readFileSync(SITEMAP_PATH, "utf8");
  const urls = urlsFromSitemap(xml);
  if (urls.length === 0) {
    console.error(`No se encontraron <loc> en ${SITEMAP_PATH}`);
    process.exit(1);
  }
  console.log(`Renderizando ${urls.length} URLs desde ${BASE_URL} (concurrencia ${CONCURRENCY})`);

  const browser = await chromium.launch();
  let cursor = 0;
  async function worker() {
    while (cursor < urls.length) {
      const idx = cursor++;
      await renderOne(browser, urls[idx], idx, urls.length);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  await browser.close();
  console.log("Listo.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
