/*!
 * Hardcore Rewards — widget flotante
 *
 * Igual que meta-pixel-tracking.js: el frontend es un bundle ya compilado
 * sin código fuente disponible, así que este script NO toca el bundle —
 * solo se inyecta desde afuera como un elemento flotante independiente.
 *
 * Fase actual (solo ruleta): muestra los puntos del usuario y enlaza a
 * /rewards/. Cuando existan sorteos/misiones, la jerarquía de prioridad de
 * qué mostrar se decide aquí mismo, sin tocar el bundle.
 */
(function () {
  "use strict";

  var API_BASE = "https://api.hardcoregames.co";
  var TOKEN_KEY = "jwt_token";
  var DISMISS_KEY = "rewards_widget_dismiss_until";
  var DISMISS_DAYS = 7;
  var HIDDEN_PATH_PREFIXES = ["/rewards", "/checkout"];

  function shouldSkipPath() {
    var path = window.location.pathname || "/";
    return HIDDEN_PATH_PREFIXES.some(function (p) {
      return path.indexOf(p) === 0;
    });
  }

  function isDismissed() {
    var until = localStorage.getItem(DISMISS_KEY);
    if (!until) return false;
    return Date.now() < parseInt(until, 10);
  }

  function dismiss() {
    var until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, String(until));
    var el = document.getElementById("hc-rewards-widget");
    if (el) el.remove();
  }

  function render(points) {
    var pill = document.createElement("div");
    pill.id = "hc-rewards-widget";
    pill.setAttribute(
      "style",
      [
        "position:fixed",
        "right:16px",
        "bottom:16px",
        "z-index:9999",
        "display:flex",
        "align-items:center",
        "gap:6px",
        "background:linear-gradient(90deg,#a78bfa,#f472b6)",
        "color:#fff",
        "font-family:'Segoe UI',system-ui,-apple-system,sans-serif",
        "font-weight:700",
        "font-size:14px",
        "padding:10px 14px",
        "border-radius:999px",
        "box-shadow:0 4px 16px rgba(0,0,0,0.35)",
        "cursor:pointer",
        "user-select:none",
      ].join(";")
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
      dismiss();
    });
    pill.appendChild(closeBtn);

    pill.addEventListener("click", function () {
      window.location.href = "/rewards/";
    });

    document.body.appendChild(pill);
  }

  function init() {
    if (shouldSkipPath() || isDismissed()) return;

    var token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    fetch(API_BASE + "/rewards/roulette", {
      headers: { Authorization: "Bearer " + token },
    })
      .then(function (res) {
        if (!res.ok) return null;
        return res.json();
      })
      .then(function (data) {
        if (data && typeof data.user_points === "number") {
          render(data.user_points);
        }
      })
      .catch(function () {
        // Silencioso: el widget es un extra, nunca debe romper la tienda.
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
