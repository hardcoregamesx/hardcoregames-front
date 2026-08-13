/*!
 * Hardcore Sorteos — widget flotante
 *
 * Mismo patron que rewards-widget.js: el frontend principal es un bundle ya
 * compilado sin codigo fuente disponible, asi que este script NO lo toca —
 * se inyecta desde afuera como un elemento flotante independiente. Reutiliza
 * el mismo contenedor fijo (#hc-rewards-widget) para que se apile ordenado
 * junto a la pastilla de puntos y la insignia de cupon si tambien estan.
 */
(function () {
  "use strict";

  var API_BASE = "https://api.hardcoregames.co";
  var TOKEN_KEY = "jwt_token";
  var HIDDEN_PATH_PREFIXES = ["/rewards", "/checkout", "/auth"];
  var CONTAINER_ID = "hc-rewards-widget";
  var PILL_ID = "hc-sorteos-pill";

  function shouldSkipPath() {
    var path = window.location.pathname || "/";
    return HIDDEN_PATH_PREFIXES.some(function (p) {
      return path.indexOf(p) === 0;
    });
  }

  function getContainer() {
    var el = document.getElementById(CONTAINER_ID);
    if (!el) {
      el = document.createElement("div");
      el.id = CONTAINER_ID;
      el.setAttribute(
        "style",
        [
          "position:fixed",
          "right:16px",
          "bottom:16px",
          "z-index:9999",
          "display:flex",
          "flex-direction:column",
          "align-items:flex-end",
          "gap:10px",
        ].join(";")
      );
      document.body.appendChild(el);
    }
    return el;
  }

  function pillBaseStyle() {
    return [
      "display:flex",
      "align-items:center",
      "gap:6px",
      "font-family:'Segoe UI',system-ui,-apple-system,sans-serif",
      "font-weight:700",
      "font-size:14px",
      "padding:10px 14px",
      "border-radius:999px",
      "box-shadow:0 4px 16px rgba(0,0,0,0.35)",
      "cursor:pointer",
      "user-select:none",
      "white-space:nowrap",
    ].join(";");
  }

  function renderPill(text, href, background, color) {
    var existing = document.getElementById(PILL_ID);
    if (existing) existing.remove();

    var pill = document.createElement("div");
    pill.id = PILL_ID;
    pill.setAttribute("style", pillBaseStyle() + ";background:" + background + ";color:" + color + ";");
    pill.textContent = text;
    pill.addEventListener("click", function () {
      window.location.href = href;
    });

    getContainer().appendChild(pill);
  }

  function fetchJson(path, useAuth) {
    var headers = {};
    if (useAuth) {
      var token = localStorage.getItem(TOKEN_KEY);
      headers.Authorization = "Bearer " + token;
    }
    // La API no manda Cache-Control: sin esto WebKit puede servir la
    // respuesta cacheada de una carga anterior (mismo motivo que en
    // rewards-widget.js).
    return fetch(API_BASE + path, { headers: headers, cache: "no-store" })
      .then(function (res) {
        return res.ok ? res.json() : null;
      })
      .catch(function () {
        // Silencioso: el widget es un extra, nunca debe romper la tienda.
        return null;
      });
  }

  function labelFor(item) {
    if (item.qualified) return "🎁 ¡Ya estás participando!";
    var parts = [];
    if (item.min_purchases != null) {
      parts.push(item.purchases_count + "/" + item.min_purchases + " compras");
    }
    if (item.min_amount != null) {
      parts.push(
        "$" + Number(item.amount_sum || 0).toLocaleString("es-CO") +
        "/$" + Number(item.min_amount).toLocaleString("es-CO")
      );
    }
    return "🎁 " + (parts.join(" · ") || "Sorteo activo");
  }

  function initLoggedIn() {
    fetchJson("/sorteos/mine/widget", true).then(function (data) {
      var items = data && data.data;
      if (!items || !items.length) return;

      if (items.length === 1) {
        renderPill(labelFor(items[0]), "/rewards/?view=sorteos&id=" + items[0].id, "hsl(262,50%,20%)", "#fff");
      } else {
        var qualifiedCount = items.filter(function (i) {
          return i.qualified;
        }).length;
        var text =
          qualifiedCount > 0
            ? "🎁 Participando en " + qualifiedCount + "/" + items.length + " sorteos"
            : "🎁 " + items.length + " sorteos activos";
        renderPill(text, "/rewards/?view=sorteos", "hsl(262,50%,20%)", "#fff");
      }
    });
  }

  function initLoggedOut() {
    // Sin token no se puede pedir progreso personal, pero /sorteos/active es
    // publico: solo se invita a registrarse si de verdad hay algo activo.
    fetchJson("/sorteos/active", false).then(function (data) {
      var items = data && data.data;
      if (!items || !items.length) return;
      renderPill(
        "🎁 Regístrate para participar en sorteos",
        "/auth?redirect=" + encodeURIComponent("/rewards/?view=sorteos"),
        "hsl(48,95%,60%)",
        "hsl(262,60%,10%)"
      );
    });
  }

  function init() {
    if (shouldSkipPath()) return;
    if (localStorage.getItem(TOKEN_KEY)) {
      initLoggedIn();
    } else {
      initLoggedOut();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Mismo motivo que rewards-widget.js: bfcache en navegacion "atras" no
  // vuelve a ejecutar el script, y Chrome iOS (WKWebView) no siempre dispara
  // pageshow/persisted de forma confiable, asi que visibilitychange cubre
  // ambos casos. Ambas funciones ya son seguras de repetir.
  window.addEventListener("pageshow", function (event) {
    if (event.persisted) init();
  });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") init();
  });
})();
