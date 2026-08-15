(function () {
  "use strict";

  var SITE = "Hardcore Games";
  var BASE = "https://www.hardcoregames.co";

  var STATIC_ROUTES = {
    "/": {
      title: "Hardcore Games - Juegos digitales para PlayStation, Xbox y Nintendo al mejor precio | Colombia",
      description: "Compra juegos digitales, códigos y suscripciones para PlayStation, Xbox y Nintendo al mejor precio en Colombia. Soporte y garantía en cada compra.",
    },
    "/filters": {
      title: "Catálogo de juegos digitales para PlayStation, Xbox, Nintendo y PC | Hardcore Games",
      description: "Explora el catálogo completo de juegos digitales, suscripciones y consolas con filtros por plataforma, precio y género. Envío inmediato y soporte incluido.",
    },
    "/week-offers": {
      title: "Ofertas de la semana en juegos digitales | Hardcore Games",
      description: "Los descuentos de esta semana en juegos digitales para PlayStation, Xbox y Nintendo. Precios especiales por tiempo limitado.",
    },
    "/new-releases": {
      title: "Lanzamientos de juegos digitales | Hardcore Games",
      description: "Los últimos lanzamientos de juegos digitales para PlayStation, Xbox, Nintendo y PC, disponibles desde ya con entrega inmediata.",
    },
    "/destacados": {
      title: "Juegos digitales destacados | Hardcore Games",
      description: "Los juegos digitales más destacados del catálogo de Hardcore Games, con soporte y garantía en cada compra.",
    },
    "/most-sold": {
      title: "Los juegos digitales más vendidos | Hardcore Games",
      description: "Los juegos digitales más vendidos en Hardcore Games: los títulos que más eligen los gamers en Colombia.",
    },
  };

  function setMeta(name, content, attr) {
    attr = attr || "name";
    if (!content) return;
    var sel = 'meta[' + attr + '="' + name + '"]';
    var el = document.querySelector(sel);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr, name);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  }

  function setCanonical(href) {
    var el = document.querySelector('link[rel="canonical"]');
    if (!el) {
      el = document.createElement("link");
      el.setAttribute("rel", "canonical");
      document.head.appendChild(el);
    }
    el.setAttribute("href", href);
  }

  function setRobots(content) {
    setMeta("robots", content);
  }

  function setJsonLd(id, data) {
    var el = document.getElementById(id);
    if (!data) {
      if (el) el.remove();
      return;
    }
    if (!el) {
      el = document.createElement("script");
      el.type = "application/ld+json";
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(data);
  }

  function clearProductJsonLd() {
    setJsonLd("seo-product-jsonld", null);
    setJsonLd("seo-breadcrumb-jsonld", null);
  }

  function applyStatic(path, canonicalPath) {
    var entry = STATIC_ROUTES[path];
    if (!entry) return false;
    document.title = entry.title;
    setMeta("description", entry.description);
    setMeta("og:title", entry.title, "property");
    setMeta("og:description", entry.description, "property");
    setMeta("og:url", BASE + canonicalPath, "property");
    setCanonical(BASE + canonicalPath);
    setRobots("index,follow");
    clearProductJsonLd();
    return true;
  }

  function textOf(el) {
    return el && el.textContent ? el.textContent.trim() : "";
  }

  function tryApplyProduct() {
    var main = document.querySelector("main");
    if (!main) return false;
    var heading = main.querySelector("h1, h2");
    var name = textOf(heading);
    if (!name) return false;

    var priceEl = Array.prototype.find.call(
      main.querySelectorAll("*"),
      function (n) {
        return n.children.length === 0 && /^COP\s*\$[\d.,]+$/.test(textOf(n));
      }
    );
    var price = priceEl ? textOf(priceEl) : "";

    var platformEl = Array.prototype.find.call(
      main.querySelectorAll("*"),
      function (n) {
        return (
          n.children.length === 0 &&
          /(PlayStation|Xbox|Nintendo|PC)/i.test(textOf(n)) &&
          textOf(n).length < 40
        );
      }
    );
    var platform = platformEl ? textOf(platformEl) : "";

    var title =
      name +
      (platform ? " para " + platform : "") +
      " - Código digital al mejor precio | Hardcore Games";
    var description =
      "Compra " +
      name +
      (platform ? " para " + platform : "") +
      (price ? " desde " + price : "") +
      " en Hardcore Games. Entrega digital con soporte y garantía.";

    document.title = title;
    setMeta("description", description);
    setMeta("og:title", title, "property");
    setMeta("og:description", description, "property");
    setMeta("og:type", "product", "property");
    setMeta("og:url", location.href.split("?")[0], "property");
    setCanonical(location.origin + location.pathname);
    setRobots("index,follow");

    var img = main.querySelector("img");
    var priceValue = price ? price.replace(/[^\d]/g, "") : null;

    setJsonLd("seo-product-jsonld", {
      "@context": "https://schema.org",
      "@type": "Product",
      name: name,
      image: img && img.src ? [img.src] : undefined,
      description: description,
      offers: priceValue
        ? {
            "@type": "Offer",
            priceCurrency: "COP",
            price: priceValue,
            availability: "https://schema.org/InStock",
            url: location.href.split("?")[0],
          }
        : undefined,
    });

    var crumbLinks = document.querySelectorAll(
      'main a[href="/"], main a[href="/filters"]'
    );
    if (crumbLinks.length) {
      setJsonLd("seo-breadcrumb-jsonld", {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Tienda", item: BASE + "/" },
          { "@type": "ListItem", position: 2, name: "Catálogo", item: BASE + "/filters" },
          { "@type": "ListItem", position: 3, name: name, item: location.href.split("?")[0] },
        ],
      });
    }

    return true;
  }

  var productRetries = 0;
  function update() {
    var path = location.pathname;

    if (/^\/product\/\d+\/?$/.test(path)) {
      productRetries = 0;
      var applied = tryApplyProduct();
      if (!applied) {
        var poll = setInterval(function () {
          productRetries++;
          if (tryApplyProduct() || productRetries > 20) clearInterval(poll);
        }, 250);
      }
      return;
    }

    if (applyStatic(path, path)) return;

    if (path === "/filters" || path.indexOf("/filters") === 0) {
      applyStatic("/filters", "/filters");
      return;
    }

    clearProductJsonLd();
    setRobots("noindex,follow");
  }

  var lastPath = null;
  function onRouteChange() {
    if (location.pathname === lastPath) return;
    lastPath = location.pathname;
    update();
  }

  var origPush = history.pushState;
  history.pushState = function () {
    var r = origPush.apply(this, arguments);
    onRouteChange();
    return r;
  };
  var origReplace = history.replaceState;
  history.replaceState = function () {
    var r = origReplace.apply(this, arguments);
    onRouteChange();
    return r;
  };
  window.addEventListener("popstate", onRouteChange);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onRouteChange);
  } else {
    onRouteChange();
  }
})();
