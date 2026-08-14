/*!
 * Hardcore Rewards — botón "Rewards" en el menú superior
 *
 * Mismo patrón que rewards-widget.js y sorteos-widget.js: el frontend
 * principal es un bundle ya compilado sin código fuente disponible, así que
 * este script NO lo toca — inserta el botón desde afuera, justo después del
 * link "Ofertas de la semana" del menú horizontal de escritorio (el mismo
 * que aparece en el dashboard), y enlaza a /rewards/.
 *
 * No se toca el link "Ofertas de la semana" del carrusel de la home (esa
 * tarjeta usa el mismo href pero no es parte de la navegación), asi que solo
 * se procesan enlaces de puro texto (sin hijos) para no engancharse ahi.
 */
(function () {
  "use strict";

  var TARGET_HREF = "/week-offers";
  var TARGET_TEXT = "Ofertas de la semana";
  var REWARDS_URL = "/rewards/";
  var DONE_ATTR = "data-hc-rewards-nav-done";
  var STYLE_ID = "hc-rewards-nav-style";

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      ".hc-rewards-nav-btn{",
      "position:relative;display:inline-flex;align-items:center;gap:6px;",
      "padding:6px 16px;border-radius:999px;",
      "background:linear-gradient(90deg,hsl(48,95%,60%),hsl(145,65%,55%),hsl(48,95%,60%));",
      "background-size:200% 100%;color:hsl(262,60%,10%);",
      "font-weight:800;text-decoration:none;white-space:nowrap;",
      "font-family:inherit;font-size:inherit;line-height:1.4;",
      "animation:hc-rewards-shine 3s linear infinite,hc-rewards-pulse 2.2s ease-in-out infinite;",
      "}",
      ".hc-rewards-nav-btn:hover{filter:brightness(1.08);}",
      "@keyframes hc-rewards-shine{0%{background-position:0% 50%}100%{background-position:200% 50%}}",
      "@keyframes hc-rewards-pulse{",
      "0%,100%{box-shadow:0 0 0 0 hsla(48,95%,60%,.55)}",
      "50%{box-shadow:0 0 0 6px hsla(48,95%,60%,0)}",
      "}",
    ].join("");
    document.head.appendChild(style);
  }

  function isPlainNavLink(a) {
    return (
      a.getAttribute("href") === TARGET_HREF &&
      a.textContent.replace(/\s+/g, " ").trim() === TARGET_TEXT &&
      a.children.length === 0
    );
  }

  function makeButton() {
    var a = document.createElement("a");
    a.className = "hc-rewards-nav-btn";
    a.href = REWARDS_URL;
    a.textContent = "🎁 Premios";
    return a;
  }

  function process() {
    var links = document.querySelectorAll('a[href="' + TARGET_HREF + '"]');
    Array.prototype.forEach.call(links, function (a) {
      if (!isPlainNavLink(a)) return;
      if (a.getAttribute(DONE_ATTR)) return;
      a.setAttribute(DONE_ATTR, "1");
      var btn = makeButton();
      if (a.parentNode) {
        a.parentNode.insertBefore(btn, a.nextSibling);
      }
    });
  }

  // El nav lo renderiza React del lado del cliente: en DOMContentLoaded
  // "#root" todavía puede estar vacío, así que un solo intento no basta.
  // Reintenta cada 400ms hasta encontrar el link (se detiene apenas lo
  // procesa) o hasta 15s (~37 intentos) para no quedar corriendo si algún
  // día cambia el nav y el link deja de existir.
  var MAX_ATTEMPTS = 37;
  var RETRY_MS = 400;

  function init() {
    injectStyles();
    var attempts = 0;
    var timer = setInterval(function () {
      attempts++;
      process();
      if (document.querySelector(".hc-rewards-nav-btn") || attempts >= MAX_ATTEMPTS) {
        clearInterval(timer);
      }
    }, RETRY_MS);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Mismo motivo que rewards-widget.js / sorteos-widget.js: bfcache en
  // navegación "atrás" no siempre re-ejecuta el script, y Chrome iOS
  // (WKWebView) no dispara pageshow/persisted de forma confiable. process()
  // ya es seguro de repetir (marca cada link procesado con DONE_ATTR).
  window.addEventListener("pageshow", function (event) {
    if (event.persisted) process();
  });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") process();
  });
})();
