/* Hardcore Rewards / patrón de widgets: no toca el bundle de la app.
 * Agrega el botón "Pagar con Sistecrédito" en /checkout, junto al botón
 * real "Pagar ahora" (Bold). No reimplementa el carrito: lee el carrito
 * real vía GET /shopping-car/ (mismo endpoint que ya usa el checkout real)
 * y deja que products/sistecreditoCreate/ recalcule el precio real en el
 * servidor -- el total que se muestra en el modal es solo una vista previa
 * con los mismos product_price que ya trae /shopping-car/, nunca la fuente
 * de verdad del cobro.
 *
 * Ver memoria sistecredito-api-contrato-tecnico para el contrato de la
 * pasarela, y hardcoregames-arquitectura-backend-real para el contrato de
 * auth/carrito reusado acá.
 */
(function () {
  // Gate de beta: el boton solo existe para quien lo active con ?sc=1 (queda
  // recordado y sobrevive a la navegacion del SPA). Con ?sc=0 se apaga.
  try {
    var scP = new URLSearchParams(location.search).get("sc");
    if (scP === "1") localStorage.setItem("sc_beta", "1");
    if (scP === "0") localStorage.removeItem("sc_beta");
    if (localStorage.getItem("sc_beta") !== "1") return;
  } catch (e) { return; }

  if (location.pathname !== '/checkout') return;

  var CART_API = 'https://api.srv936408.hstgr.cloud/shopping-car/';
  var CREATE_API = 'https://admin.hardcoregames.co/products/sistecreditoCreate/';
  var SURCHARGE_MULTIPLIER = 1.20;
  var BTN_ID = 'scPayBtn';

  var style = document.createElement('style');
  style.textContent = '.sc-apple-btn{background:#6DBE45!important;color:#fff!important;}' +
    '.sc-apple-btn:hover{background:#61aa3c!important;}';
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

  function getSession() {
    var jwt = null, userData = null;
    try {
      jwt = localStorage.getItem('jwt_token');
      var raw = localStorage.getItem('user_data');
      userData = raw ? JSON.parse(raw) : null;
    } catch (e) { /* storage bloqueado */ }
    return { jwt: jwt, userId: userData ? userData.id : null };
  }

  // ---------------- botón verde manzana junto a "Pagar ahora" ----------------
  function ensureButton() {
    var payBtn = findPayButton();
    if (!payBtn) return;
    if (document.getElementById(BTN_ID)) return; // ya insertado

    var scBtn = document.createElement('button');
    scBtn.id = BTN_ID;
    scBtn.type = 'button';
    // Mismas clases estructurales del botón real (tamaño, radio, tipografía)
    // menos las de color propias de "bg-cta" -- el color va en <style> aparte.
    scBtn.className = (payBtn.className.replace(/\bbg-cta\b|\bhover:bg-cta\/90\b|\btext-cta-foreground\b/g, ' ').replace(/\s+/g, ' ').trim()) + ' sc-apple-btn';
    scBtn.style.marginTop = '10px';
    scBtn.innerHTML = '🧾 Pagar con Sistecrédito';
    payBtn.insertAdjacentElement('afterend', scBtn);
    scBtn.addEventListener('click', openModal);
  }

  // React puede reemplazar por completo esta tarjeta (cambiar de paso,
  // recargar el carrito, etc.) y pisar el botón insertado -- se observa
  // todo el documento en vez de un ancestro puntual, porque un remount real
  // de React cambia el nodo padre y un observer atado a él dejaría de ver
  // nada.
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
      '.sc-field{margin-bottom:16px;}' +
      '.sc-field label{display:block;font-size:12px;font-weight:700;color:hsl(var(--muted-foreground));margin-bottom:7px;text-transform:uppercase;letter-spacing:.04em;}' +
      '.sc-row{display:flex;gap:8px;}' +
      '.sc-row select,.sc-row input{box-sizing:border-box;background:hsl(var(--input,262 40% 20%));border:1px solid hsl(var(--border));border-radius:calc(var(--radius,.75rem) - .25rem);color:hsl(var(--foreground));font-size:14px;padding:10px 11px;font-family:inherit;}' +
      '.sc-row select{flex:0 0 78px;}' +
      '.sc-row input{flex:1;min-width:0;}' +
      '.sc-breakdown{border-top:1px dashed hsl(var(--border));padding-top:12px;margin-bottom:18px;}' +
      '.sc-b-row{display:flex;justify-content:space-between;font-size:13.5px;padding:3px 0;}' +
      '.sc-b-row.muted span{color:hsl(var(--muted-foreground));}' +
      '.sc-b-row.fee span{color:hsl(48 95% 60%);}' +
      '.sc-b-row.total{border-top:1px solid hsl(var(--border));margin-top:6px;padding-top:9px;font-weight:800;font-size:15.5px;}' +
      '.sc-error{color:hsl(var(--destructive));font-size:13px;margin:-8px 0 14px;display:none;}' +
      '.sc-error.is-visible{display:block;}' +
      '.sc-submit{width:100%;background:#6DBE45;color:#fff;border:none;border-radius:calc(var(--radius,.75rem) - .25rem);font-weight:800;font-size:15px;padding:13px;cursor:pointer;text-align:center;font-family:inherit;}' +
      '.sc-submit:disabled{opacity:.6;cursor:default;}' +
      '.sc-cancel{display:block;width:100%;text-align:center;margin-top:10px;background:none;border:none;color:hsl(var(--muted-foreground));font-size:13.5px;cursor:pointer;padding:6px;font-family:inherit;}' +
      '.sc-loading{text-align:center;padding:20px 0;color:hsl(var(--muted-foreground));font-size:13.5px;}' +
      '</style>' +
      '<div class="sc-dialog" role="dialog" aria-modal="true" aria-labelledby="scTitle">' +
      '<h3 id="scTitle">Pagar con Sistecrédito</h3>' +
      '<p class="sc-sub">Sistecrédito te pedirá tus datos y te enviará un código por SMS para elegir tus cuotas.</p>' +
      '<div id="scBody"><div class="sc-loading">Cargando tu carrito…</div></div>' +
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

    function renderForm(cartItems, subtotal) {
      var fee = Math.round(subtotal * SURCHARGE_MULTIPLIER) - subtotal;
      var total = subtotal + fee;
      body.innerHTML =
        '<div class="sc-breakdown">' +
        '<div class="sc-b-row muted"><span>Subtotal</span><span>' + money(subtotal) + '</span></div>' +
        '<div class="sc-b-row fee"><span>Tarifa Sistecrédito</span><span>+' + money(fee) + '</span></div>' +
        '<div class="sc-b-row total"><span>Total a pagar</span><span>' + money(total) + '</span></div>' +
        '</div>' +
        '<p class="sc-error" id="scError"></p>' +
        '<button type="button" class="sc-submit" id="scSubmit">Continuar con Sistecrédito</button>';

      var errorEl = body.querySelector('#scError');
      var submitBtn = body.querySelector('#scSubmit');

      function showError(msg) { errorEl.textContent = msg; errorEl.classList.add('is-visible'); }
      function clearError() { errorEl.textContent = ''; errorEl.classList.remove('is-visible'); }

      submitBtn.addEventListener('click', function () {
        clearError();
        submitBtn.disabled = true;
        submitBtn.textContent = 'Conectando con Sistecrédito…';

        var session = getSession();
        var requestTransaction = JSON.stringify({
          id_user: session.userId,
          data: cartItems.map(function (item) { return { id_combination: item.product_id }; })
        });

        fetch(CREATE_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ request_transaction: requestTransaction })
        }).then(function (r) { return r.json().then(function (data) { return { ok: r.ok, status: r.status, data: data }; }); })
          .then(function (res) {
            if (res.ok && res.data.paymentRedirectUrl) {
              location.href = res.data.paymentRedirectUrl;
              return;
            }
            if (res.status === 202) {
              showError('Sistecrédito está procesando tu solicitud, inténtalo de nuevo en unos segundos.');
            } else {
              showError((res.data && res.data.error) || 'No pudimos continuar con Sistecrédito.');
            }
            submitBtn.disabled = false;
            submitBtn.textContent = 'Continuar con Sistecrédito';
          }).catch(function () {
            showError('No pudimos conectar con Sistecrédito. Intenta de nuevo.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Continuar con Sistecrédito';
          });
      });
    }

    function loadCartAndRender() {
      body.innerHTML = '<div class="sc-loading">Cargando tu carrito…</div>';
      var session = getSession();
      if (!session.jwt || !session.userId) {
        body.innerHTML = '<p class="sc-error is-visible">Tu sesión expiró, recarga la página.</p>';
        return;
      }
      fetch(CART_API, { headers: { Authorization: 'Bearer ' + session.jwt } })
        .then(function (r) { if (!r.ok) throw new Error('cart'); return r.json(); })
        .then(function (items) {
          var activeItems = (items || []).filter(function (it) { return it.estado; });
          if (!activeItems.length) {
            body.innerHTML = '<p class="sc-error is-visible">Tu carrito está vacío.</p>';
            return;
          }
          var subtotal = activeItems.reduce(function (sum, it) { return sum + (it.product_price || 0); }, 0);
          renderForm(activeItems, subtotal);
        })
        .catch(function () {
          body.innerHTML = '<p class="sc-error is-visible">No pudimos cargar tu carrito. Intenta de nuevo.</p>';
        });
    }

    modalEls = {
      open: function () {
        overlay.classList.add('is-open');
        document.body.style.overflow = 'hidden';
        loadCartAndRender();
      }
    };
    return modalEls;
  }

  function openModal() {
    ensureModal().open();
  }

  watchAndEnsure();
})();
