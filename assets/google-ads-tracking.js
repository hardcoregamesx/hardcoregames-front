/*!
 * Google Ads + GA4 — eventos de ecommerce para hardcoregames.co
 *
 * Los tags base (gtag.js, AW-18382206101 y G-GKCE278731) ya cargan en
 * index.html, pero antes de este script no disparaban NINGUN evento de
 * conversion: Google Ads no se enteraba de las compras y GA4 no recibia
 * purchase/add_to_cart/begin_checkout. Este script no reintercepta fetch
 * ni window.BoldCheckout (eso ya lo hace meta-pixel-tracking.js) — escucha
 * el CustomEvent "hc:track" que ese script emite en cada paso del funnel,
 * para no arriesgar pisar su interceptor de Bold.
 *
 * Debe cargarse DESPUES de meta-pixel-tracking.js (que es quien despacha
 * "hc:track") y despues de que gtag('config', ...) ya corrio en <head>.
 */
(function () {
  "use strict";

  // gtag('event', ...) sin "send_to" ya llega a AMBOS targets configurados
  // en index.html (G-GKCE278731 y AW-18382206101) — no hace falta repetirlo
  // aqui. ADS_ID solo se usa para el gtag de conversion explicito de Ads.
  var ADS_ID = "AW-18382206101";

  // Label de la accion de conversion "Compra" en Google Ads (obtenido de
  // Objetivos > Conversiones > Compra > Administrar > "Ver fragmento de
  // evento" el 16/08/2026). Value/currency siempre llegan reales desde el
  // "order" que captura meta-pixel-tracking.js en el checkout de Bold, asi
  // que el "usar COP1" que la cuenta trae por defecto no aplica en la
  // practica.
  var ADS_CONVERSION_LABEL = "1X68CPzkp98cEJXpqL1E";

  function safeGtag() {
    if (typeof window.gtag === "function") {
      try {
        window.gtag.apply(window, arguments);
      } catch (e) {
        console.warn("[GoogleAdsTracking] gtag error", e);
      }
    }
  }

  function toItem(params) {
    var id = params.content_ids && params.content_ids[0];
    return {
      item_id: id != null ? String(id) : undefined,
      item_name: params.content_name,
      price: typeof params.value === "number" ? params.value : undefined,
      quantity: 1,
    };
  }

  function ecommerceEvent(name, params) {
    safeGtag("event", name, {
      currency: params.currency || "COP",
      value: params.value,
      items: [toItem(params)],
    });
  }

  window.addEventListener("hc:track", function (ev) {
    var detail = ev.detail || {};
    var params = detail.params || {};

    switch (detail.event) {
      case "ViewContent":
        ecommerceEvent("view_item", params);
        break;
      case "AddToCart":
        ecommerceEvent("add_to_cart", params);
        break;
      case "InitiateCheckout":
        ecommerceEvent("begin_checkout", params);
        break;
      case "AddPaymentInfo":
        ecommerceEvent("add_payment_info", params);
        break;
      case "Purchase":
        var transactionId = detail.orderId ? String(detail.orderId) : undefined;
        safeGtag("event", "purchase", {
          transaction_id: transactionId,
          currency: params.currency || "COP",
          value: params.value,
          items: [toItem(params)],
        });
        if (ADS_CONVERSION_LABEL) {
          safeGtag("event", "conversion", {
            send_to: ADS_ID + "/" + ADS_CONVERSION_LABEL,
            value: params.value,
            currency: params.currency || "COP",
            transaction_id: transactionId,
          });
        }
        break;
    }
  });
})();
