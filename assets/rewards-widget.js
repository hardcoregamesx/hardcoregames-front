/*!
 * Hardcore Rewards — widget flotante
 *
 * Igual que meta-pixel-tracking.js: el frontend es un bundle ya compilado
 * sin código fuente disponible, así que este script NO toca el bundle —
 * solo se inyecta desde afuera como elementos flotantes independientes.
 *
 * Dos piezas, cada una independiente de la otra:
 *   1. Pastilla de puntos (⭐) — enlaza a /rewards/.
 *   2. Insignia de cupón con cuenta regresiva — cuando el usuario tiene un
 *      cupón de la ruleta con límite de tiempo activo, se muestra y además
 *      se aplica automáticamente en la tienda sin que el usuario lo escriba.
 */
(function () {
  "use strict";

  var API_BASE = "https://api.hardcoregames.co";
  var TOKEN_KEY = "jwt_token";
  var DISMISS_KEY = "rewards_widget_dismiss_until";
  var DISMISS_DAYS = 7;
  // Misma llave que usa el bundle principal (CouponProvider / "nf" en el
  // minificado) para guardar el cupón activo en localStorage.
  var GLOBAL_COUPON_KEY = "global_coupon_code";
  var HIDDEN_PATH_PREFIXES = ["/rewards", "/checkout", "/auth"];
  var CONTAINER_ID = "hc-rewards-widget";

  function shouldSkipPath() {
    var path = window.location.pathname || "/";
    return HIDDEN_PATH_PREFIXES.some(function (p) {
      return path.indexOf(p) === 0;
    });
  }

  function isPointsDismissed() {
    var until = localStorage.getItem(DISMISS_KEY);
    if (!until) return false;
    return Date.now() < parseInt(until, 10);
  }

  function dismissPoints() {
    var until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, String(until));
    var el = document.getElementById("hc-rewards-points-pill");
    if (el) el.remove();
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

  // -------------------------------------------------------------------- //
  // Pastilla de puntos
  // -------------------------------------------------------------------- //

  function renderPointsPill(points) {
    if (isPointsDismissed()) return;

    var existing = document.getElementById("hc-rewards-points-pill");
    if (existing) {
      var existingLabel = existing.querySelector("span");
      if (existingLabel) existingLabel.textContent = "⭐ " + points;
      return;
    }

    var pill = document.createElement("div");
    pill.id = "hc-rewards-points-pill";
    pill.setAttribute(
      "style",
      pillBaseStyle() + ";background:linear-gradient(90deg,#a78bfa,#f472b6);color:#fff;"
    );

    var label = document.createElement("span");
    label.textContent = "⭐ " + points;
    pill.appendChild(label);

    var closeBtn = document.createElement("span");
    closeBtn.textContent = "×";
    closeBtn.setAttribute(
      "style",
      "margin-left:4px;opacity:0.85;font-weight:400;font-size:16px;line-height:1;padding:0 2px;"
    );
    closeBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      dismissPoints();
    });
    pill.appendChild(closeBtn);

    pill.addEventListener("click", function () {
      window.location.href = "/rewards/";
    });

    getContainer().appendChild(pill);
  }

  // -------------------------------------------------------------------- //
  // Insignia de cupón con cuenta regresiva
  // -------------------------------------------------------------------- //

  function formatCountdown(ms) {
    if (ms <= 0) return "0:00";
    var totalSeconds = Math.floor(ms / 1000);
    var h = Math.floor(totalSeconds / 3600);
    var m = Math.floor((totalSeconds % 3600) / 60);
    var s = totalSeconds % 60;
    var pad = function (n) {
      return n < 10 ? "0" + n : String(n);
    };
    if (h > 0) return h + ":" + pad(m) + ":" + pad(s);
    return m + ":" + pad(s);
  }

  function discountLabel(coupon) {
    if (coupon.discount_type === "PERCENTAGE") {
      return coupon.percentage_off + "% OFF";
    }
    return "$" + Number(coupon.fixed_amount || 0).toLocaleString("es-CO") + " OFF";
  }

  function renderCouponBadge(coupon) {
    var expiresAt = new Date(coupon.expiration_date).getTime();
    if (isNaN(expiresAt) || expiresAt <= Date.now()) return;
    if (document.getElementById("hc-rewards-coupon-badge")) return;

    var badge = document.createElement("div");
    badge.id = "hc-rewards-coupon-badge";
    badge.setAttribute(
      "style",
      pillBaseStyle() + ";background:hsl(48,95%,60%);color:hsl(262,60%,10%);"
    );
    badge.title =
      'Cupón "' + coupon.code + '" ya aplicado automáticamente. Úsalo antes de que expire.';

    var label = document.createElement("span");
    badge.appendChild(label);

    badge.addEventListener("click", function () {
      window.location.href = "/cart";
    });

    var intervalId;
    function tick() {
      var remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        clearInterval(intervalId);
        badge.remove();
        return;
      }
      var urgent = remaining < 5 * 60 * 1000;
      badge.style.background = urgent ? "hsl(0,84%,60%)" : "hsl(48,95%,60%)";
      badge.style.color = urgent ? "#fff" : "hsl(262,60%,10%)";
      label.textContent = "🎟️ " + discountLabel(coupon) + " · " + formatCountdown(remaining);
    }

    tick();
    intervalId = setInterval(tick, 1000);

    getContainer().appendChild(badge);
  }

  function applyCouponIfNeeded(coupon) {
    var targetPath = "/" + encodeURIComponent(coupon.code);

    // Ya estamos en medio de esa misma navegación (ver más abajo): no
    // reintentes o entras en loop de redirects.
    if (window.location.pathname === targetPath) return;

    var current = localStorage.getItem(GLOBAL_COUPON_KEY);
    if (current === coupon.code) return; // ya se aplicó en una carga anterior

    // El bundle principal (compilado, sin código fuente disponible) solo
    // marca un cupón como activo a nivel de su React context —no solo en
    // localStorage— cuando se navega a la ruta catch-all "/:couponCode",
    // la misma que usan los links de marketing tipo /cupondescuento. Tocar
    // localStorage desde afuera sin pasar por ahí no actualiza el
    // CouponProvider ya montado en la sesión actual, así que replicamos
    // exactamente esa navegación para que quede aplicado de una.
    window.location.replace(targetPath);
  }

  // -------------------------------------------------------------------- //
  // Carga de datos
  // -------------------------------------------------------------------- //

  function fetchJson(path) {
    var token = localStorage.getItem(TOKEN_KEY);
    if (!token) return Promise.resolve(null);
    // La API no manda Cache-Control, así que sin esto WebKit (Safari y
    // Chrome iOS, ambos sobre WKWebView) puede servir la respuesta vieja
    // del fetch anterior en vez de pedirla de nuevo, incluso después de
    // que pageshow dispare un refetch tras volver de /rewards/.
    return fetch(API_BASE + path, {
      headers: { Authorization: "Bearer " + token },
      cache: "no-store",
    })
      .then(function (res) {
        return res.ok ? res.json() : null;
      })
      .catch(function () {
        // Silencioso: el widget es un extra, nunca debe romper la tienda.
        return null;
      });
  }

  function initPoints() {
    fetchJson("/rewards/roulette").then(function (data) {
      if (data && typeof data.user_points === "number") {
        renderPointsPill(data.user_points);
      }
    });
  }

  function initCoupon() {
    fetchJson("/rewards/coupons/mine").then(function (data) {
      var coupons = data && data.data;
      if (!coupons || !coupons.length) return;
      // El backend ya los ordena por expiration_date ascendente: el primero
      // es el más urgente.
      var coupon = coupons[0];
      renderCouponBadge(coupon);
      applyCouponIfNeeded(coupon);
    });
  }

  function init() {
    if (shouldSkipPath()) return;
    if (!localStorage.getItem(TOKEN_KEY)) return;
    initPoints();
    initCoupon();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // En móvil (Safari/Chrome) volver con el botón "atrás" desde /rewards/
  // casi siempre restaura la página desde bfcache: no hay reload, así que
  // este script no se re-ejecuta y un cupón recién ganado nunca llega a
  // aplicarse ni a mostrar su cuenta regresiva. `pageshow` con
  // `event.persisted` detecta exactamente esa restauración y refresca.
  window.addEventListener("pageshow", function (event) {
    if (event.persisted) init();
  });

  // Chrome iOS corre sobre WKWebView, no sobre su propio motor, y ahí
  // `pageshow`/`persisted` no siempre se comporta igual que en Safari.
  // `visibilitychange` es más universal: se dispara cada vez que esta
  // pestaña vuelve a quedar visible, sin depender de cómo cada navegador
  // implemente su caché de navegación. Es barato y las funciones de abajo
  // ya son seguras de repetir (no duplican nodos ni relanzan el cupón).
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") init();
  });
})();
