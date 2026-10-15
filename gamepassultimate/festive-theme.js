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
    gta6: {
      vars: {
        background: '285 55% 20%',
        card: '290 48% 25%',
        'card-2': '290 48% 28%',
        popover: '290 48% 25%',
        primary: '330 95% 62%',
        'primary-foreground': '0 0% 100%',
        secondary: '285 45% 28%',
        muted: '290 35% 32%',
        'muted-foreground': '300 25% 82%',
        accent: '183 90% 60%',
        'accent-foreground': '285 55% 14%',
        border: '315 45% 40%',
        input: '288 42% 24%',
        ring: '330 95% 62%',
        cta: '36 100% 60%',
        'cta-foreground': '285 55% 14%'
      },
      gradient: 'linear-gradient(165deg,#4b5bdc 0%,#8f4fd9 30%,#d94fa6 62%,#ff8f78 100%)',
      banner: '🌴 Bienvenido a Vice City · todo para GTA VI 🌴',
      emojis: [],
      palms: true,
      accent: '#ff2e93',
      glow: 'rgba(255,46,147,.55)'
    },
    navidad: {
      vars: {
        background: '150 55% 7%',
        card: '150 40% 11%',
        'card-2': '150 40% 13%',
        popover: '150 40% 11%',
        primary: '0 78% 50%',
        'primary-foreground': '0 0% 100%',
        secondary: '0 45% 16%',
        muted: '150 25% 19%',
        'muted-foreground': '150 10% 74%',
        accent: '48 95% 60%',
        'accent-foreground': '0 0% 8%',
        border: '150 30% 24%',
        input: '150 30% 16%',
        ring: '0 78% 50%',
        cta: '48 95% 60%',
        'cta-foreground': '150 55% 7%'
      },
      gradient: 'linear-gradient(160deg,#0d5c36 0%,#0a3d25 45%,#a50f26 130%)',
      banner: '🎄 Navidad en Hardcore Games · regala juegos 🎁',
      emojis: ['🎄', '🎁', '⭐', '🔔', '🎅', '🦌'],
      snow: true,
      lights: true,
      accent: '#c8102e',
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
    var extra = '';
    if (t.lights) {
      extra =
        '#hc-lights{position:fixed;top:0;left:0;right:0;height:46px;z-index:70;pointer-events:none;display:flex;justify-content:space-between;padding:0 6px}' +
        '#hc-lights:before{content:"";position:absolute;left:0;right:0;top:-6px;height:20px;border-bottom:2px solid #222;border-radius:0 0 50% 50%/0 0 100% 100%}' +
        '.hc-bulb{position:relative;width:11px;height:17px;margin-top:11px;border-radius:50% 50% 55% 55%;animation:hc-twinkle 1.6s ease-in-out infinite}' +
        '.hc-bulb:before{content:"";position:absolute;left:3px;top:-5px;width:5px;height:6px;background:#2b2b2b;border-radius:2px}' +
        '@keyframes hc-twinkle{0%,100%{opacity:1;filter:brightness(1.3)}50%{opacity:.4;filter:brightness(.8)}}' +
        '.hc-snow{position:absolute;top:-4vh;border-radius:50%;background:#fff;opacity:.85;animation:hc-snowfall linear infinite;box-shadow:0 0 6px rgba(255,255,255,.8)}' +
        '@keyframes hc-snowfall{0%{transform:translate3d(0,-4vh,0)}50%{transform:translate3d(24px,52vh,0)}100%{transform:translate3d(-16px,108vh,0)}}' +
        '#hc-festive-banner{background:repeating-linear-gradient(135deg,#c8102e 0 14px,#a50d25 14px 28px);padding:26px 40px 8px !important}';
    }
    if (t.palms) {
      extra +=
        'html[data-festive="gta6"] body{background:' + t.gradient + ' fixed !important}' +
        'html[data-festive="gta6"] .page-gradient{background:none !important}' +
        '#hc-festive-banner{background:linear-gradient(90deg,#ff2e93,#ff9e4a,#ff2e93);color:#2a0845;text-shadow:none;font-weight:800}' +
        '#hc-festive-banner button{color:#2a0845}' +
        '.hc-palm{position:fixed;width:78vmin;height:78vmin;pointer-events:none;z-index:-1}' +
        '.hc-palm.tl{top:-14vmin;left:-14vmin}' +
        '.hc-palm.br{bottom:-14vmin;right:-14vmin;transform:rotate(180deg)}' +
        'html[data-festive="gta6"] h1,html[data-festive="gta6"] h2{text-shadow:0 0 14px rgba(255,46,147,.6),0 0 28px rgba(45,226,230,.3)}';
    }
    return extra + (
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
      '@media (prefers-reduced-motion:reduce){.hc-fx,.hc-snow{animation:none;display:none}.hc-bulb{animation:none}}'
    );
  }

  // Telarana (SVG) para las esquinas; en Navidad se reemplaza por copos.
  var WEB =
    '<svg viewBox="0 0 150 150" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#e8e8e8" stroke-width="1.2">' +
    '<path d="M0 0 L150 0 M0 0 L0 150 M0 0 L130 80 M0 0 L80 130 M0 0 L148 38 M0 0 L38 148"/>' +
    '<path d="M30 0 Q22 22 0 30 M60 0 Q42 42 0 60 M90 0 Q62 62 0 90 M120 0 Q82 82 0 120"/>' +
    '<circle cx="62" cy="62" r="3" fill="#e8e8e8" stroke="none"/></svg>';


  // Palmera de fondo: frondas con hojuelas generadas, para que se vea como
  // las siluetas translucidas del icono de GTA VI.
  function palmSvg() {
    var col = 'rgb(52,12,110)', out = '', fr = [-25, 0, 25, 50, 75, 100, 125, 150, 175, 200, 225];
    fr.forEach(function (deg, i) {
      var ang = deg * Math.PI / 180, L = 340 + (i % 3) * 55, N = 58, prev = [20, 20];
      var dx = Math.cos(ang), dy = Math.sin(ang);
      for (var k = 1; k <= N; k++) {
        var t = k / N;
        var x = 20 + dx * L * t, y = 20 + dy * L * t + 170 * t * t;
        var tx = x - prev[0], ty = y - prev[1], tl = Math.sqrt(tx * tx + ty * ty) || 1;
        tx /= tl; ty /= tl;
        var nx = -ty, ny = tx, len = 115 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.08)), 0.7) + 16;
        [1, -1].forEach(function (sd) {
          var ex = x + (tx * 0.7 + nx * 0.7 * sd) * len, ey = y + (ty * 0.7 + ny * 0.7 * sd) * len + len * 0.3;
          var bx = nx * 5.5, by = ny * 5.5;
          out += '<path d="M' + (x - bx).toFixed(1) + ' ' + (y - by).toFixed(1) + ' Q' + ((x + ex) / 2 + nx * 4 * sd).toFixed(1) + ' ' + ((y + ey) / 2 + 10).toFixed(1) + ' ' + ex.toFixed(1) + ' ' + ey.toFixed(1) +
                 ' Q' + ((x + ex) / 2 + nx * 4 * sd).toFixed(1) + ' ' + ((y + ey) / 2 + 2).toFixed(1) + ' ' + (x + bx).toFixed(1) + ' ' + (y + by).toFixed(1) + 'Z"/>';
        });
        prev = [x, y];
      }
      out += '<path d="M20 20 Q' + (20 + dx * L * 0.5) + ' ' + (20 + dy * L * 0.5 + 40) + ' ' + (20 + dx * L) + ' ' + (20 + dy * L + 170) + '" fill="none" stroke="' + col + '" stroke-width="7"/>';
    });
    return '<svg viewBox="0 0 560 560" xmlns="http://www.w3.org/2000/svg" fill="' + col + '" opacity=".3">' + out + '</svg>';
  }

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
      for (var i = 0; i < (t.emojis.length ? 14 : 0); i++) {
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
      if (t.snow) {
        for (var j = 0; j < 40; j++) {
          var f = document.createElement('span');
          f.className = 'hc-snow';
          var sz = 3 + (j % 4) * 2;
          f.style.width = f.style.height = sz + 'px';
          f.style.left = (j * 2.6 + (j % 5)) % 100 + 'vw';
          f.style.animationDuration = 9 + (j % 7) * 2 + 's';
          f.style.animationDelay = -(j * 0.9) + 's';
          layer.appendChild(f);
        }
      }
      document.body.appendChild(layer);

      if (t.lights) {
        var lights = document.createElement('div');
        lights.id = 'hc-lights';
        lights.setAttribute('aria-hidden', 'true');
        var cols = ['#ff2a2a', '#ffd23f', '#2ecc71', '#3aa0ff'];
        var n = Math.max(12, Math.round(window.innerWidth / 38));
        for (var k = 0; k < n; k++) {
          var bulb = document.createElement('span');
          bulb.className = 'hc-bulb';
          bulb.style.background = cols[k % 4];
          bulb.style.boxShadow = '0 0 10px 2px ' + cols[k % 4];
          bulb.style.animationDelay = (k % 4) * 0.4 + 's';
          lights.appendChild(bulb);
        }
        document.body.appendChild(lights);
      }

      if (t.palms) {
        ['tl', 'br'].forEach(function (pos) {
          var p = document.createElement('div');
          p.className = 'hc-palm ' + pos;
          p.setAttribute('aria-hidden', 'true');
          p.innerHTML = palmSvg();
          document.body.appendChild(p);
        });
      }

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
    ['hc-festive-css', 'hc-festive-banner', 'hc-festive-layer', 'hc-lights'].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.remove();
    });
    Array.prototype.forEach.call(document.querySelectorAll('.hc-corner,.hc-palm'), function (el) { el.remove(); });
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
