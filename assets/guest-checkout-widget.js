/* Hardcore Rewards / patrón de widgets: no toca el bundle de la app.
 * Checkout de invitado en las fichas de producto reales (/product/:id).
 * Mismo contrato de auth que ya usa gamepassultimate/index.html:
 * POST /users/register/ (Django) -> POST /auth/login (FastAPI, form-encoded)
 * -> jwt_token + user_data en localStorage, con la misma forma exacta que
 * lee el AuthProvider real del bundle.
 *
 * A diferencia de la landing, aquí no se llama /shopping-car/ ni se navega
 * a mano: React no expone su estado de selección (licencia/duración) hacia
 * afuera, así que la única forma confiable de completar "Agregar al
 * carrito" / "Comprar ahora" es re-disparar el clic real sobre los botones
 * reales de la página, después de recargar ya logueado.
 */
(function () {
  // Esto es una SPA: si el cliente llega a la ficha navegando desde el
  // catalogo (sin recarga), comprobar la ruta una sola vez al cargar el
  // script dejaba el interceptor sin instalar y el boton mandaba a /auth.
  // La ruta se comprueba en el momento del clic, no al cargar.
  function onProductPage() {
    return location.pathname.indexOf('/product/') === 0;
  }

  var REGISTER_API = 'https://admin.hardcoregames.co/users/register/';
  var AUTH_LOGIN_API = 'https://api.srv936408.hstgr.cloud/auth/login';
  var PENDING_KEY = 'gcw_pending_action';
  var ACTION_LABELS = { buy: 'Comprar ahora', cart: 'Agregar al carrito' };

  // ---------------- utilidades ----------------
  function decodeJwtPayload(token) {
    try {
      var b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      var json = decodeURIComponent(atob(b64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(json);
    } catch (e) { return null; }
  }

  function randomPassword() {
    var bytes = new Uint8Array(18);
    crypto.getRandomValues(bytes);
    return Array.prototype.map.call(bytes, function (b) { return b.toString(36); }).join('').slice(0, 24) + 'Aa1!';
  }

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

  function fireRealClick(el) {
    try { el.scrollIntoView({ block: 'center', behavior: 'instant' }); } catch (e) {}
    var rect = el.getBoundingClientRect();
    var opts = { bubbles: true, cancelable: true, view: window, clientX: rect.x + rect.width / 2, clientY: rect.y + rect.height / 2, button: 0 };
    ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(function (type) {
      el.dispatchEvent(new MouseEvent(type, opts));
    });
  }

  // ---------------- leer/restaurar la combinación seleccionada ----------------
  // Los botones de combinación no tienen ningún atributo identificable
  // (data-*, id) — solo clases Tailwind. Se identifican por texto
  // ("Primaria1 mes...", "Codigo13 meses...") y la seleccionada lleva el
  // token de clase exacto "border-primary" (no "hover:border-primary/50",
  // que aparece en todas).
  function findComboButtons() {
    return Array.prototype.slice.call(document.querySelectorAll('button')).filter(function (b) {
      return /^(Primaria|Secundaria|Codigo)\d+\s*mes(?:es)?/.test(b.textContent.trim());
    });
  }

  function parseSignature(btn) {
    var m = btn.textContent.trim().match(/^(Primaria|Secundaria|Codigo)(\d+\s*mes(?:es)?)/);
    return m ? { license: m[1], duration: m[2] } : null;
  }

  function getSelectedComboSignature() {
    var selected = findComboButtons().filter(function (b) {
      return b.className.split(/\s+/).indexOf('border-primary') !== -1;
    })[0];
    return selected ? parseSignature(selected) : null;
  }

  // ---------------- registro + login silenciosos ----------------
  function guestRegisterAndLogin(email) {
    var password = randomPassword();
    return fetch(REGISTER_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: '', last_name: '', email: email, password: password, phone_number: '', avatar: '', guest_checkout: true })
    }).then(function (r) {
      if (r.status === 400) {
        return r.json().then(function (body) {
          var msg = (body && body.message) || '';
          var code = msg.indexOf('ya existe') !== -1 ? 'EMAIL_TAKEN' : 'REGISTER_FAILED';
          return Promise.reject({ code: code });
        });
      }
      if (!r.ok) return Promise.reject({ code: 'REGISTER_FAILED' });
      return fetch(AUTH_LOGIN_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'username=' + encodeURIComponent(email) + '&password=' + encodeURIComponent(password)
      });
    }).then(function (r) {
      if (!r.ok) return Promise.reject({ code: 'LOGIN_FAILED' });
      return r.json();
    }).then(function (loginRes) {
      var payload = decodeJwtPayload(loginRes.access_token);
      var userId = 0;
      if (payload) {
        if (typeof payload.user_id === 'number') userId = payload.user_id;
        else if (!isNaN(Number(payload.sub))) userId = Number(payload.sub);
      }
      var userData = {
        id: userId,
        email: email,
        first_name: (payload && typeof payload.first_name === 'string') ? payload.first_name : email.split('@')[0],
        last_name: '',
        liked_game_ids: (payload && Array.isArray(payload.liked_game_ids)) ? payload.liked_game_ids : [],
        is_superuser: !!(payload && payload.is_superuser === true)
      };
      try {
        localStorage.setItem('jwt_token', loginRes.access_token);
        localStorage.setItem('user_data', JSON.stringify(userData));
      } catch (e) { /* storage bloqueado */ }
    });
  }

  // ---------------- modal (construido por JS, sin tocar el bundle) ----------------
  var modalEls = null;

  function ensureModal() {
    if (modalEls) return modalEls;
    var wrap = document.createElement('div');
    wrap.id = 'gcwOverlay';
    wrap.innerHTML =
      '<style>' +
      '#gcwOverlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99999;align-items:center;justify-content:center;padding:20px;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;}' +
      '#gcwOverlay.is-open{display:flex;}' +
      '.gcw-dialog{background:hsl(var(--card));border:1px solid hsl(var(--border));border-radius:var(--radius,.75rem);box-shadow:0 20px 50px rgba(0,0,0,.5);max-width:380px;width:100%;padding:24px;}' +
      '.gcw-dialog h3{font-size:19px;font-weight:800;margin:0 0 6px;color:hsl(var(--foreground));}' +
      '.gcw-sub{color:hsl(var(--muted-foreground));font-size:13.5px;margin:0 0 18px;}' +
      '.gcw-field{margin-bottom:14px;}' +
      '.gcw-field label{display:block;font-size:12px;font-weight:700;color:hsl(var(--muted-foreground));margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em;}' +
      '.gcw-field input{box-sizing:border-box;width:100%;background:rgba(255,255,255,.06);border:1px solid hsl(var(--border));border-radius:calc(var(--radius,.75rem) - .25rem);color:hsl(var(--foreground));font-size:15px;padding:11px 12px;font-family:inherit;}' +
      '.gcw-error{color:hsl(var(--destructive));font-size:13px;margin:-6px 0 14px;display:none;}' +
      '.gcw-error.is-visible{display:block;}' +
      '.gcw-error a{color:inherit;text-decoration:underline;}' +
      '.gcw-submit{width:100%;background:hsl(var(--cta));color:hsl(var(--background));border:none;border-radius:calc(var(--radius,.75rem) - .25rem);font-weight:800;font-size:15px;padding:13px;cursor:pointer;text-align:center;font-family:inherit;}' +
      '.gcw-submit:disabled{opacity:.6;cursor:default;}' +
      '.gcw-cancel{display:block;width:100%;text-align:center;margin-top:10px;background:none;border:none;color:hsl(var(--muted-foreground));font-size:13.5px;cursor:pointer;padding:6px;font-family:inherit;}' +
      '.gcw-note{font-size:11.5px;color:hsl(var(--muted-foreground));margin-top:14px;text-align:center;}' +
      '</style>' +
      '<div class="gcw-dialog" role="dialog" aria-modal="true" aria-labelledby="gcwTitle">' +
      '<h3 id="gcwTitle">Un solo dato para continuar</h3>' +
      '<p class="gcw-sub">Ahí te llega la key de tu compra. Sin formularios largos ni contraseñas que recordar.</p>' +
      '<form id="gcwForm" novalidate>' +
      '<div class="gcw-field"><label for="gcwEmail">Correo</label>' +
      '<input type="email" id="gcwEmail" name="email" placeholder="tu@correo.com" autocomplete="email" required></div>' +
      '<p class="gcw-error" id="gcwError"></p>' +
      '<button type="submit" class="gcw-submit" id="gcwSubmit">Continuar</button>' +
      '<button type="button" class="gcw-cancel" id="gcwCancel">Cancelar</button>' +
      '</form>' +
      '<p class="gcw-note" id="gcwNote">Al continuar creamos tu cuenta en Hardcore Games con este correo — y esta compra te inscribe automáticamente en los sorteos activos.</p>' +
      '</div>';
    document.body.appendChild(wrap);

    var overlay = wrap;
    var form = wrap.querySelector('#gcwForm');
    var emailInput = wrap.querySelector('#gcwEmail');
    var errorEl = wrap.querySelector('#gcwError');
    var submitBtn = wrap.querySelector('#gcwSubmit');
    var cancelBtn = wrap.querySelector('#gcwCancel');
    var noteEl = wrap.querySelector('#gcwNote');
    var pending = null; // { action, combo }

    function showError(html) { errorEl.innerHTML = html; errorEl.classList.add('is-visible'); }
    function clearError() { errorEl.innerHTML = ''; errorEl.classList.remove('is-visible'); }
    function close() { overlay.classList.remove('is-open'); document.body.style.overflow = ''; }
    function resetToForm() {
      form.style.display = '';
      noteEl.style.display = '';
    }
    function resumePendingAndReload() {
      try {
        sessionStorage.setItem(PENDING_KEY, JSON.stringify({
          action: pending.action,
          license: pending.combo ? pending.combo.license : null,
          duration: pending.combo ? pending.combo.duration : null
        }));
      } catch (e) { /* storage bloqueado: sigue igual, solo no se auto-resume */ }
      location.reload();
    }

    cancelBtn.addEventListener('click', close);
    overlay.addEventListener('click', function (ev) { if (ev.target === overlay) close(); });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && overlay.classList.contains('is-open')) close();
    });

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var email = emailInput.value.trim().toLowerCase();
      if (!email || email.indexOf('@') === -1 || email.indexOf('.') === -1) {
        showError('Escribe un correo válido.');
        return;
      }
      clearError();
      submitBtn.disabled = true;
      submitBtn.textContent = 'Un momento…';

      guestRegisterAndLogin(email).then(function () {
        // Sin pantalla intermedia: directo al carrito/checkout real.
        resumePendingAndReload();
      }).catch(function (err) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Continuar';
        var code = err && err.code;
        if (code === 'EMAIL_TAKEN') {
          showError('Ya tienes una cuenta con este correo. <a href="https://www.hardcoregames.co/auth">Inicia sesión</a> y elige el plan de nuevo.');
        } else {
          showError('No pudimos continuar. Intenta de nuevo.');
        }
      });
    });

    modalEls = {
      open: function (action, combo) {
        pending = { action: action, combo: combo };
        clearError();
        resetToForm();
        emailInput.value = '';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Continuar';
        overlay.classList.add('is-open');
        document.body.style.overflow = 'hidden';
        setTimeout(function () { emailInput.focus(); }, 50);
      }
    };
    return modalEls;
  }

  // ---------------- interceptar el click cuando no hay sesión ----------------
  document.addEventListener('click', function (ev) {
    if (!onProductPage()) return;
    var btn = ev.target.closest && ev.target.closest('button');
    if (!btn) return;
    var label = btn.textContent.trim();
    var action = label === ACTION_LABELS.buy ? 'buy' : (label === ACTION_LABELS.cart ? 'cart' : null);
    if (!action) return;

    var jwt = null;
    try { jwt = localStorage.getItem('jwt_token'); } catch (e) { /* storage bloqueado */ }
    if (jwt) return; // ya hay sesión: comportamiento nativo del sitio, sin tocar

    ev.preventDefault();
    ev.stopPropagation();
    if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();

    ensureModal().open(action, getSelectedComboSignature());
  }, true);

  // ---------------- retomar la acción pendiente tras el reload ----------------
  (function tryResumePendingAction() {
    if (!onProductPage()) return;
    var raw;
    try { raw = sessionStorage.getItem(PENDING_KEY); } catch (e) { return; }
    if (!raw) return;
    var jwt = null;
    try { jwt = localStorage.getItem('jwt_token'); } catch (e) {}
    if (!jwt) return;

    var pending;
    try { pending = JSON.parse(raw); } catch (e) { pending = null; }
    try { sessionStorage.removeItem(PENDING_KEY); } catch (e) {}
    if (!pending || !pending.action) return;

    var wantLabel = ACTION_LABELS[pending.action];
    if (!wantLabel) return;

    function clickActionButton() {
      pollFor(function () {
        return Array.prototype.filter.call(document.querySelectorAll('button'), function (b) {
          return b.textContent.trim() === wantLabel;
        })[0];
      }, 4000, function (actionBtn) {
        if (actionBtn) fireRealClick(actionBtn);
      });
    }

    if (!pending.license || !pending.duration) {
      pollFor(function () { return findComboButtons()[0]; }, 8000, clickActionButton);
      return;
    }

    pollFor(function () {
      return findComboButtons().filter(function (b) {
        var s = parseSignature(b);
        return s && s.license === pending.license && s.duration === pending.duration;
      })[0];
    }, 8000, function (comboBtn) {
      if (comboBtn) fireRealClick(comboBtn);
      setTimeout(clickActionButton, 200);
    });
  })();
})();
