/*!
 * Meta Pixel — rastreo de eventos para hardcoregames.co
 *
 * El frontend de este sitio es un bundle ya compilado (no hay codigo
 * fuente React disponible en este repo), asi que este script NO modifica
 * el bundle existente — solo observa la app desde afuera: cambios de ruta
 * (SPA), clics en botones de compra, y la llamada a BoldCheckout (pasarela
 * de pago) para capturar el valor real de la orden.
 *
 * Debe cargarse ANTES que:
 *   1) el script de Bold (https://checkout.bold.co/library/boldPaymentButton.js)
 *   2) el bundle de la app (/assets/index-*.js)
 * para poder interceptar window.fetch y window.BoldCheckout a tiempo.
 */
(function () {
  "use strict";

  var PIXEL_ID = "1242058424697245";
  var API_HOST = "api.srv936408.hstgr.cloud";
  var CAPI_ENDPOINT = "https://" + API_HOST + "/tracking/purchase";

  var lastProduct = null; // { id, title, price }
  var lastOrder = null; // { orderId, amount, currency, email }
  var purchaseFired = {};

  function safeFbq() {
    if (typeof window.fbq === "function") {
      try {
        window.fbq.apply(window, arguments);
      } catch (e) {
        console.warn("[MetaPixel] fbq error", e);
      }
    }
  }

  function getCookie(name) {
    var m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : null;
  }

  function readStoredOrder() {
    try {
      return JSON.parse(sessionStorage.getItem("mp_last_order") || "null");
    } catch (e) {
      return null;
    }
  }

  function storeOrder(order) {
    lastOrder = order;
    try {
      sessionStorage.setItem("mp_last_order", JSON.stringify(order));
    } catch (e) {}
  }

  // ---------------------------------------------------------------------
  // 1) Cambios de ruta en la SPA (PageView + eventos por pagina)
  // ---------------------------------------------------------------------
  var lastPath = location.pathname;

  function handleRoute(path) {
    var productMatch = path.match(/^\/product\/(\d+)/);
    if (productMatch) {
      trackViewContent(productMatch[1]);
      return;
    }
    if (path === "/checkout") {
      safeFbq("track", "InitiateCheckout", buildCartParams());
      return;
    }
    if (path === "/success") {
      trackPurchase();
      return;
    }
  }

  function onRouteChange() {
    var path = location.pathname;
    if (path === lastPath) return;
    lastPath = path;
    safeFbq("track", "PageView");
    handleRoute(path);
  }

  ["pushState", "replaceState"].forEach(function (method) {
    var orig = history[method];
    history[method] = function () {
      var ret = orig.apply(this, arguments);
      onRouteChange();
      return ret;
    };
  });
  window.addEventListener("popstate", onRouteChange);

  function onFirstLoad() {
    handleRoute(location.pathname);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onFirstLoad);
  } else {
    onFirstLoad();
  }

  // ---------------------------------------------------------------------
  // 2) Capturar producto (titulo/precio real) desde las llamadas a la API
  // ---------------------------------------------------------------------
  var origFetch = window.fetch;
  if (typeof origFetch === "function") {
    window.fetch = function (input, init) {
      var url = typeof input === "string" ? input : (input && input.url) || "";
      var promise = origFetch.apply(this, arguments);
      try {
        if (url.indexOf(API_HOST) !== -1 && /\/products\/\d+(\?|$)/.test(url)) {
          promise
            .then(function (res) {
              return res.clone().json();
            })
            .then(function (data) {
              var d = data && data.data ? data.data : data;
              if (d && (d.id_product || d.id)) {
                lastProduct = {
                  id: d.id_product || d.id,
                  title: d.title || d.name,
                  price: d.price_discount != null ? d.price_discount : d.price,
                };
              }
            })
            .catch(function () {});
        }
      } catch (e) {}
      return promise;
    };
  }

  function trackViewContent(productId) {
    var p = lastProduct && String(lastProduct.id) === String(productId) ? lastProduct : null;
    var params = { content_ids: [String(productId)], content_type: "product" };
    if (p) {
      params.content_name = p.title;
      params.value = p.price;
      params.currency = "COP";
    }
    safeFbq("track", "ViewContent", params);
  }

  function buildCartParams() {
    var params = { content_type: "product" };
    if (lastProduct) {
      params.content_ids = [String(lastProduct.id)];
      params.content_name = lastProduct.title;
      params.value = lastProduct.price;
      params.currency = "COP";
    }
    return params;
  }

  // ---------------------------------------------------------------------
  // 3) AddToCart — delegacion de clics sobre los botones reales del sitio
  // ---------------------------------------------------------------------
  var ADD_TO_CART_RE = /agregar al carrito/i;
  document.addEventListener(
    "click",
    function (ev) {
      var el = ev.target;
      var depth = 0;
      while (el && depth < 5) {
        var text = (el.innerText || el.textContent || "").trim();
        if (text && text.length < 40 && ADD_TO_CART_RE.test(text)) {
          safeFbq("track", "AddToCart", buildCartParams());
          break;
        }
        el = el.parentElement;
        depth++;
      }
    },
    true
  );

  // ---------------------------------------------------------------------
  // 4) Capturar el pedido real en el momento exacto en que se abre Bold
  //    (new BoldCheckout({ orderId, amount, currency, customerData }).open())
  // ---------------------------------------------------------------------
  var _RealBoldCheckout = null;
  try {
    Object.defineProperty(window, "BoldCheckout", {
      configurable: true,
      get: function () {
        return _RealBoldCheckout;
      },
      set: function (RealClass) {
        function WrappedBoldCheckout(config) {
          try {
            if (config) {
              var customer = {};
              try {
                customer = JSON.parse(config.customerData || "{}");
              } catch (e) {}
              var order = {
                orderId: config.orderId,
                amount: config.amount,
                currency: config.currency || "COP",
                email: customer.email,
              };
              storeOrder(order);
              safeFbq("track", "AddPaymentInfo", {
                value: order.amount,
                currency: order.currency,
                content_ids: order.orderId ? [String(order.orderId)] : undefined,
                content_type: "product",
              });
            }
          } catch (e) {
            console.warn("[MetaPixel] Bold capture error", e);
          }
          return new RealClass(config);
        }
        WrappedBoldCheckout.prototype = RealClass.prototype;
        for (var k in RealClass) {
          if (Object.prototype.hasOwnProperty.call(RealClass, k)) {
            WrappedBoldCheckout[k] = RealClass[k];
          }
        }
        _RealBoldCheckout = WrappedBoldCheckout;
      },
    });
  } catch (e) {
    console.warn("[MetaPixel] no se pudo interceptar BoldCheckout", e);
  }

  // ---------------------------------------------------------------------
  // 5) Purchase — al aterrizar en /success (redireccion de Bold)
  // ---------------------------------------------------------------------
  function trackPurchase() {
    var order = lastOrder || readStoredOrder();
    var urlParams = new URLSearchParams(location.search);
    var orderId =
      (order && order.orderId) ||
      urlParams.get("bold-order-id") ||
      urlParams.get("order_id") ||
      "unknown_" + Date.now();

    if (purchaseFired[orderId]) return;
    purchaseFired[orderId] = true;

    var eventId = "purchase_" + orderId;
    var params = { content_type: "product" };
    if (order) {
      params.value = order.amount;
      params.currency = order.currency || "COP";
      params.content_ids = order.orderId ? [String(order.orderId)] : undefined;
    }

    if (order && order.email) {
      // Manual Advanced Matching: el SDK del pixel hashea el email localmente.
      safeFbq("init", PIXEL_ID, { em: order.email });
    }

    safeFbq("track", "Purchase", params, { eventID: eventId });

    // Respaldo server-side (Conversions API). No hace nada mientras el
    // backend no tenga configurado el token de Meta — falla en silencio.
    try {
      fetch(CAPI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: order && order.orderId,
          event_id: eventId,
          event_source_url: location.href,
          fbp: getCookie("_fbp"),
          fbc: getCookie("_fbc"),
        }),
      }).catch(function () {});
    } catch (e) {}
  }
})();
