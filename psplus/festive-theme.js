/*
 * Tema festivo de hardcoregames.co (Halloween / Navidad).
 *
 * UNA sola fuente para todo el sitio: frontend-v2 la carga desde
 * /festive-theme.js y las landings del repo hardcoregames-front llevan una
 * copia identica (fc27, psplus, gamepassultimate, grandtheftautovi, fisicos,
 * politica-tratamiento-datos, rewards). Si cambias este archivo, copialo a
 * todos esos lugares (ver scripts/sync-festive-theme.sh en hardcoregames-front).
 *
 * El switch vive en el admin de Django: Variables de sistema -> tema_festivo.
 * Este script consulta GET /products/festiveTheme y, si hay tema, inyecta CSS
 * (variables de marca + decoracion) y elementos decorativos. Sin tema: no hace
 * nada. Si la API falla: no hace nada (el sitio sigue normal).
 */
(function () {
  'use strict';
  if (window.__hcFestive) return;
  window.__hcFestive = true;

  var API = 'https://admin.hardcoregames.co/products/festiveTheme';
  var CACHE_KEY = 'hc_festive_theme';
  var root = document.documentElement;

  // Paletas. "tri" = formato triplete de frontend-v2 (hsl(var(--x))),
  // "full" = formato hsl() completo que usan las landings viejas.
  var THEMES = {
    halloween: {
      vars: {
        background: '20 45% 6%',
        card: '22 40% 10%',
        'card-2': '22 40% 12%',
        popover: '22 40% 10%',
        primary: '28 100% 50%',
        'primary-foreground': '0 0% 8%',
        secondary: '270 40% 16%',
        muted: '25 25% 18%',
        'muted-foreground': '30 15% 70%',
        accent: '95 70% 50%',
        'accent-foreground': '0 0% 8%',
        border: '25 40% 22%',
        input: '25 35% 16%',
        ring: '28 100% 50%',
        cta: '28 100% 52%',
        'cta-foreground': '20 45% 6%'
      },
      gradient: 'linear-gradient(135deg,#2a0845 0%,#7a2e00 55%,#ff7a00 120%)',
      banner: '🎃 Halloween en Hardcore Games · ofertas de terror 👻',
      emojis: ['🦇', '🎃', '👻', '🕷️', '🦇', '💀'],
      accent: '#ff7a00',
      glow: 'rgba(255,122,0,.45)'
    },
    navidad: {
      vars: {
        background: '350 55% 8%',
        card: '350 45% 12%',
        'card-2': '350 45% 14%',
        popover: '350 45% 12%',
        primary: '0 78% 50%',
        'primary-foreground': '0 0% 100%',
        secondary: '150 40% 14%',
        muted: '350 25% 20%',
        'muted-foreground': '350 10% 72%',
        accent: '145 65% 50%',
        'accent-foreground': '0 0% 8%',
        border: '350 35% 24%',
        input: '350 30% 18%',
        ring: '0 78% 50%',
        cta: '48 95% 60%',
        'cta-foreground': '350 55% 8%'
      },
      gradient: 'linear-gradient(135deg,#0b3d20 0%,#7a0c1c 100%)',
      banner: '🎄 Navidad en Hardcore Games · regala juegos 🎁',
      emojis: ['❄️', '🎄', '❄️', '🎁', '⭐', '❄️'],
      accent: '#e11d2e',
      glow: 'rgba(225,29,46,.4)'
    }
  };

  function readCache() {
    try { return sessionStorage.getItem(CACHE_KEY); } catch (e) { return null; }
  }
  function writeCache(v) {
    try { sessionStorage.setItem(CACHE_KEY, v); } catch (e) { /* ignorar */ }
  }

  function isFullHslSite() {
    var v = getComputedStyle(root).getPropertyValue('--background').trim();
    return v.indexOf('hsl') === 0;
  }

  function buildCss(name, t) {
    var full = isFullHslSite();
    var vars = '';
    for (var k in t.vars) {
      vars += '--' + k + ':' + (full ? 'hsl(' + t.vars[k] + ')' : t.vars[k]) + ';';
    }
    vars += '--gradient-bg:' + t.gradient + ';';
    var a = t.accent;
    return (
      'html[data-festive="' + name + '"]{' + vars + '}' +
      'html[data-festive="' + name + '"] body{background-color:' +
        (full ? 'hsl(' + t.vars.background + ')' : 'hsl(' + t.vars.background + ')') + ';}' +
      '#hc-festive-banner{position:relative;z-index:60;text-align:center;font:600 13px/1.3 ui-sans-serif,system-ui,sans-serif;' +
        'padding:7px 40px;color:#fff;background:linear-gradient(90deg,#1a0a00,' + a + ',#1a0a00);letter-spacing:.02em;' +
        'text-shadow:0 1px 2px rgba(0,0,0,.5)}' +
      '#hc-festive-banner button{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:0;' +
        'color:#fff;font-size:16px;cursor:pointer;opacity:.8}' +
      '#hc-festive-layer{position:fixed;inset:0;pointer-events:none;z-index:40;overflow:hidden}' +
      '.hc-fx{position:absolute;top:-8vh;will-change:transform;animation:hc-fall linear infinite;filter:drop-shadow(0 0 6px ' + t.glow + ')}' +
      '@keyframes hc-fall{0%{transform:translate3d(0,-8vh,0) rotate(0)}50%{transform:translate3d(30px,55vh,0) rotate(180deg)}100%{transform:translate3d(-20px,112vh,0) rotate(360deg)}}' +
      '.hc-corner{position:fixed;top:0;width:110px;height:110px;pointer-events:none;z-index:41;opacity:.4}' +
      '.hc-corner.l{left:0}.hc-corner.r{right:0;transform:scaleX(-1)}' +
      'html[data-festive="' + name + '"] a:hover,html[data-festive="' + name + '"] button:hover{text-shadow:0 0 12px ' + t.glow + '}' +
      '@media (max-width:640px){.hc-corner{width:70px;height:70px}}' +
      '@media (prefers-reduced-motion:reduce){.hc-fx{animation:none;display:none}}'
    );
  }

  // Telarana (SVG) para las esquinas; en Navidad se reemplaza por copos.
  var WEB =
    '<svg viewBox="0 0 150 150" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#e8e8e8" stroke-width="1.2">' +
    '<path d="M0 0 L150 0 M0 0 L0 150 M0 0 L130 80 M0 0 L80 130 M0 0 L148 38 M0 0 L38 148"/>' +
    '<path d="M30 0 Q22 22 0 30 M60 0 Q42 42 0 60 M90 0 Q62 62 0 90 M120 0 Q82 82 0 120"/>' +
    '<circle cx="62" cy="62" r="3" fill="#e8e8e8" stroke="none"/></svg>';

  function apply(name) {
    var t = THEMES[name];
    if (!t || document.getElementById('hc-festive-css')) return;
    root.setAttribute('data-festive', name);

    var style = document.createElement('style');
    style.id = 'hc-festive-css';
    style.textContent = buildCss(name, t);
    document.head.appendChild(style);

    function decorate() {
      if (document.getElementById('hc-festive-layer')) return;
      // Banner superior (descartable por sesion).
      var dismissed = false;
      try { dismissed = sessionStorage.getItem('hc_festive_banner_x') === '1'; } catch (e) { /* ignorar */ }
      if (!dismissed) {
        var b = document.createElement('div');
        b.id = 'hc-festive-banner';
        b.textContent = t.banner;
        var x = document.createElement('button');
        x.setAttribute('aria-label', 'Cerrar');
        x.textContent = '×';
        x.onclick = function () {
          b.remove();
          try { sessionStorage.setItem('hc_festive_banner_x', '1'); } catch (e) { /* ignorar */ }
        };
        b.appendChild(x);
        document.body.insertBefore(b, document.body.firstChild);
      }

      // Capa de elementos cayendo (liviana: 14 nodos).
      var layer = document.createElement('div');
      layer.id = 'hc-festive-layer';
      layer.setAttribute('aria-hidden', 'true');
      for (var i = 0; i < 14; i++) {
        var s = document.createElement('span');
        s.className = 'hc-fx';
        s.textContent = t.emojis[i % t.emojis.length];
        s.style.left = (i * 7.3 + (i % 3) * 2) % 98 + 'vw';
        s.style.fontSize = 16 + (i % 4) * 7 + 'px';
        s.style.animationDuration = 14 + (i % 5) * 4 + 's';
        s.style.animationDelay = -(i * 2.1) + 's';
        s.style.opacity = '.75';
        layer.appendChild(s);
      }
      document.body.appendChild(layer);

      if (name === 'halloween') {
        ['l', 'r'].forEach(function (side) {
          var c = document.createElement('div');
          c.className = 'hc-corner ' + side;
          c.setAttribute('aria-hidden', 'true');
          c.innerHTML = WEB;
          document.body.appendChild(c);
        });
      }
    }

    if (document.body) decorate();
    else document.addEventListener('DOMContentLoaded', decorate);
  }

  function clear() {
    ['hc-festive-css', 'hc-festive-banner', 'hc-festive-layer'].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.remove();
    });
    Array.prototype.forEach.call(document.querySelectorAll('.hc-corner'), function (el) { el.remove(); });
    root.removeAttribute('data-festive');
  }

  var cached = readCache();
  if (cached && cached !== 'none') apply(cached); // evita parpadeo en navegaciones siguientes

  var ctl = window.AbortController ? new AbortController() : null;
  var timer = ctl ? setTimeout(function () { ctl.abort(); }, 4000) : null;
  fetch(API, ctl ? { signal: ctl.signal } : undefined)
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (timer) clearTimeout(timer);
      if (!d || typeof d.theme !== 'string') return;
      writeCache(d.theme);
      if (d.theme === cached && document.getElementById('hc-festive-css')) return;
      clear();
      if (d.theme !== 'none') apply(d.theme);
    })
    .catch(function () { /* sin tema si la API no responde */ });
})();
