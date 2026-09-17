/*!
 * Atribucion de origen (first-touch) — version standalone para landings del
 * frontend legacy (hardcoregames-front). Ver "De donde vienen los clientes"
 * (documento de handoff, 16/09/2026) y su contraparte real en
 * frontend-v2/src/lib/attribution.ts.
 *
 * Por que existe esto ademas del original: frontend-v2 solo captura el
 * first-touch en las paginas que sirve Next.js. Las landings que siguen en
 * el frontend legacy (como /fc27, via el router hclandings) no cargan ese
 * codigo — verificado el 17/09/2026 que la unica campana activa de Meta Ads
 * apunta justo a /fc27 con fbclid en la URL, y ese fbclid se perdia sin
 * dejar rastro porque esta pagina no escribia la cookie.
 *
 * Escribe EXACTAMENTE el mismo formato de cookie que frontend-v2 (mismo
 * nombre, mismos campos, mismo JSON) para que sea compatible cuando el
 * visitante navegue desde aqui hacia el resto del sitio (cart, filters,
 * checkout, todos en frontend-v2): captureFirstTouch() alla ve que la
 * cookie ya existe y no la pisa (write-once, first-touch real).
 */
(function () {
  "use strict";

  var COOKIE_NAME = "hc_first_touch";
  var COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 año

  function readCookie(name) {
    try {
      var match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
      return match ? decodeURIComponent(match[1]) : null;
    } catch (e) {
      return null;
    }
  }

  function writeCookie(name, value) {
    try {
      document.cookie = name + "=" + encodeURIComponent(value) + "; path=/; max-age=" + COOKIE_MAX_AGE_SECONDS + "; SameSite=Lax";
    } catch (e) {
      // storage bloqueado
    }
  }

  // Solo el dominio del referrer, nunca la URL completa — puede traer
  // parametros con datos personales (misma regla que frontend-v2).
  function referrerDomain() {
    try {
      if (!document.referrer) return "";
      return new URL(document.referrer).hostname.replace(/^www\./, "");
    } catch (e) {
      return "";
    }
  }

  function inferFromReferrer(domain, referrerPath) {
    if (!domain) return { origen: "directo", medio: "ninguno" };
    if (domain.indexOf("google.") !== -1) {
      return referrerPath.indexOf("/maps") === 0 ? { origen: "google", medio: "maps" } : { origen: "google", medio: "organico" };
    }
    if (domain.indexOf("facebook.") !== -1 || domain.indexOf("instagram.") !== -1 || domain.indexOf("fb.") !== -1) {
      return { origen: "meta", medio: "organico" };
    }
    if (domain.indexOf("tiktok.") !== -1) return { origen: "tiktok", medio: "organico" };
    if (domain.indexOf("whatsapp.") !== -1 || domain.indexOf("wa.me") !== -1) return { origen: "whatsapp", medio: "referido" };
    return { origen: domain, medio: "referido" };
  }

  function captureFirstTouch() {
    try {
      if (readCookie(COOKIE_NAME)) return;

      var params = new URLSearchParams(location.search);
      var utmSource = params.get("utm_source");
      var utmMedium = params.get("utm_medium");
      var utmCampaign = params.get("utm_campaign");
      // gclid/fbclid: Google Ads y Meta Ads los agregan solos al link del
      // anuncio, incluso sin utm_source explicito.
      var gclid = params.get("gclid");
      var fbclid = params.get("fbclid");

      var origen, origenMedio;
      var domain = referrerDomain();
      var referrerPath = "";
      try {
        referrerPath = document.referrer ? new URL(document.referrer).pathname : "";
      } catch (e) {
        referrerPath = "";
      }

      if (utmSource) {
        origen = utmSource;
        origenMedio = utmMedium || "";
      } else if (gclid) {
        origen = "google";
        origenMedio = "cpc";
      } else if (fbclid) {
        origen = "meta";
        origenMedio = "cpc";
      } else {
        var inferred = inferFromReferrer(domain, referrerPath);
        origen = inferred.origen;
        origenMedio = inferred.medio;
      }

      var firstTouch = {
        origen: origen,
        origen_medio: origenMedio,
        origen_campana: utmCampaign || (gclid ? "gclid:" + gclid : fbclid ? "fbclid:" + fbclid : ""),
        origen_referrer: domain,
        origen_fecha: new Date().toISOString(),
      };

      writeCookie(COOKIE_NAME, JSON.stringify(firstTouch));
    } catch (e) {
      // no bloquear la pagina por esto
    }
  }

  captureFirstTouch();
})();
