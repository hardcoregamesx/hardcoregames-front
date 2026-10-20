/* Moneda de visualización para las landings (COP / USD / MXN / CLP).
 *
 * Espejo de frontend-v2 (src/lib/currency.ts + currency-context.tsx): usa las
 * MISMAS claves de localStorage ("currency", "currency_country") y los mismos
 * endpoints (/api/geo, /api/rates, que sirve frontend-v2 en este mismo
 * dominio), así que la moneda elegida en la tienda se conserva aquí y al revés.
 *
 * Solo convierte lo que se MUESTRA. Los precios del catálogo vienen en COP y el
 * cobro es siempre en COP.
 *
 * Este archivo vive duplicado en fc27/ y grandtheftautovi/ porque hclandings
 * solo enruta esos prefijos a este nginx (mismo motivo que festive-theme.js).
 * Si lo editas, copia el cambio a la otra carpeta.
 */
(function () {
  var KEY_CURRENCY = 'currency';
  var KEY_COUNTRY = 'currency_country';
  var CURRENCIES = ['COP', 'USD', 'MXN', 'CLP'];
  // Unidades de cada moneda por 1 USD. Respaldo si /api/rates no responde.
  var FALLBACK_RATES = { USD: 1, COP: 3190, MXN: 18.5, CLP: 985 };
  var FORMAT = { COP: ['es-CO', 0], USD: ['en-US', 2], MXN: ['es-MX', 0], CLP: ['es-CL', 0] };
  var COUNTRY_TO_CURRENCY = { CO: 'COP', MX: 'MXN', CL: 'CLP' };
  var TZ_TO_COUNTRY = {
    'America/Bogota': 'CO',
    'America/Mexico_City': 'MX', 'America/Cancun': 'MX', 'America/Merida': 'MX', 'America/Monterrey': 'MX',
    'America/Tijuana': 'MX', 'America/Chihuahua': 'MX', 'America/Hermosillo': 'MX', 'America/Mazatlan': 'MX',
    'America/Santiago': 'CL', 'America/Punta_Arenas': 'CL'
  };

  var currency = 'COP';
  var rates = FALLBACK_RATES;
  var listeners = [];

  function read(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } }
  function write(key, value) { try { window.localStorage.setItem(key, value); } catch (e) { /* modo privado: no se recuerda */ } }
  function isCurrency(v) { return CURRENCIES.indexOf(v) !== -1; }

  var saved = read(KEY_CURRENCY);
  if (isCurrency(saved)) currency = saved;

  function currencyForCountry(country) {
    if (!country) return 'COP';
    return COUNTRY_TO_CURRENCY[String(country).toUpperCase()] || 'USD';
  }
  function countryFromTimezone() {
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return TZ_TO_COUNTRY[tz] || (tz ? 'XX' : null); // "XX" = fuera de CO/MX/CL -> USD
    } catch (e) { return null; }
  }

  function convert(valueCop) {
    if (currency === 'COP') return valueCop;
    return (valueCop / (rates.COP || FALLBACK_RATES.COP)) * (rates[currency] || FALLBACK_RATES[currency]);
  }
  // "USD $53.41" / "MXN $924" / "CLP $47.480"
  function money(valueCop) {
    var f = FORMAT[currency];
    var text = convert(valueCop).toLocaleString(f[0], { minimumFractionDigits: f[1], maximumFractionDigits: f[1] });
    return currency + ' $' + text;
  }
  // En COP conserva el formato corto de las landings: "$169.990".
  function short(valueCop) {
    if (currency === 'COP') return '$' + Math.round(Number(valueCop)).toLocaleString('es-CO');
    return money(Number(valueCop));
  }

  // Reemplaza montos "$150.000" (con o sin " COP" detrás) dentro de un texto.
  function localizeText(text) {
    if (currency === 'COP' || typeof text !== 'string') return text;
    return text.replace(/\$\s?(\d{1,3}(?:\.\d{3})+)(\s*COP)?/g, function (_m, digits) {
      return money(Number(digits.replace(/\./g, '')));
    });
  }
  function deep(value) {
    if (typeof value === 'string') return localizeText(value);
    if (Array.isArray(value)) return value.map(deep);
    if (value && typeof value === 'object') {
      var out = {};
      Object.keys(value).forEach(function (k) { out[k] = deep(value[k]); });
      return out;
    }
    return value;
  }
  // Contenido editable de la landing (variable de sistema): convierte los montos
  // y, si la unidad suelta es "COP", la quita para no mostrar "USD $9 COP".
  function localizeContent(content) {
    if (currency === 'COP') return content;
    var out = deep(content);
    if (typeof out.price_unit === 'string' && out.price_unit.trim().toUpperCase() === 'COP') out.price_unit = '';
    return out;
  }

  // ---------------- selector (barra sobre el footer) ----------------
  function injectStyles() {
    if (document.getElementById('hcCurrencyStyles')) return;
    var style = document.createElement('style');
    style.id = 'hcCurrencyStyles';
    style.textContent =
      '#hcCurrencyBar{display:flex;flex-direction:column;align-items:center;gap:8px;padding:22px 16px 6px;text-align:center}' +
      '#hcCurrencyBar .hc-cur-row{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px}' +
      '#hcCurrencyBar .hc-cur-label{font-size:14px;font-weight:600;color:var(--foreground,#fff)}' +
      '#hcCurrencyBar button{cursor:pointer;font:inherit;font-size:14px;font-weight:700;padding:4px 14px;border-radius:999px;' +
        'border:1px solid var(--border,#3d2a63);background:var(--secondary,#2b1a52);color:var(--muted-foreground,#b9b0cf);transition:background .15s,color .15s,border-color .15s}' +
      '#hcCurrencyBar button:hover{border-color:var(--cta,#f5c542);color:var(--foreground,#fff)}' +
      '#hcCurrencyBar button[aria-pressed="true"]{background:var(--cta,#f5c542);border-color:var(--cta,#f5c542);color:var(--cta-foreground,#1a0b33)}' +
      '#hcCurrencyBar .hc-cur-hint{font-size:12px;color:var(--muted-foreground,#b9b0cf);max-width:52ch}';
    document.head.appendChild(style);
  }

  function buildBar() {
    var footer = document.getElementById('v-footer') || document.querySelector('footer');
    if (!footer || document.getElementById('hcCurrencyBar')) return;
    injectStyles();
    var bar = document.createElement('div');
    bar.id = 'hcCurrencyBar';
    var row = document.createElement('div');
    row.className = 'hc-cur-row';
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', 'Moneda');
    var label = document.createElement('span');
    label.className = 'hc-cur-label';
    label.textContent = 'Moneda:';
    row.appendChild(label);
    CURRENCIES.forEach(function (code) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = code;
      btn.setAttribute('data-currency', code);
      btn.addEventListener('click', function () { setCurrency(code); });
      row.appendChild(btn);
    });
    var hint = document.createElement('p');
    hint.className = 'hc-cur-hint';
    hint.textContent = 'Los precios en otras monedas son aproximados; el cobro se hace en COP.';
    bar.appendChild(row);
    bar.appendChild(hint);
    footer.parentNode.insertBefore(bar, footer);
    updateUI();
  }

  function updateUI() {
    var buttons = document.querySelectorAll('#hcCurrencyBar button[data-currency]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute('aria-pressed', buttons[i].getAttribute('data-currency') === currency ? 'true' : 'false');
    }
    // Etiqueta "Español  COP" del botón de idioma del header.
    var labels = document.querySelectorAll('.site-locale-btn .locale-text');
    for (var j = 0; j < labels.length; j++) labels[j].innerHTML = 'Español&nbsp;&nbsp;' + currency;
  }

  function notify() {
    updateUI();
    listeners.slice().forEach(function (fn) { try { fn(); } catch (e) { /* un listener roto no frena a los demás */ } });
  }

  function setCurrency(next) {
    if (!isCurrency(next) || next === currency) return;
    currency = next;
    write(KEY_CURRENCY, next);
    notify();
  }

  // ---------------- detección de país y tasas ----------------
  function detectCountry() {
    return fetch('/api/geo', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) { return (data && data.country) ? String(data.country).toUpperCase() : countryFromTimezone(); })
      .catch(function () { return countryFromTimezone(); });
  }

  // El país se vuelve a detectar en cada visita pero solo decide la moneda si
  // la persona no eligió una a mano.
  detectCountry().then(function (country) {
    if (!country) return;
    write(KEY_COUNTRY, country);
    if (!isCurrency(read(KEY_CURRENCY))) {
      var detected = currencyForCountry(country);
      if (detected !== currency) { currency = detected; notify(); }
    }
  });

  fetch('/api/rates')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      var r = data && data.rates;
      if (!r || !(r.COP > 0) || !(r.MXN > 0) || !(r.CLP > 0)) return;
      rates = { USD: 1, COP: r.COP, MXN: r.MXN, CLP: r.CLP };
      if (currency !== 'COP') notify();
    })
    .catch(function () { /* se queda con FALLBACK_RATES */ });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildBar);
  else buildBar();

  window.HCCurrency = {
    short: short,
    localizeContent: localizeContent,
    getCurrency: function () { return currency; },
    setCurrency: setCurrency,
    onChange: function (fn) { listeners.push(fn); }
  };
})();
