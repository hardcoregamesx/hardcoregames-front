(function () {
  "use strict";

  var TEXT_MAP = {
    "Browse Games with Filters": "Explora los juegos con filtros",
    "Find exactly what you're looking for": "Encuentra exactamente lo que buscas",
    "Filters": "Filtros",
    "Results found:": "Resultados encontrados:",
    "Price range (COP)": "Rango de precio (COP)",
    "Type": "Tipo",
    "Game (no physical)": "Juego (sin físico)",
    "Subscription": "Suscripción",
    "Genres": "Géneros",
    "Platforms": "Plataformas",
    "Apply Filters": "Aplicar filtros",
    "Clear Filters": "Limpiar filtros",
    "Close": "Cerrar",
  };

  var ARIA_MAP = {
    "Minimum": "Mínimo",
    "Maximum": "Máximo",
  };

  var PLACEHOLDER_MAP = {
    "Min": "Mín",
    "Max": "Máx",
  };

  function isFiltersPage() {
    return location.pathname.indexOf("/filters") === 0;
  }

  function translateTextNodes(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var node;
    var nodes = [];
    while ((node = walker.nextNode())) nodes.push(node);
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var trimmed = n.textContent.trim();
      if (Object.prototype.hasOwnProperty.call(TEXT_MAP, trimmed)) {
        var translated = TEXT_MAP[trimmed];
        if (n.textContent !== translated) n.textContent = translated;
      }
    }
  }

  function translateAttributes(root) {
    var els = root.querySelectorAll("[aria-label]");
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var aria = el.getAttribute("aria-label");
      if (Object.prototype.hasOwnProperty.call(ARIA_MAP, aria)) {
        el.setAttribute("aria-label", ARIA_MAP[aria]);
      }
    }
    var inputs = root.querySelectorAll("input[placeholder]");
    for (var j = 0; j < inputs.length; j++) {
      var input = inputs[j];
      var ph = input.getAttribute("placeholder");
      if (Object.prototype.hasOwnProperty.call(PLACEHOLDER_MAP, ph)) {
        input.setAttribute("placeholder", PLACEHOLDER_MAP[ph]);
      }
    }
  }

  function applyTranslation() {
    if (!isFiltersPage()) return;
    translateTextNodes(document.body);
    translateAttributes(document.body);
  }

  var scheduled = false;
  function scheduleApply() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      applyTranslation();
    });
  }

  var observer = new MutationObserver(function () {
    if (isFiltersPage()) scheduleApply();
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyTranslation);
  } else {
    applyTranslation();
  }
})();
