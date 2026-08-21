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

  // Nombre visto en el ultimo tick del poll, para el debounce de abajo.
  // Se resetea por producto en update() (ver mas abajo).
  var pendingName = null;

  function tryApplyProduct() {
    var main = document.querySelector("main");
    if (!main) return false;
    // Preferir h1 (el titulo real del producto): un h2 puede ser una
    // seccion estatica ("Descripcion del producto") que aparece antes en
    // el DOM y no es el nombre del producto.
    var heading = main.querySelector("h1") || main.querySelector("h2");
    var name = textOf(heading);
    // "Cargando producto..." es el heading del esqueleto de carga: si lo
    // aceptamos aqui, tryApplyProduct() devuelve true en el primer intento
    // y el poll de mas abajo nunca vuelve a correr, dejando titulo/meta/
    // JSON-LD pegados con ese placeholder para el resto del pageview.
    if (!name || /^cargando/i.test(name)) {
      pendingName = null;
      return false;
    }

    // Debounce: exigir el mismo heading en dos ticks seguidos (~250ms)
    // antes de aplicarlo. Durante una navegacion SPA, un h1 ajeno (p.ej.
    // el de una carrusel "Los mas vendidos" que vive en la misma pagina)
    // puede montar un instante antes que el h1 real del producto; sin
    // este debounce, ese heading de paso pasa el check de "no vacio y no
    // cargando" y se queda pegado el resto del pageview porque el poll
    // se detiene en el primer exito. Verificado en vivo: /product/344
    // quedo con title "Los mas vendidos para Xbox" en vez del nombre real.
    if (name !== pendingName) {
      pendingName = name;
      return false;
    }

    var priceEl = Array.prototype.find.call(
      main.querySelectorAll("*"),
      function (n) {
        return n.children.length === 0 && /^COP\s*\$[\d.,]+$/.test(textOf(n));
      }
    );
    var price = priceEl ? textOf(priceEl) : "";
    var priceValue = price ? price.replace(/[^\d]/g, "") : "";

    // "Sin stock" se renderiza junto al precio cuando no hay variante
    // disponible, y en ese estado el precio mostrado cae a "COP $0" (bug
    // de UI aparte, ver ficha /product/24). Sin este chequeo, ese "$0"
    // pasaba tal cual al JSON-LD como Offer "InStock" a $0 -- precio
    // invalido que Google Merchant Center rechaza. Tratamos "sin stock"
    // o precio "0" igual que "no se encontro precio": no se emite Offer.
    var outOfStockEl = Array.prototype.find.call(
      main.querySelectorAll("*"),
      function (n) {
        return n.children.length === 0 && /^sin stock$/i.test(textOf(n));
      }
    );
    if (outOfStockEl || priceValue === "0") {
      price = "";
      priceValue = "";
    }

    var platformEl = Array.prototype.find.call(
      main.querySelectorAll("*"),
      function (n) {
        // \b...\b evita falsos positivos: "PC" suelto coincidia como
        // subcadena dentro de "Descripcion" ("descri-PC-ion"), haciendo
        // que esa seccion estatica se colara como "plataforma".
        return (
          n.children.length === 0 &&
          /\b(PlayStation|Xbox|Nintendo|PC)\b/i.test(textOf(n)) &&
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
      pendingName = null;
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
