/*!
 * Hardcore Games — icono "Game Pass" en la fila de accesos rápidos de la home
 *
 * Mismo patrón que rewards-widget.js / rewards-nav-button.js / sorteos-widget.js:
 * el frontend principal es un bundle ya compilado sin código fuente disponible,
 * así que este script NO lo toca — localiza el enlace que hoy dice
 * "Suscripciones" en la fila circular de accesos rápidos de la home
 * (Juegos / PSN / Xbox / FIFA / Suscripciones) y lo reescribe: texto
 * "Game Pass", ícono distinto, color diferencial en verde, y el link apunta a
 * /gamepassultimate en vez de /filters?types=3.
 *
 * El texto "Suscripciones" también aparece en el menú hamburguesa (link de
 * una sola línea, sin wrapper circular) y en una tarjeta del carrusel de
 * categorías (wrapper "rounded-2xl", no "rounded-full"). Ninguno de los dos
 * se toca: el selector exige el wrapper circular exacto de la fila de
 * accesos rápidos.
 *
 * Ese <a> lo maneja React Router (Link): solo cambiar el atributo href no
 * alcanza, porque el click sigue disparando el handler de React que navega
 * al destino original ("/filters?types=3"), no al href visible en el DOM.
 * Por eso el nodo se clona (cloneNode no copia las props internas de React:
 * __reactFiber$…/__reactProps$…) y se reemplaza por el clon ya editado —
 * así el click cae en la navegación normal del navegador hacia el nuevo
 * href. Verificado en producción: clic en el clon navega a /gamepassultimate.
 *
 * Solo en móvil (viewport < 768px, breakpoint "md" de Tailwind): la fila es
 * un carrusel horizontal ("overflow-x-auto") con "justify-content:center",
 * así que con los 5 íconos originales el navegador reparte el desborde a
 * ambos lados y "Game Pass" queda fuera de pantalla sin scroll manual — el
 * usuario nunca lo ve. Para resolverlo, en mobile además: se elimina el
 * ícono de FIFA y el clon de Game Pass se reinserta antes del de Xbox,
 * dejando el orden Juegos / PSN / Game Pass / Xbox — así queda visible sin
 * scroll. En desktop no hace falta (los 5 íconos entran en el ancho
 * disponible) y se deja el orden original con Game Pass al final.
 */
