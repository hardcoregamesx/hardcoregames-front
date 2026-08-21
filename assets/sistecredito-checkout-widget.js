/* Boton "Pagar con Sistecredito" en /checkout. Patron de widgets sueltos:
 * no toca el bundle de la app.
 *
 * De donde salen los datos (y por que):
 *  - Los items NO se leen de /shopping-car/. El checkout de la app recibe lo
 *    que va a cobrar por el state de React Router, accesible en
 *    window.history.state.usr -- y el flujo "Comprar ahora" de la ficha de
 *    producto llega ahi SIN pasar por el carrito. Leer el carrito daria
 *    "carrito vacio" o, peor, otros productos.
 *  - El cupon y el saldo se leen en el momento del clic (el saldo del propio
 *    state, el cupon del formulario del checkout) y se mandan como cupon y
 *    saldo, NUNCA como un total. El servidor los revalida: el saldo contra el
 *    saldo real del usuario y el cupon contra validate_coupon(). Mandar el
 *    total desde el navegador seria el agujero que se cerro con Bold el
 *    15/08 (ver bold-payment-hardening-vulnerabilidades).
 *  - El total mostrado es solo vista previa. Antes de redirigir se contrasta
 *    contra el amount que devuelve el servidor, para que nadie termine
 *    pagando una cifra distinta de la que vio.
 */
