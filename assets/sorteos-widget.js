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
  // Compartidas con rewards-widget.js: ambos widgets se apilan en el mismo
  // contenedor (#hc-rewards-widget), asi que la posicion y el estado de
  // colapsado deben ser una sola fuente de verdad para los dos.
  var POS_KEY = "hc_widget_pos";
  var COLLAPSED_KEY = "hc_widget_collapsed";

  function shouldSkipPath() {
    var path = window.location.pathname || "/";
    return HIDDEN_PATH_PREFIXES.some(function (p) {
      return path.indexOf(p) === 0;
    });
  }

  // -------------------------------------------------------------------- //
  // Arrastrar y colapsar (pestaña expandible) — igual que rewards-widget.js
  // -------------------------------------------------------------------- //

  function applyStoredPosition(el) {
    try {
      var raw = localStorage.getItem(POS_KEY);
      if (!raw) return;
      var pos = JSON.parse(raw);
      if (typeof pos.right === "number" && typeof pos.bottom === "number") {
        el.style.right = pos.right + "px";
        el.style.bottom = pos.bottom + "px";
      }
    } catch (e) {}
  }

  function savePosition(right, bottom) {
    try {
      localStorage.setItem(POS_KEY, JSON.stringify({ right: right, bottom: bottom }));
    } catch (e) {}
  }

  function isCollapsed() {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  }

  function setCollapsed(el, collapsed) {
    try {
      localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch (e) {}
    Array.prototype.forEach.call(el.children, function (child) {
      if (child.id !== "hc-widget-handle") {
        child.style.display = collapsed ? "none" : "";
      }
    });
    var arrow = document.getElementById("hc-widget-handle-arrow");
    if (arrow) arrow.textContent = collapsed ? "❮" : "❯";
  }

  function makeDraggable(handle, container) {
    var dragging = false;
    var moved = false;
    var startX, startY, startRight, startBottom;

    function clientXY(e) {
      if (e.touches && e.touches.length) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
      return { x: e.clientX, y: e.clientY };
    }

    function onDown(e) {
      dragging = true;
      moved = false;
      var p = clientXY(e);
      startX = p.x;
      startY = p.y;
      var rect = container.getBoundingClientRect();
      startRight = window.innerWidth - rect.right;
      startBottom = window.innerHeight - rect.bottom;
      e.preventDefault();
    }

    function onMove(e) {
      if (!dragging) return;
      var p = clientXY(e);
      var dx = p.x - startX;
      var dy = p.y - startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
      var maxRight = Math.max(window.innerWidth - 48, 0);
      var maxBottom = Math.max(window.innerHeight - 48, 0);
      var newRight = Math.min(Math.max(startRight - dx, 0), maxRight);
      var newBottom = Math.min(Math.max(startBottom - dy, 0), maxBottom);
      container.style.right = newRight + "px";
      container.style.bottom = newBottom + "px";
    }

    function onUp() {
      if (!dragging) return;
      dragging = false;
      if (moved) {
        var rect = container.getBoundingClientRect();
        savePosition(window.innerWidth - rect.right, window.innerHeight - rect.bottom);
      } else {
        setCollapsed(container, !isCollapsed());
      }
    }

    handle.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    handle.addEventListener("touchstart", onDown, { passive: false });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
  }

  function initDragAndCollapse(el) {
    if (el.getAttribute("data-hc-drag-init")) return;
    el.setAttribute("data-hc-drag-init", "1");

    applyStoredPosition(el);

    var handle = document.createElement("div");
    handle.id = "hc-widget-handle";
    handle.title = "Arrastra para mover · toca para ocultar/mostrar";
    handle.setAttribute(
      "style",
      [
        "width:28px",
        "height:28px",
        "border-radius:50%",
        "background:rgba(20,10,35,0.75)",
        "color:#fff",
        "display:flex",
        "align-items:center",
        "justify-content:center",
        "font-size:12px",
        "cursor:grab",
        "user-select:none",
        "touch-action:none",
        "align-self:flex-end",
        "box-shadow:0 2px 10px rgba(0,0,0,0.4)",
      ].join(";")
    );
    var arrow = document.createElement("span");
    arrow.id = "hc-widget-handle-arrow";
    arrow.textContent = "❯";
    handle.appendChild(arrow);
    el.insertBefore(handle, el.firstChild);
    makeDraggable(handle, el);

    if (isCollapsed()) setCollapsed(el, true);
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
    initDragAndCollapse(el);
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
    // rewards-widget.js). `cache:"no-store"` solo no basta por bugs
    // conocidos de WebKit; el query param con timestamp fuerza una URL
    // distinta en cada llamada, que ningún cache puede confundir con la
    // anterior.
    var bustedPath = path + (path.indexOf("?") === -1 ? "?" : "&") + "_=" + Date.now();
    return fetch(API_BASE + bustedPath, { headers: headers, cache: "no-store" })
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

      var qualifiedCount = items.filter(function (i) {
        return i.qualified;
      }).length;
      // Verde de marca (--accent) cuando ya participa en algo, morado
      // neutro (--secondary) cuando todavía no: la pastilla debe reflejar
      // el estado de un vistazo, sin tener que leer el texto.
      var background = qualifiedCount > 0 ? "hsl(145,65%,55%)" : "hsl(262,50%,20%)";
      var color = qualifiedCount > 0 ? "hsl(262,60%,10%)" : "#fff";

      if (items.length === 1) {
        renderPill(labelFor(items[0]), "/rewards/?view=sorteos&id=" + items[0].id, background, color);
      } else {
        var text =
          qualifiedCount > 0
            ? "🎁 Participando en " + qualifiedCount + "/" + items.length + " sorteos"
            : "🎁 " + items.length + " sorteos activos";
        renderPill(text, "/rewards/?view=sorteos", background, color);
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