(function () {
  "use strict";

  var NEW_HREF = "/gamepassultimate";
  var NEW_LABEL = "Game Pass";
  var ORIGINAL_LABEL = "Suscripciones";
  var DONE_ATTR = "data-hc-gamepass-icon-done";
  var STYLE_ID = "hc-gamepass-icon-style";
  var ICON_CLASS = "hc-gamepass-icon-circle";
  var MOBILE_BREAKPOINT = 768;
  var FIFA_LABEL = "FIFA";
  var XBOX_LABEL = "Xbox";

  var INFINITY_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" ' +
    'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
    'stroke-linejoin="round" class="lucide lucide-infinity w-8 h-8" style="color:#fff">' +
    '<path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.2-8-5.096 0-5.096 8 0 8 5.067 0 7.105-8 12.2-8z"></path>' +
    "</svg>";

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      "." + ICON_CLASS + "{",
      "background:linear-gradient(135deg,hsl(145,65%,42%),hsl(145,75%,55%))!important;",
      "animation:hc-gamepass-pulse 2.2s ease-in-out infinite;",
      "}",
      "@keyframes hc-gamepass-pulse{",
      "0%,100%{box-shadow:0 0 0 0 hsla(145,70%,50%,.55)}",
      "50%{box-shadow:0 0 0 8px hsla(145,70%,50%,0)}",
      "}",
    ].join("");
    document.head.appendChild(style);
  }

  // Selector angosto a propósito: primero filtra por el wrapper circular
  // ".rounded-full" (solo lo tienen los 5 íconos de accesos rápidos), y
  // recién ahí valida el texto del <span> hermano. Evita recorrer todos los
  // <a> de la página (product grids pueden tener cientos).
  function findTarget() {
    var wraps = document.querySelectorAll("a > div > div.rounded-full");
    for (var i = 0; i < wraps.length; i++) {
      var iconWrap = wraps[i];
      var container = iconWrap.parentNode;
      var a = container ? container.parentNode : null;
      if (!a || a.tagName !== "A" || a.getAttribute(DONE_ATTR)) continue;
      var label = container.querySelector(":scope > span");
      if (label && label.textContent.trim() === ORIGINAL_LABEL) {
        return { a: a, container: container };
      }
    }
    return null;
  }

  function alreadyDone() {
    return document.querySelector("a[" + DONE_ATTR + "]") !== null;
  }

  // Busca, entre los hijos directos de la fila, el <a> cuyo <span> tiene
  // exactamente ese texto. Solo se usa dentro de la misma fila de accesos
  // rápidos (ya acotada por findTarget), así que no hace falta el filtro
  // por wrapper "rounded-full" que sí necesita findTarget.
  function findRowSiblingByLabel(row, text) {
    var children = row.children;
    for (var i = 0; i < children.length; i++) {
      var el = children[i];
      if (el.tagName !== "A") continue;
      var span = el.querySelector(":scope > div > span");
      if (span && span.textContent.trim() === text) return el;
    }
    return null;
  }

  // Reordena la fila para que "Game Pass" quede visible sin scroll en
  // mobile: saca a FIFA y reinserta el ícono de Game Pass justo antes del
  // de Xbox, dejando Juegos / PSN / Game Pass / Xbox. Si alguno de los dos
  // no aparece (cambio futuro en el nav), no hace nada — nunca lanza.
  function reorderForMobile(row, gamePassEl) {
    var fifa = findRowSiblingByLabel(row, FIFA_LABEL);
    if (fifa) fifa.remove();
    var xbox = findRowSiblingByLabel(row, XBOX_LABEL);
    if (xbox) row.insertBefore(gamePassEl, xbox);
  }

  function process() {
    var target = findTarget();
    if (!target) return;
    injectStyles();

    var row = target.a.parentNode;

    var clone = target.a.cloneNode(true);
    clone.setAttribute(DONE_ATTR, "1");
    clone.setAttribute("href", NEW_HREF);

    var iconWrap = clone.querySelector(":scope > div > div.rounded-full");
    var label = clone.querySelector(":scope > div > span");
    if (iconWrap) {
      iconWrap.classList.add(ICON_CLASS);
      iconWrap.innerHTML = INFINITY_SVG;
    }
    if (label) {
      label.textContent = NEW_LABEL;
      label.style.fontWeight = "700";
    }

    clone.addEventListener("click", function () {
      if (typeof window.gtag === "function") {
        window.gtag("event", "gamepass_button_click", {
          event_category: "engagement",
          event_label: "home_quick_access",
        });
      }
      if (typeof window.fbq === "function") {
        window.fbq("trackCustom", "GamePassButtonClick", {
          content_name: "home_quick_access",
        });
      }
    });

    target.a.replaceWith(clone);

    if (row && window.innerWidth < MOBILE_BREAKPOINT) {
      reorderForMobile(row, clone);
    }
  }

  // El ícono solo existe en la home: en otras rutas no hay nada que
  // parchar, así que los reintentos se agotan sin encontrar nada (mismo
  // trade-off que rewards-nav-button.js).
  var MAX_ATTEMPTS = 37;
  var RETRY_MS = 400;

  function init() {
    var attempts = 0;
    var timer = setInterval(function () {
      attempts++;
      process();
      if (alreadyDone() || attempts >= MAX_ATTEMPTS) clearInterval(timer);
    }, RETRY_MS);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Igual que el fix de rewards-nav-button.js: el bundle es una SPA, así que
  // navegar dentro del sitio (o volver con "atrás") no recarga la página.
  // Si el usuario sale de la home y vuelve, React vuelve a montar esta fila
  // desde cero con el <a> original ("Suscripciones"), sin que "pageshow" ni
  // "visibilitychange" se disparen. Un MutationObserver detecta ese
  // remount y vuelve a aplicar el parche. process() ya es seguro de repetir.
  var scheduled = false;
  function scheduleProcess() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(function () {
      scheduled = false;
      if (!alreadyDone()) process();
    }, 150);
  }

  // El observer escucha toda mutación del body (necesario: no hay forma de
  // acotarlo a la fila de accesos rápidos, que React puede desmontar y
  // remontar entero). Sin este throttle, cada mutación -aunque sea en el
  // carrito o en un filtro sin relación- dispara un querySelector síncrono;
  // en una SPA con re-renders frecuentes eso compite con el hilo principal
  // justo cuando el usuario interactúa (empeora INP en Core Web Vitals).
  // rAF agrupa todas las mutaciones de un mismo frame en una sola
  // verificación en vez de una por mutación.
  var checkQueued = false;
  function queueCheck() {
    if (checkQueued) return;
    checkQueued = true;
    requestAnimationFrame(function () {
      checkQueued = false;
      if (!alreadyDone()) scheduleProcess();
    });
  }

  function startObserving() {
    new MutationObserver(queueCheck).observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  if (document.body) {
    startObserving();
  } else {
    document.addEventListener("DOMContentLoaded", startObserving);
  }

  window.addEventListener("pageshow", function (event) {
    if (event.persisted) process();
  });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") process();
  });
})();
