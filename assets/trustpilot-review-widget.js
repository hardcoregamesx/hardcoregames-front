/* Patron de widgets: no toca el bundle de la app (ver guest-checkout-widget.js,
 * meta-pixel-tracking.js). Anade el CTA para puntuar en Trustpilot en la
 * pagina de compra exitosa (/success), reutilizando las mismas clases
 * Tailwind que ya usa esa pagina para que se vea como parte nativa del sitio.
 */
(function () {
  var TRUSTPILOT_URL = 'https://www.trustpilot.com/evaluate/hardcoregames.co';
  var WIDGET_ID = 'tpReviewCta';
  var STAR_PATH = 'M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.9L5.7 21l1.7-7L2 8.6l7.1-.6L12 2z';

  function onSuccessPage() {
    return location.pathname === '/success';
  }

  function buildWidget() {
    var wrap = document.createElement('div');
    wrap.id = WIDGET_ID;
    wrap.className = 'mb-6 rounded-lg border border-border bg-card p-4 text-left';
    wrap.innerHTML =
      '<div class="flex items-center gap-2 text-foreground">' +
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#00b67a" class="h-5 w-5 shrink-0"><path d="' + STAR_PATH + '"></path></svg>' +
        '<span class="font-medium leading-none">¿Cómo fue tu compra?</span>' +
      '</div>' +
      '<p class="mt-2 text-sm text-muted-foreground">Cuéntanos qué tal la experiencia — nos ayuda muchísimo que la dejes en Trustpilot.</p>' +
      '<a href="' + TRUSTPILOT_URL + '" target="_blank" rel="noopener noreferrer" ' +
        'class="mt-3 inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 h-11 px-8" ' +
        'style="background:#00b67a;color:#ffffff;">' +
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4 shrink-0"><path d="' + STAR_PATH + '"></path></svg>' +
        'Puntúanos en Trustpilot' +
      '</a>';
    return wrap;
  }

  function insertWidget() {
    if (document.getElementById(WIDGET_ID)) return true;
    var purchasesLink = document.querySelector('main a[href="/purchases"]');
    if (!purchasesLink) return false;
    purchasesLink.insertAdjacentElement('afterend', buildWidget());
    return true;
  }

  function tryInsert() {
    if (!onSuccessPage()) return;
    // El contenido de /success lo pinta React despues de montar; reintenta
    // un rato en vez de asumir que el DOM ya esta listo.
    var attempts = 0;
    var timer = setInterval(function () {
      attempts++;
      if (insertWidget() || attempts > 40) clearInterval(timer);
    }, 150);
  }

  // Misma tecnica que meta-pixel-tracking.js para detectar cambios de ruta
  // dentro de la SPA (el sitio nunca hace un load completo entre paginas).
  var lastPath = location.pathname;
  function onRouteChange() {
    var path = location.pathname;
    if (path === lastPath) return;
    lastPath = path;
    tryInsert();
  }
  ['pushState', 'replaceState'].forEach(function (method) {
    var orig = history[method];
    history[method] = function () {
      var ret = orig.apply(this, arguments);
      onRouteChange();
      return ret;
    };
  });
  window.addEventListener('popstate', onRouteChange);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { tryInsert(); });
  } else {
    tryInsert();
  }
})();
