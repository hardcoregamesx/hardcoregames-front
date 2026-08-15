/* Hardcore Rewards / patrón de widgets: no toca el bundle de la app.
 * Cuando alguien compró como invitado (checkout de invitado, cuenta
 * silenciosa sin contraseña propia) e intenta iniciar sesión más tarde en
 * /auth, el backend (FastAPI POST /auth/login, ver util_auth.get_current_complete_user
 * y auth.py login()) responde 401 con un detail distinto al genérico,
 * reconocible por la frase "Completa tu registro" — ver la constante
 * CLAIM_MARKER, debe coincidir con el texto que devuelve el backend.
 *
 * Este widget intercepta esa respuesta y, en vez de dejar que el usuario se
 * quede viendo el mensaje sin saber qué hacer, lo lleva directo al tab
 * "Registrarse" con el correo ya puesto — así completa nombre y contraseña
 * sobre la misma cuenta (con su historial de compras intacto) sin ver nunca
 * "ya estás registrado".
 */
(function () {
  if (location.pathname !== '/auth') return;

  var LOGIN_API = 'https://api.srv936408.hstgr.cloud/auth/login';
  var CLAIM_MARKER = 'Completa tu registro';

  function setNativeInputValue(input, value) {
    // Los inputs controlados de React ignoran `input.value = x` porque el
    // setter nativo que React parcheó no dispara su propio evento interno.
    // Hay que llamar al setter original del prototipo y luego despachar un
    // evento 'input' real para que React vea el cambio.
    var proto = window.HTMLInputElement.prototype;
    var nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    nativeSetter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function pollFor(finder, timeoutMs, cb) {
    var start = Date.now();
    (function tick() {
      var el;
      try { el = finder(); } catch (e) { el = null; }
      if (el) { cb(el); return; }
      if (Date.now() - start > timeoutMs) { cb(null); return; }
      setTimeout(tick, 100);
    })();
  }

  function fireRealClick(el) {
    var rect = el.getBoundingClientRect();
    var opts = { bubbles: true, cancelable: true, view: window, clientX: rect.x + rect.width / 2, clientY: rect.y + rect.height / 2, button: 0 };
    ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(function (type) {
      el.dispatchEvent(new MouseEvent(type, opts));
    });
  }

  function findLoginEmailValue() {
    var input = document.querySelector('input[type="email"]');
    return input ? input.value.trim() : '';
  }

  function goToRegisterWithEmail(email) {
    var registerTab = Array.prototype.filter.call(document.querySelectorAll('button'), function (b) {
      return b.textContent.trim() === 'Registrarse';
    })[0];
    if (!registerTab) return;
    fireRealClick(registerTab);

    if (!email) return;
    pollFor(function () {
      return document.querySelector('input[type="email"]');
    }, 3000, function (input) {
      if (input) setNativeInputValue(input, email);
    });
  }

  var originalFetch = window.fetch;
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    var isLoginCall = url.indexOf(LOGIN_API) !== -1 && init && /post/i.test(init.method || '');

    if (!isLoginCall) return originalFetch.apply(this, arguments);

    var typedEmail = findLoginEmailValue();
    return originalFetch.apply(this, arguments).then(function (response) {
      if (response.status !== 401) return response;
      var clone = response.clone();
      clone.json().then(function (body) {
        var detail = (body && body.detail) || '';
        if (detail.indexOf(CLAIM_MARKER) !== -1) {
          goToRegisterWithEmail(typedEmail);
        }
      }).catch(function () { /* respuesta sin JSON: se deja el manejo nativo */ });
      return response;
    });
  };
})();
