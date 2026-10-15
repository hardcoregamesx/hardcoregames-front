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
      gradient: 'radial-gradient(70% 45% at 100% 0%,#4f94c2 0%,rgba(79,148,194,0) 100%),linear-gradient(180deg,#5a4aa8 0%,#9a6bb0 32%,#e07fa0 62%,#f28f7c 100%)',
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
        '.hc-palm{position:fixed;inset:0;pointer-events:none;z-index:-1}' +
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


  // Palmeras de fondo (siluetas propias, estilo atardecer tropical): troncos
  // altos y curvos, coronas de frondas plumosas con hojuelas colgantes.
  // PRNG con semilla para que el dibujo sea identico en cada carga.
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function palmPath(P, rand) {
    var d = '', u = P.u * P.s;
    // tronco: bezier cuadratica base->corona, ancho decreciente
    var bx = P.bx, by = P.by, cx = P.cx, cy = P.cy, kx = (bx + cx) / 2 + P.lean * u, ky = (by + cy) / 2;
    var L = [], R = [], n = 24, i, t, x, y, tx, ty, tl, w;
    for (i = 0; i <= n; i++) {
      t = i / n;
      x = (1 - t) * (1 - t) * bx + 2 * (1 - t) * t * kx + t * t * cx;
      y = (1 - t) * (1 - t) * by + 2 * (1 - t) * t * ky + t * t * cy;
      tx = 2 * (1 - t) * (kx - bx) + 2 * t * (cx - kx); ty = 2 * (1 - t) * (ky - by) + 2 * t * (cy - ky);
      tl = Math.sqrt(tx * tx + ty * ty) || 1;
      w = (0.034 - 0.020 * t) * u;
      L.push([x - ty / tl * w, y + tx / tl * w]); R.push([x + ty / tl * w, y - tx / tl * w]);
    }
    d += 'M' + L[0][0].toFixed(1) + ' ' + L[0][1].toFixed(1);
    for (i = 1; i <= n; i++) d += 'L' + L[i][0].toFixed(1) + ' ' + L[i][1].toFixed(1);
    for (i = n; i >= 0; i--) d += 'L' + R[i][0].toFixed(1) + ' ' + R[i][1].toFixed(1);
    d += 'Z';
    // frondas
    var angles = [-172, -150, -128, -105, -82, -58, -34, -10, 14, 38, 150, 172, 196];
    angles.forEach(function (deg, fi) {
      var a = (deg + (rand() - 0.5) * 10) * Math.PI / 180;
      var FL = u * (0.46 + rand() * 0.22) * (Math.abs(Math.sin(a)) > 0.8 ? 0.8 : 1);
      var G = FL * (0.5 + 0.55 * Math.abs(Math.cos(a)));
      var dx = Math.cos(a), dy = Math.sin(a), N = 38, prev = [cx, cy];
      for (var k = 1; k <= N; k++) {
        var tt = k / N, px = cx + dx * FL * tt, py = cy + dy * FL * tt + G * tt * tt;
        var ux = px - prev[0], uy = py - prev[1], ul = Math.sqrt(ux * ux + uy * uy) || 1;
        ux /= ul; uy /= ul;
        var prof = Math.pow(Math.sin(Math.PI * Math.min(1, 0.06 + tt * 0.94)), 0.85);
        [1, -1].forEach(function (sd) {
          var ln = u * 0.24 * prof * (0.65 + rand() * 0.7) + u * 0.012;
          var nx = -uy * sd, ny = ux * sd;
          var vx = ux * 0.42 + nx * 0.5, vy = uy * 0.42 + ny * 0.5 + 0.62 + rand() * 0.2, vl = Math.sqrt(vx * vx + vy * vy);
          var ex = px + vx / vl * ln, ey = py + vy / vl * ln;
          var mx = (px + ex) / 2 + nx * ln * 0.12, my = (py + ey) / 2 - ln * 0.08, hw = u * 0.0075;
          d += 'M' + px.toFixed(1) + ' ' + (py - hw).toFixed(1) + 'Q' + mx.toFixed(1) + ' ' + (my - hw).toFixed(1) + ' ' + ex.toFixed(1) + ' ' + ey.toFixed(1) +
               'Q' + mx.toFixed(1) + ' ' + (my + hw).toFixed(1) + ' ' + px.toFixed(1) + ' ' + (py + hw).toFixed(1) + 'Z';
        });
        prev = [px, py];
      }
      // raquis (nervio central)
      var sp = 'M' + cx + ' ' + cy;
      for (var q = 1; q <= 12; q++) { var qt = q / 12; sp += 'L' + (cx + dx * FL * qt).toFixed(1) + ' ' + (cy + dy * FL * qt + G * qt * qt).toFixed(1); }
      d += sp + 'L' + (cx + dx * FL).toFixed(1) + ' ' + (cy + dy * FL + G + 2).toFixed(1) + 'L' + cx + ' ' + (cy + u * 0.012).toFixed(1) + 'Z';
    });
    return d;
  }

  function palmsSvg() {
    var W = window.innerWidth, H = window.innerHeight, u = Math.min(W, H * 1.3) * 0.5;
    var palms = [
      { cx: W * 0.88, cy: H * 0.30, bx: W * 0.84, by: H + 20, s: 1.0, lean: 0.10, fill: 'rgb(98,42,104)', op: 0.55, seed: 7 },
      { cx: W * 0.12, cy: H * 0.34, bx: W * 0.17, by: H + 20, s: 1.0, lean: -0.08, fill: 'rgb(98,42,104)', op: 0.55, seed: 21 },
      { cx: W * 0.30, cy: H * 0.64, bx: W * 0.27, by: H + 20, s: 0.55, lean: 0.05, fill: 'rgb(118,78,150)', op: 0.40, seed: 33 },
      { cx: W * 0.74, cy: H * 0.70, bx: W * 0.77, by: H + 20, s: 0.5, lean: -0.05, fill: 'rgb(118,78,150)', op: 0.40, seed: 45 }
    ];
    var out = '';
    palms.forEach(function (P) {
      P.u = u;
      out += '<path d="' + palmPath(P, rng(P.seed)) + '" fill="' + P.fill + '" fill-opacity="' + P.op + '"/>';
    });
    return '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">' + out + '</svg>';
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
        var pl = document.createElement('div');
        pl.className = 'hc-palm';
        pl.setAttribute('aria-hidden', 'true');
        pl.innerHTML = palmsSvg();
        document.body.appendChild(pl);
        var rt;
        window.addEventListener('resize', function () {
          clearTimeout(rt);
          rt = setTimeout(function () { var el = document.querySelector('.hc-palm'); if (el) el.innerHTML = palmsSvg(); }, 250);
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