(function () {
  // Gate de beta: el boton solo existe para quien lo active con ?sc=1 (queda
  // recordado y sobrevive a la navegacion del SPA). Con ?sc=0 se apaga.
  try {
    var scP = new URLSearchParams(location.search).get('sc');
    if (scP === '1') localStorage.setItem('sc_beta', '1');
    if (scP === '0') localStorage.removeItem('sc_beta');
    if (localStorage.getItem('sc_beta') !== '1') return;
  } catch (e) { return; }

  if (location.pathname !== '/checkout') return;

  var CART_API = 'https://api.srv936408.hstgr.cloud/shopping-car/';
  var CREATE_API = 'https://admin.hardcoregames.co/products/sistecreditoCreate/';
  var LOGO_URL = '/assets/sistecredito-logo.png';
  var SURCHARGE_MULTIPLIER = 1.20;
  var BTN_ID = 'scPayBtn';

  var style = document.createElement('style');
  style.textContent =
    '#' + BTN_ID + '{background:#fff!important;border:1px solid #d7dce5!important;' +
    'color:#123a8f!important;display:flex!important;align-items:center;justify-content:center;gap:8px;padding-top:12px!important;padding-bottom:12px!important;}' +
    '#' + BTN_ID + ':hover{background:#f2f4f8!important;}' +
    '#' + BTN_ID + ' img{height:24px;width:auto;max-width:78%;object-fit:contain;display:block;margin:0 auto;}' +
    '#' + BTN_ID + ' .sc-btn-text{font-weight:800;}';
  document.head.appendChild(style);

  // ---------------- utilidades ----------------
  function pollFor(finder, timeoutMs, cb) {
    var start = Date.now();
    (function tick() {
      var el;
      try { el = finder(); } catch (e) { el = null; }
      if (el) { cb(el); return; }
      if (Date.now() - start > timeoutMs) { cb(null); return; }
      setTimeout(tick, 150);
    })();
  }

  function findPayButton() {
    return Array.prototype.filter.call(document.querySelectorAll('button'), function (b) {
      return b.textContent.trim() === 'Pagar ahora';
    })[0];
  }

  function money(n) {
    return 'COP ' + Math.round(n).toLocaleString('es-CO');
  }

  function toNumber(text) {
    var digits = (text || '').replace(/[^\d]/g, '');
    return digits ? parseInt(digits, 10) : null;
  }

  function getSession() {
    var jwt = null, userData = null;
    try {
      jwt = localStorage.getItem('jwt_token');
      var raw = localStorage.getItem('user_data');
      userData = raw ? JSON.parse(raw) : null;
    } catch (e) { /* storage bloqueado */ }
    return { jwt: jwt, userId: userData ? userData.id : null };
  }

  // Estado real que el checkout esta renderizando (React Router lo deja en
  // history.state.usr). Es la unica fuente que coincide con lo que ve el
  // cliente, tanto viniendo del carrito como de "Comprar ahora".
  function getRouterState() {
    try {
      var st = window.history.state;
      return (st && st.usr) ? st.usr : null;
    } catch (e) { return null; }
  }

  // Busca una fila del resumen por su etiqueta y devuelve el numero que la
  // acompana. Se apoya en los textos que renderiza el checkout real
  // ("Descuento cupon", "Total").
  function readSummaryRow(labelRegex) {
    var nodes = document.querySelectorAll('span,div,p,strong,td');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.children.length) continue;
      if (!labelRegex.test(el.textContent.trim())) continue;
      var row = el.parentElement;
      if (!row) continue;
      var kids = row.children;
      for (var j = kids.length - 1; j >= 0; j--) {
        if (kids[j] === el) continue;
        var v = toNumber(kids[j].textContent);
        if (v !== null) return v;
      }
    }
    return null;
  }

  function readAppliedCoupon() {
    // Solo cuenta si el checkout ya lo dio por valido (renderiza la fila de
    // descuento); el texto tecleado sin aplicar no debe viajar.
    if (readSummaryRow(/^Descuento cup[oó]n$/i) === null) return null;
    var input = document.querySelector('input[placeholder="Ingresa tu cupón"]');
    var code = input && input.value ? input.value.trim() : '';
    return code || null;
  }

  // ---------------- boton ----------------
  function ensureButton() {
    var payBtn = findPayButton();
    if (!payBtn) return;
    if (document.getElementById(BTN_ID)) return;

    var scBtn = document.createElement('button');
    scBtn.id = BTN_ID;
    scBtn.type = 'button';
    scBtn.setAttribute('aria-label', 'Pagar con Sistecrédito');
    scBtn.className = (payBtn.className.replace(/\bbg-cta\b|\bhover:bg-cta\/90\b|\btext-cta-foreground\b/g, ' ').replace(/\s+/g, ' ').trim());
    scBtn.style.marginTop = '10px';

    var img = document.createElement('img');
    img.src = LOGO_URL;
    img.alt = 'Sistecrédito';
    img.onerror = function () {
      // Si el logo no esta disponible, el boton sigue siendo usable.
      img.remove();
      var span = document.createElement('span');
      span.className = 'sc-btn-text';
      span.textContent = 'Pagar con Sistecrédito';
      scBtn.appendChild(span);
    };
    scBtn.appendChild(img);

    payBtn.insertAdjacentElement('afterend', scBtn);
    scBtn.addEventListener('click', openModal);
  }

  // React puede reemplazar por completo esta tarjeta y pisar el boton
  // insertado -- se observa todo el documento porque un remount real cambia
  // el nodo padre y un observer atado a el dejaria de ver nada.
  function watchAndEnsure() {
    pollFor(findPayButton, 8000, function () { ensureButton(); });
    var observer = new MutationObserver(function () { ensureButton(); });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ---------------- modal ----------------
  var modalEls = null;

  function ensureModal() {
    if (modalEls) return modalEls;
    var wrap = document.createElement('div');
    wrap.id = 'scOverlay';
    wrap.innerHTML =
      '<style>' +
      '#scOverlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:99999;align-items:center;justify-content:center;padding:20px;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;}' +
      '#scOverlay.is-open{display:flex;}' +
      '.sc-dialog{background:hsl(var(--card));border:1px solid hsl(var(--border));border-radius:var(--radius,.75rem);box-shadow:0 20px 50px rgba(0,0,0,.5);max-width:380px;width:100%;padding:24px;color:hsl(var(--foreground));}' +
      '.sc-dialog h3{font-size:19px;font-weight:800;margin:0 0 6px;}' +
      '.sc-sub{color:hsl(var(--muted-foreground));font-size:13.5px;margin:0 0 18px;}' +
      '.sc-breakdown{border-top:1px dashed hsl(var(--border));padding-top:12px;margin-bottom:18px;}' +
      '.sc-b-row{display:flex;justify-content:space-between;font-size:13.5px;padding:3px 0;}' +
      '.sc-b-row.muted span{color:hsl(var(--muted-foreground));}' +
      '.sc-b-row.fee span{color:hsl(48 95% 60%);}' +
      '.sc-b-row.total{border-top:1px solid hsl(var(--border));margin-top:6px;padding-top:9px;font-weight:800;font-size:15.5px;}' +
      '.sc-error{color:hsl(var(--destructive));font-size:13px;margin:-8px 0 14px;display:none;}' +
      '.sc-error.is-visible{display:block;}' +
      '.sc-submit{width:100%;background:#fff;color:#123a8f;border:1px solid #d7dce5;border-radius:calc(var(--radius,.75rem) - .25rem);font-weight:800;font-size:15px;padding:13px;cursor:pointer;text-align:center;font-family:inherit;}' +
      '.sc-submit:disabled{opacity:.6;cursor:default;}' +
      '.sc-cancel{display:block;width:100%;text-align:center;margin-top:10px;background:none;border:none;color:hsl(var(--muted-foreground));font-size:13.5px;cursor:pointer;padding:6px;font-family:inherit;}' +
      '.sc-loading{text-align:center;padding:20px 0;color:hsl(var(--muted-foreground));font-size:13.5px;}' +
      '</style>' +
      '<div class="sc-dialog" role="dialog" aria-modal="true" aria-labelledby="scTitle">' +
      '<h3 id="scTitle">Pagar con Sistecrédito</h3>' +
      '<p class="sc-sub">Sistecrédito te pedirá tus datos y te enviará un código por SMS para elegir tus cuotas.</p>' +
      '<div id="scBody"><div class="sc-loading">Preparando tu pago…</div></div>' +
      '<button type="button" class="sc-cancel" id="scCancel">Cancelar</button>' +
      '</div>';
    document.body.appendChild(wrap);

    var overlay = wrap;
    var body = wrap.querySelector('#scBody');
    var cancelBtn = wrap.querySelector('#scCancel');

    function close() { overlay.classList.remove('is-open'); document.body.style.overflow = ''; }
    cancelBtn.addEventListener('click', close);
    overlay.addEventListener('click', function (ev) { if (ev.target === overlay) close(); });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && overlay.classList.contains('is-open')) close();
    });

    function fail(msg) {
      body.innerHTML = '<p class="sc-error is-visible">' + msg + '</p>';
    }

    function render(order) {
      var fee = Math.round(order.net * SURCHARGE_MULTIPLIER) - order.net;
      var total = order.net + fee;

      body.innerHTML =
        '<div class="sc-breakdown">' +
        '<div class="sc-b-row muted"><span>Total de tu compra</span><span>' + money(order.net) + '</span></div>' +
        '<div class="sc-b-row fee"><span>Tarifa Sistecrédito</span><span>+' + money(fee) + '</span></div>' +
        '<div class="sc-b-row total"><span>Total a pagar</span><span>' + money(total) + '</span></div>' +
        '</div>' +
        '<p class="sc-error" id="scError"></p>' +
        '<button type="button" class="sc-submit" id="scSubmit">Continuar con Sistecrédito</button>';

      var errorEl = body.querySelector('#scError');
      var submitBtn = body.querySelector('#scSubmit');

      function showError(msg) { errorEl.textContent = msg; errorEl.classList.add('is-visible'); }
      function reset() {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Continuar con Sistecrédito';
      }

      submitBtn.addEventListener('click', function () {
        errorEl.classList.remove('is-visible');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Conectando con Sistecrédito…';

        var session = getSession();
        var requestTransaction = JSON.stringify({
          id_user: session.userId,
          couponCode: order.couponCode,
          balanceApplied: order.balanceApplied,
          data: order.data
        });

        fetch(CREATE_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ request_transaction: requestTransaction })
        }).then(function (r) { return r.json().then(function (data) { return { ok: r.ok, status: r.status, data: data }; }); })
          .then(function (res) {
            if (res.ok && res.data.paymentRedirectUrl) {
              // El servidor manda el monto que de verdad se va a cobrar. Si no
              // coincide con el que vio el cliente, no se redirige: se le
              // muestra el real y decide otra vez.
              if (typeof res.data.amount === 'number' && Math.abs(res.data.amount - total) > 1) {
                body.innerHTML =
                  '<div class="sc-breakdown"><div class="sc-b-row total">' +
                  '<span>Total a pagar</span><span>' + money(res.data.amount) + '</span></div></div>' +
                  '<p class="sc-sub">El total se actualizó al revisar precios y descuentos. Confirma para continuar.</p>' +
                  '<button type="button" class="sc-submit" id="scGo">Continuar con Sistecrédito</button>';
                body.querySelector('#scGo').addEventListener('click', function () {
                  location.href = res.data.paymentRedirectUrl;
                });
                return;
              }
              location.href = res.data.paymentRedirectUrl;
              return;
            }
            if (res.status === 202) {
              showError('Sistecrédito está procesando tu solicitud, inténtalo de nuevo en unos segundos.');
            } else {
              showError((res.data && res.data.error) || 'No pudimos continuar con Sistecrédito.');
            }
            reset();
          }).catch(function () {
            showError('No pudimos conectar con Sistecrédito. Intenta de nuevo.');
            reset();
          });
      });
    }

    // Arma el pedido leyendo, en este preciso momento, lo mismo que el
    // checkout esta mostrando.
    function buildOrder(cb) {
      var state = getRouterState();
      var couponCode = readAppliedCoupon();
      var domTotal = readSummaryRow(/^Total:?$/);

      if (state && state.items && state.items.length) {
        var items = state.items;
        cb({
          net: domTotal !== null ? domTotal : items.reduce(function (s, it) { return s + (it.price || 0); }, 0),
          couponCode: couponCode,
          balanceApplied: state.balanceApplied || 0,
          data: items.map(function (it) {
            return { id_combination: it.id_combination || null, is_rentail: it.is_retail || false };
          })
        });
        return;
      }

      // Sin state (recarga directa de /checkout): se cae al carrito real.
      var session = getSession();
      if (!session.jwt || !session.userId) { fail('Tu sesión expiró, recarga la página.'); return; }
      fetch(CART_API, { headers: { Authorization: 'Bearer ' + session.jwt } })
        .then(function (r) { if (!r.ok) throw new Error('cart'); return r.json(); })
        .then(function (raw) {
          var active = (raw || []).filter(function (it) { return it.estado; });
          if (!active.length) { fail('Tu carrito está vacío.'); return; }
          cb({
            net: domTotal !== null ? domTotal : active.reduce(function (s, it) { return s + (it.product_price || 0); }, 0),
            couponCode: couponCode,
            balanceApplied: 0,
            data: active.map(function (it) { return { id_combination: it.product_id }; })
          });
        })
        .catch(function () { fail('No pudimos cargar tu pedido. Intenta de nuevo.'); });
    }

    modalEls = {
      open: function () {
        overlay.classList.add('is-open');
        document.body.style.overflow = 'hidden';
        body.innerHTML = '<div class="sc-loading">Preparando tu pago…</div>';
        buildOrder(render);
      }
    };
    return modalEls;
  }

  function openModal() {
    ensureModal().open();
  }

  watchAndEnsure();
})();
