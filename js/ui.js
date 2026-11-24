/* =====================================================================
   DinoCaza AR · ui.js
   Pantallas: mapa del parque, álbum, equipo, pasaporte, premios,
   fichas educativas, ajustes, panel Dino Park, avisos y modales.
   ===================================================================== */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var S = function () { return DC.Store.get(); };
  var tab = 'map';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function icon(id, cls) { return '<svg class="icon ' + (cls || '') + '" aria-hidden="true"><use href="#i-' + id + '"/></svg>'; }
  function typeChip(t) { var x = DC.TYPES[t]; return '<span class="chip type" style="background:' + x.color + '">' + x.name + '</span>'; }
  function stars(r) { var n = DC.RARITY[r].stars; return '<span class="stars" aria-label="' + DC.RARITY[r].name + '">' + '★'.repeat(n) + '<span style="opacity:.25">' + '★'.repeat(4 - n) + '</span></span>'; }
  function pct(a, b) { return Math.max(0, Math.min(100, b ? a / b * 100 : 0)); }
  function hpClass(p) { return p < 25 ? 'low' : p < 55 ? 'mid' : ''; }
  function img(spId, cls, alt) { return '<img data-sp="' + spId + '" class="' + (cls || '') + '" alt="' + esc(alt || '') + '" width="220" height="220">'; }

  /* Rellena los retratos 3D de forma progresiva */
  var pq = [];
  function fillPortraits(root) {
    (root || document).querySelectorAll('img[data-sp]:not([src])').forEach(function (el) { pq.push(el); });
    pump();
  }
  var pumping = false;
  function pump() {
    if (pumping) return;
    pumping = true;
    (function step() {
      var t0 = performance.now();
      while (pq.length && performance.now() - t0 < 30) {
        var el = pq.shift();
        if (!el.isConnected || el.src) continue;
        try { el.src = DC.portrait(el.dataset.sp); } catch (e) { /* sin WebGL */ }
        /* el mismo retrato para todas las imágenes de esa especie */
        document.querySelectorAll('img[data-sp="' + el.dataset.sp + '"]:not([src])').forEach(function (o) { o.src = el.src; });
      }
      if (pq.length) setTimeout(step, 16); else pumping = false;
    })();
  }

  /* ---------------- Avisos y modales ---------------- */
  function toast(html, ic) {
    var t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = icon(ic || 'star') + '<span>' + html + '</span>';
    $('#toasts').appendChild(t);
    setTimeout(function () { t.style.transition = 'opacity .4s'; t.style.opacity = '0'; }, 2600);
    setTimeout(function () { t.remove(); }, 3100);
  }
  function modal(html, o) {
    o = o || {};
    var back = document.createElement('div');
    back.className = 'modal-back' + (o.center ? ' center' : '');
    back.innerHTML = '<div class="sheet" role="dialog" aria-modal="true">' + (o.center ? '' : '<div class="grab"></div>') + html + '</div>';
    back.addEventListener('click', function (e) { if (e.target === back && !o.locked) close(); });
    $('#overlay').appendChild(back);
    function close() { if (!back.isConnected) return; back.remove(); o.onClose && o.onClose(); }
    back.close = close;
    fillPortraits(back);
    var f = back.querySelector('[autofocus]'); if (f) setTimeout(function () { f.focus(); }, 50);
    return back;
  }
  function closeModals() { document.querySelectorAll('#overlay .modal-back').forEach(function (m) { m.close ? m.close() : m.remove(); }); }

  /* ---------------- Barra superior y pestañas ---------------- */
  function renderTop() {
    var s = S();
    var need = DC.xpToNext(s.level);
    $('#topbar').innerHTML =
      '<div class="avatar" aria-hidden="true">' + esc((s.name || 'D')[0].toUpperCase()) + '</div>' +
      '<div class="who"><div class="name">' + esc(s.name || 'Explorador') + '</div>' +
      '<div class="lvl"><span class="num">Nv. ' + s.level + '</span><span>·</span><span>' + DC.titleFor(s.level) + '</span></div>' +
      '<div class="bar xp" title="Experiencia ' + s.xp + ' de ' + need + '"><i style="width:' + pct(s.xp, need) + '%"></i></div></div>' +
      '<div class="res"><span class="pill num" title="Dino-monedas">' + icon('coin', 'coin-i') + s.coins + '</span>' +
      '<span class="pill num" title="Dinoesferas">' + icon('sphere', 'sphere-i') + s.spheres + '</span></div>' +
      '<button class="icon-btn" data-act="settings" aria-label="Ajustes">' + icon('gear') + '</button>';
  }
  function renderTabs() {
    var s = S();
    var claim = s.visit ? s.visit.missions.filter(function (m) { return m.done && !m.claimed; }).length : 0;
    var tabs = [['map', 'map', 'Mapa', claim], ['album', 'book', 'Álbum', 0], ['team', 'team', 'Equipo', 0], ['passport', 'passport', 'Pasaporte', 0], ['prizes', 'gift', 'Premios', s.codes.filter(function (c) { return !c.redeemed; }).length]];
    $('#tabbar').innerHTML = tabs.map(function (t) {
      return '<button data-act="tab" data-tab="' + t[0] + '"' + (tab === t[0] ? ' aria-current="page"' : '') + '>' + icon(t[1]) + t[2] +
        (t[3] ? '<span class="badge num">' + t[3] + '</span>' : '') + '</button>';
    }).join('');
  }
  function render() {
    renderTop(); renderTabs();
    var v = $('#view');
    var fn = { map: viewMap, album: viewAlbum, team: viewTeam, passport: viewPassport, prizes: viewPrizes }[tab];
    v.innerHTML = fn();
    fillPortraits(v);
  }
  function go(t) { tab = t; render(); $('#view').scrollTop = 0; }

  /* =====================================================================
     MAPA
     ===================================================================== */
  function glyph(g) {
    var p = {
      horn: '<path d="M-11 7c2-9 9-15 20-17-6 5-8 11-8 18zM-3 -2l-9-8M3 -5l3-9" />',
      fern: '<path d="M0 11V-11M0 -7l-7-3M0 -7l7-3M0 -1l-9-3M0 -1l9-3M0 5l-8-3M0 5l8-3"/>',
      wave: '<path d="M-12 -2q3-5 6 0t6 0 6 0 6 0M-12 6q3-5 6 0t6 0 6 0 6 0"/>',
      wing: '<path d="M-13 3 0-9 13 3 3 0 0 8-3 0z"/>',
      crown: '<path d="M-11 7v-12l6 6 5-9 5 9 6-6v12z"/>'
    }[g];
    return '<g fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' + p + '</g>';
  }
  function mapSVG() {
    var s = S(), v = s.visit || { zones: [] };
    var Z = DC.ZONES;
    var seed = 5; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    var trees = '';
    for (var i = 0; i < 70; i++) {
      var x = rnd() * 360, y = 130 + rnd() * 390, r = 5 + rnd() * 7;
      var near = Z.some(function (z) { return Math.hypot(z.x - x, z.y - y) < 46; }) || Math.abs(x - 180) < 18 && y > 470;
      if (near) continue;
      trees += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="' + (i % 3 ? '#2e5a37' : '#3d6e3f') + '"/>';
    }
    var path = 'M180 515 C180 470 100 470 92 430 S 240 400 252 360 S 110 300 96 268 S 250 230 258 190 S 170 140 160 104';
    var next = Z.find(function (z) { return v.zones.indexOf(z.id) < 0; });
    var last = v.zones.length ? Z.find(function (z) { return z.id === v.zones[v.zones.length - 1]; }) : null;
    var nodes = Z.map(function (z) {
      var sp = DC.SPECIES.filter(function (x) { return x.zone === z.id; });
      var got = sp.filter(function (x) { return s.album[x.id] && s.album[x.id].caught; }).length;
      var done = v.zones.indexOf(z.id) >= 0;
      var C = 2 * Math.PI * 34;
      return '<g class="zone-node" data-act="zone" data-zone="' + z.id + '" tabindex="0" role="button" aria-label="' + esc(z.name) + '" transform="translate(' + z.x + ' ' + z.y + ')">' +
        (next && next.id === z.id ? '<circle class="pulse" r="30" fill="' + z.color + '" opacity=".5"/>' : '') +
        '<circle r="31" fill="#0e1b17" opacity=".55" transform="translate(0 4)"/>' +
        '<circle r="30" fill="' + z.color + '"/><circle r="30" fill="url(#shine)"/>' +
        '<circle class="zone-ring" r="34" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="4"/>' +
        '<circle r="34" fill="none" stroke="#f2a531" stroke-width="4" stroke-linecap="round" stroke-dasharray="' + (C * got / sp.length).toFixed(1) + ' ' + C.toFixed(1) + '" transform="rotate(-90)"/>' +
        glyph(z.glyph) +
        (done ? '<g transform="translate(22 -22)"><circle r="10" fill="#7cc46a" stroke="#0e1b17" stroke-width="2"/><path d="M-4 0l3 3 5-6" stroke="#0e1b17" stroke-width="2.4" fill="none" stroke-linecap="round"/></g>' : '') +
        '<g transform="translate(0 52)"><rect x="-58" y="-11" width="116" height="20" rx="10" fill="rgba(14,27,23,.82)"/>' +
        '<text text-anchor="middle" y="4" fill="#efe6d2" font-family="Nunito, sans-serif" font-weight="800" font-size="11.5">' + esc(z.short) + ' · ' + got + '/' + sp.length + '</text></g></g>';
    }).join('');
    var me = last || { x: 180, y: 492 };
    return '<svg viewBox="0 0 360 540" role="img" aria-label="Mapa de Dino Park con 5 zonas">' +
      '<defs><linearGradient id="gsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9cc3dd"/><stop offset="1" stop-color="#f0d4a3"/></linearGradient>' +
      '<linearGradient id="gland" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5c8a48"/><stop offset="1" stop-color="#3f6b3c"/></linearGradient>' +
      '<radialGradient id="shine" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>' +
      '<rect width="360" height="140" fill="url(#gsky)"/>' +
      '<path d="M-20 140 L70 62 L110 92 L150 140z" fill="#7c6d63"/><path d="M58 72l12-10 9 8-7 1-5-3-5 6z" fill="#f7f4ee"/>' +
      '<path d="M90 140 L188 26 L286 140z" fill="#8a7663"/><path d="M170 47 L188 26 L206 47 l-7 -3 -5 6 -6-7 -6 6 -5-5z" fill="#f7f4ee"/>' +
      '<path d="M250 140 L300 92 L330 102 L380 140z" fill="#8f7b6a"/>' +
      '<text x="188" y="18" text-anchor="middle" font-family="Nunito, sans-serif" font-size="9" font-weight="800" fill="#3a4a58" letter-spacing="1.5">MISTI</text>' +
      '<rect y="130" width="360" height="410" fill="url(#gland)"/>' +
      '<ellipse cx="62" cy="262" rx="58" ry="34" fill="#3fa6b5"/><ellipse cx="62" cy="262" rx="58" ry="34" fill="none" stroke="#bfe9ec" stroke-opacity=".5" stroke-width="3"/>' +
      trees +
      '<path d="' + path + '" fill="none" stroke="#2a3f2b" stroke-width="20" stroke-linecap="round" opacity=".35"/>' +
      '<path d="' + path + '" fill="none" stroke="#e9dfc7" stroke-width="15" stroke-linecap="round"/>' +
      '<path d="' + path + '" fill="none" stroke="#c9bb98" stroke-width="2" stroke-dasharray="2 9" stroke-linecap="round"/>' +
      '<g transform="translate(180 520)"><rect x="-44" y="-14" width="88" height="22" rx="6" fill="#efe6d2"/><text text-anchor="middle" y="2" font-family="Nunito, sans-serif" font-size="11" font-weight="900" fill="#3a2a10">ENTRADA</text></g>' +
      nodes +
      '<g transform="translate(' + (me.x + (last ? -40 : 34)) + ' ' + (me.y + (last ? 6 : -8)) + ')"><circle r="11" fill="#f2a531" stroke="#fff" stroke-width="3"/><circle r="4" fill="#2a1704"/></g>' +
      '</svg>';
  }

  function viewMap() {
    var s = S(), v = s.visit;
    var d = new Date(DC.Store.now());
    var zonesDone = v ? v.zones.length : 0;
    var steps = '';
    for (var i = 0; i < 5; i++) steps += '<span class="' + (i < zonesDone ? 'on' : '') + '"></span>';
    var special = DC.SPECIES.filter(function (sp) { return sp.days || sp.afterHour || sp.minVisits; });
    var todayChips = special.map(function (sp) {
      var a = DC.Store.availability(sp);
      return '<div class="t" style="' + (a.ok ? '' : 'opacity:.55') + '">' + img(sp.id, s.album[sp.id] && s.album[sp.id].caught ? '' : 'sil', sp.name) +
        '<div><div style="font-weight:800;font-size:.82rem">' + (s.album[sp.id] && s.album[sp.id].seen ? esc(sp.name) : '???') + '</div>' +
        '<div class="muted" style="font-size:.7rem">' + (a.ok ? '<b style="color:var(--leaf)">Hoy aparece</b> · Zona ' + sp.zone : esc(a.why)) + '</div></div></div>';
    }).join('');
    var missions = v ? v.missions.map(function (m) {
      var def = DC.Store.missionDef(m.id); if (!def) return '';
      return '<div class="mission' + (m.done ? ' done' : '') + '"><div><div style="font-weight:800">' + esc(def.text) + '</div>' +
        '<div class="muted num" style="font-size:.75rem">' + m.progress + '/' + def.goal + ' · +' + def.coins + ' monedas · +' + def.xp + ' XP</div></div>' +
        (m.claimed ? '<span class="chip">' + icon('check') + 'Listo</span>' : m.done ? '<button class="btn small" data-act="claim" data-id="' + m.id + '">Reclamar</button>' : '<span class="chip num">' + Math.round(pct(m.progress, def.goal)) + '%</span>') +
        '<div class="bar"><i style="width:' + pct(m.progress, def.goal) + '%"></i></div></div>';
    }).join('') : '';
    var eggs = s.eggs.length ? '<div class="card egg"><div class="egg-shape" aria-hidden="true"></div><div><h3>' + s.eggs.length + (s.eggs.length > 1 ? ' huevos incubando' : ' huevo incubando') + '</h3>' +
      '<p class="muted" style="font-size:.85rem">Eclosiona' + (s.eggs.length > 1 ? 'n' : '') + ' en tu próxima visita al parque. ¡Puede salir una especie que te falte!</p></div></div>' : '';
    return '<div class="stack">' +
      '<div class="visit-banner"><div class="big num">#' + (v ? v.n : 1) + '</div><div style="flex:1;min-width:0"><div class="eyebrow">Visita al parque · ' + DC.DAYS[d.getDay()] + '</div>' +
      '<div style="font-weight:800">' + (v && v.routeDone ? '¡Ruta completa! Código en Premios' : 'Ruta del tesoro: ' + zonesDone + ' de 5 zonas') + '</div>' +
      '<div class="route-steps" style="margin-top:6px">' + steps + '</div></div></div>' +
      '<div class="map-wrap">' + mapSVG() + '</div>' +
      '<p class="muted" style="font-size:.85rem;text-align:center">Toca una zona para explorarla. El anillo dorado muestra cuántas especies ya capturaste ahí.</p>' +
      '<div class="section-title"><h2>Misiones de hoy</h2><span class="muted" style="font-size:.8rem">Completa las 3: +3 Dinoesferas</span></div>' +
      '<div class="card">' + missions + '</div>' +
      eggs +
      '<div class="section-title"><h2>Especies especiales</h2><span class="muted" style="font-size:.8rem">Cambian según el día</span></div>' +
      '<div class="today">' + todayChips + '</div>' +
      '</div>';
  }

  function zoneSheet(zid) {
    var z = DC.ZONES.find(function (x) { return x.id === zid; });
    var s = S();
    var sp = DC.SPECIES.filter(function (x) { return x.zone === zid; });
    var list = sp.map(function (x) {
      var a = DC.Store.availability(x), e = s.album[x.id];
      return '<div class="row" style="padding:8px 0;border-top:1px solid var(--line)">' + img(x.id, (e && e.caught ? '' : 'sil'), x.name).replace('<img', '<img style="width:56px;height:56px;border-radius:12px;background:rgba(0,0,0,.25)"') +
        '<div style="flex:1;min-width:0"><div style="font-weight:800">' + (e && e.seen ? esc(x.name) : '???') + ' ' + stars(x.rarity) + '</div>' +
        '<div class="muted" style="font-size:.78rem">' + (a.ok ? '<span style="color:var(--leaf);font-weight:800">Puede aparecer hoy</span>' : esc(a.why)) + (e && e.caught ? ' · Capturado x' + e.caught : '') + '</div></div>' + typeChip(x.type) + '</div>';
    }).join('');
    var qr = s.settings.qr;
    var m = modal('<div class="sheet-head"><div><div class="eyebrow">Zona ' + z.id + ' de 5</div><h2>' + esc(z.name) + '</h2></div>' +
      '<button class="icon-btn" data-act="close" aria-label="Cerrar">' + icon('close') + '</button></div>' +
      '<p class="muted" style="margin:8px 0 12px">' + esc(z.desc) + '</p>' + list +
      '<div class="stack" style="margin-top:16px">' +
      (qr ? '<button class="btn block" data-act="scanqr" data-zone="' + zid + '">' + icon('qr') + 'Escanear QR de la zona</button>' +
        '<button class="btn ghost block small" data-act="explore" data-zone="' + zid + '">Ya estoy aquí (sin QR)</button>'
        : '<button class="btn block" data-act="explore" data-zone="' + zid + '">' + icon('camera') + 'Explorar con la cámara</button>') +
      '</div>');
    return m;
  }

  /* =====================================================================
     ÁLBUM
     ===================================================================== */
  function viewAlbum() {
    var s = S();
    var n = DC.Store.caughtCount();
    var cards = DC.SPECIES.map(function (sp) {
      var e = s.album[sp.id];
      var caught = e && e.caught > 0, seen = e && e.seen > 0;
      return '<button class="dcard' + (e && e.golden ? ' gold' : '') + '" data-act="ficha" data-sp="' + sp.id + '" aria-label="' + (seen ? esc(sp.name) : 'Especie desconocida') + '">' +
        '<span class="no">#' + String(sp.no).padStart(2, '0') + '</span>' +
        img(sp.id, caught ? (e.golden ? 'golden-img' : '') : 'sil', '') +
        '<span class="nm">' + (seen ? esc(sp.name) : '???') + '</span>' +
        '<span class="meta"><span>' + (caught ? 'x' + e.caught : seen ? 'Visto' : 'Zona ' + sp.zone) + '</span>' + stars(sp.rarity) + '</span></button>';
    }).join('');
    return '<div class="stack"><div class="row between"><div><div class="eyebrow">Dinopedia</div><h1 class="num">' + n + ' / ' + DC.SPECIES.length + '</h1></div>' +
      '<div style="width:46%"><div class="bar xp" style="height:12px"><i style="width:' + pct(n, DC.SPECIES.length) + '%"></i></div><p class="muted" style="font-size:.75rem;margin-top:4px">Completa el álbum: entrada gratis</p></div></div>' +
      '<div class="album-grid">' + cards + '</div></div>';
  }

  function ficha(spId, fromCapture) {
    var sp = DC.SP[spId], s = S(), e = DC.Store.albumEntry(spId);
    var caught = e.caught > 0;
    if (!e.seen) {
      return modal('<div class="sheet-head"><div><div class="eyebrow">#' + String(sp.no).padStart(2, '0') + ' · Zona ' + sp.zone + '</div><h2>Especie desconocida</h2></div>' +
        '<button class="icon-btn" data-act="close" aria-label="Cerrar">' + icon('close') + '</button></div>' +
        '<div class="row" style="margin-top:12px">' + img(spId, 'sil', '').replace('<img', '<img style="width:120px;height:120px;border-radius:16px;background:rgba(0,0,0,.25)"') +
        '<p class="muted">Búscala en <b>' + esc(DC.ZONES[sp.zone - 1].name) + '</b>. ' + esc(DC.Store.availability(sp).why) + '.</p></div>');
    }
    if (caught && !e.read) { e.read = true; s.totals.fichas++; DC.Store.bump('fichas'); }
    var kid = s.age === 'nino';
    var beats = DC.TYPE_BEATS[sp.type], weak = Object.keys(DC.TYPE_BEATS).find(function (k) { return DC.TYPE_BEATS[k] === sp.type; });
    var quiz = '';
    if (caught && !e.quiz) {
      quiz = '<div class="card" style="background:rgba(0,0,0,.2)"><div class="eyebrow">Pregunta de la ficha · +40 XP · +30 monedas</div><h3 style="margin:6px 0 10px">' + esc(sp.quiz.q) + '</h3>' +
        '<div class="quiz-opts">' + sp.quiz.options.map(function (o, i) { return '<button data-act="quiz" data-sp="' + spId + '" data-i="' + i + '">' + esc(o) + '</button>'; }).join('') + '</div></div>';
    } else if (e.quiz) quiz = '<div class="chip" style="align-self:flex-start">' + icon('check') + 'Pregunta respondida</div>';
    var html = '<div class="sheet-head"><div class="eyebrow">#' + String(sp.no).padStart(2, '0') + ' · ' + esc(DC.ZONES[sp.zone - 1].name) + '</div>' +
      '<button class="icon-btn" data-act="close" aria-label="Cerrar">' + icon('close') + '</button></div>' +
      '<div class="stack" style="margin-top:8px">' +
      '<div class="ficha-hero">' + img(spId, e.golden ? 'golden-img' : '', sp.name) + '<div class="stack" style="gap:6px"><h2>' + esc(sp.name) + '</h2>' +
      '<div class="row" style="flex-wrap:wrap;gap:6px">' + typeChip(sp.type) + stars(sp.rarity) + (sp.notDino ? '<span class="chip" style="color:var(--sky)">No es dinosaurio</span>' : '') + '</div>' +
      '<div class="muted" style="font-size:.8rem">' + esc(sp.period) + ' · ' + esc(sp.mya) + '</div>' +
      (caught ? '<div class="muted" style="font-size:.8rem">Capturado x' + e.caught + (e.golden ? ' · ' + e.golden + ' dorado' : '') + '</div>' : '<div class="chip">Solo visto</div>') + '</div></div>' +
      '<div class="row between"><h3>Ficha educativa</h3><div class="seg" role="group" aria-label="Nivel de lectura">' +
      '<button data-act="fmode" data-m="nino" aria-pressed="' + kid + '">Niño</button><button data-act="fmode" data-m="adulto" aria-pressed="' + !kid + '">Adulto</button></div></div>' +
      '<p id="ftext" style="font-size:1rem">' + esc(kid ? sp.kid : sp.adult) + '</p>' +
      '<div class="facts"><div><small>Largo</small>' + sp.length + ' m</div><div><small>Peso</small>' + esc(sp.weight) + '</div><div><small>Altura</small>' + sp.height + ' m</div><div><small>Dieta</small>' + esc(sp.diet) + '</div></div>' +
      '<div class="card" style="background:rgba(242,165,49,.08);border-color:rgba(242,165,49,.3)"><div class="eyebrow" style="color:var(--amber)">¿Sabías que…?</div><p style="margin-top:4px">' + esc(sp.fact) + '</p></div>' +
      '<div class="adv"><div><b style="color:var(--leaf)">Fuerte contra ' + DC.TYPES[beats].name + '</b><br><span class="muted">' + esc(DC.TYPE_REASON[sp.type]) + '</span></div>' +
      '<div><b style="color:var(--danger)">Débil contra ' + DC.TYPES[weak].name + '</b><br><span class="muted">' + esc(DC.TYPE_REASON[weak]) + '</span></div></div>' +
      quiz +
      (caught ? '<button class="btn ghost block" data-act="photo" data-sp="' + spId + '">' + icon('photo') + 'Tomar foto AR con ' + esc(sp.name) + '</button>' : '') +
      (fromCapture ? '<button class="btn block" data-act="close">Seguir explorando</button>' : '') +
      '</div>';
    var m = modal(html);
    m.dataset.sp = spId;
    return m;
  }

  /* =====================================================================
     EQUIPO
     ===================================================================== */
  function viewTeam() {
    var s = S();
    DC.Store.tickHeal();
    if (!s.team.length) return '<div class="card">Aún no tienes dinosaurios.</div>';
    var list = s.team.slice().sort(function (a, b) { return (b.uid === s.partner) - (a.uid === s.partner) || b.lvl - a.lvl; }).map(function (d) {
      var sp = DC.SP[d.sp], st = DC.Store.stats(d);
      var hp = pct(d.hp, st.maxHp), isP = d.uid === s.partner;
      return '<div class="card team-item">' + img(d.sp, d.golden ? 'golden-img' : '', sp.name) +
        '<div style="min-width:0">' + (isP ? '<div class="partner-tag">Compañero de pelea</div>' : '') +
        '<div class="row between"><b>' + esc(sp.name) + (d.golden ? ' <span class="stars">★ dorado</span>' : '') + '</b><span class="num muted">Nv. ' + d.lvl + '</span></div>' +
        '<div class="row" style="gap:6px;margin:4px 0">' + typeChip(sp.type) + '<span class="muted num" style="font-size:.75rem">ATQ ' + st.atk + ' · DEF ' + st.def + '</span></div>' +
        '<div class="bar hp ' + hpClass(hp) + '" title="Vida"><i style="width:' + hp + '%"></i></div>' +
        '<div class="row between muted num" style="font-size:.72rem;margin-top:3px"><span>Vida ' + d.hp + '/' + st.maxHp + '</span><span>XP ' + d.xp + '/' + DC.dinoXpToNext(d.lvl) + '</span></div>' +
        '<div class="acts">' + (isP ? '' : '<button class="btn small" data-act="partner" data-uid="' + d.uid + '">Elegir</button>') +
        (d.hp < st.maxHp ? '<button class="btn ghost small" data-act="heal" data-uid="' + d.uid + '"' + (s.items.leaf > 0 ? '' : ' disabled') + '>' + icon('leaf') + 'Curar (' + (s.items.leaf || 0) + ')</button>' : '') +
        '<button class="btn ghost small" data-act="photo" data-sp="' + d.sp + '" data-uid="' + d.uid + '">' + icon('photo') + 'Foto</button></div></div></div>';
    }).join('');
    return '<div class="stack"><div><div class="eyebrow">Tu manada</div><h1>' + s.team.length + ' dinosaurio' + (s.team.length > 1 ? 's' : '') + '</h1>' +
      '<p class="muted" style="font-size:.85rem">Recuperan vida con el tiempo y se curan por completo en tu próxima visita.</p></div>' + list + '</div>';
  }

  /* =====================================================================
     PASAPORTE
     ===================================================================== */
  function viewPassport() {
    var s = S();
    var stamps = DC.PASSPORT.map(function (p) {
      var on = s.visits >= p.visit;
      return '<div class="stamp' + (on ? ' on' : '') + '" title="' + esc(p.reward) + '"><div><b class="num">' + p.visit + '</b>' + esc(p.title) + '</div></div>';
    }).join('');
    var next = DC.PASSPORT.find(function (p) { return s.visits < p.visit; });
    var cal = DC.SPECIES.filter(function (sp) { return sp.days || sp.afterHour || sp.minVisits; }).map(function (sp) {
      var a = DC.Store.availability(sp);
      var rule = sp.days ? sp.days.map(function (d) { return DC.DAYS[d]; }).join(', ') : sp.afterHour ? 'Todos los días desde las ' + (sp.afterHour - 12) + ' p. m.' : 'Desde tu visita n.º ' + sp.minVisits;
      var e = s.album[sp.id];
      return '<tr><td><b>' + (e && e.seen ? esc(sp.name) : '???') + '</b><br><span class="muted">Zona ' + sp.zone + '</span></td><td>' + esc(rule) + '</td><td>' + (a.ok ? '<span style="color:var(--leaf);font-weight:800">Hoy sí</span>' : '<span class="muted">Hoy no</span>') + '</td></tr>';
    }).join('');
    var medals = DC.MEDALS.map(function (m) {
      var on = s.medals.indexOf(m.id) >= 0;
      return '<div class="medal' + (on ? ' on' : '') + '" title="' + esc(m.name) + (on ? '' : ' (bloqueada)') + '" aria-label="' + esc(m.name) + '">' + icon(on ? 'medal' : 'lock') + '</div>';
    }).join('');
    var days = s.visitDays.slice(-8).map(function (d) { return '<span class="chip num">' + d.slice(5).split('-').reverse().join('/') + '</span>'; }).join(' ');
    return '<div class="stack"><div><div class="eyebrow">Pasaporte Jurásico</div><h1 class="num">' + s.visits + (s.visits === 1 ? ' visita' : ' visitas') + '</h1>' +
      '<p class="muted" style="font-size:.85rem">Cada día distinto que vienes al parque recibes un sello. ' + (next ? 'Próximo premio en la visita <b>' + next.visit + '</b>: ' + esc(next.reward) + '.' : '¡Completaste el pasaporte!') + '</p></div>' +
      '<div class="stamps">' + stamps + '</div>' +
      (days ? '<div class="row" style="flex-wrap:wrap;gap:6px"><span class="muted" style="font-size:.8rem">Tus visitas:</span>' + days + '</div>' : '') +
      '<div class="section-title"><h2>Calendario de especies</h2></div>' +
      '<div class="card" style="overflow-x:auto"><table class="cal"><thead><tr><th>Especie</th><th>Cuándo aparece</th><th>Hoy</th></tr></thead><tbody>' + cal + '</tbody></table></div>' +
      '<div class="section-title"><h2>Medallas</h2><span class="muted num">' + s.medals.length + '/' + DC.MEDALS.length + '</span></div>' +
      '<div class="medals">' + medals + '</div>' +
      '<div class="card"><div class="eyebrow">Récords</div><div class="facts" style="margin-top:8px">' +
      '<div><small>Capturas</small><span class="num">' + s.totals.caps + '</span></div><div><small>Peleas ganadas</small><span class="num">' + s.totals.wins + '</span></div>' +
      '<div><small>Rutas completas</small><span class="num">' + s.totals.routes + '</span></div><div><small>Dorados</small><span class="num">' + s.totals.golden + '</span></div></div></div>' +
      '</div>';
  }

  /* =====================================================================
     PREMIOS
     ===================================================================== */
  function qrSVG(text) {
    try {
      var q = window.qrcode(0, 'M'); q.addData(text); q.make();
      return q.createSvgTag({ cellSize: 3, margin: 0, scalable: true });
    } catch (e) { return '<span class="mono" style="color:#000;font-size:.6rem">' + esc(text) + '</span>'; }
  }
  function viewPrizes() {
    var s = S();
    var v = s.visit || { bought: 0 };
    var shop = DC.SHOP.map(function (it) {
      var lim = it.id === 'sphere' && v.bought >= DC.SPHERE_BUY_LIMIT;
      var can = s.coins >= it.price && !lim;
      return '<div class="shop-item"><div><b>' + esc(it.name) + '</b>' + (it.kind === 'real' ? ' <span class="chip" style="color:var(--amber)">Premio real</span>' : '') +
        '<div class="muted" style="font-size:.8rem">' + esc(it.desc) + (it.id === 'sphere' ? ' (' + v.bought + '/' + DC.SPHERE_BUY_LIMIT + ' hoy)' : '') +
        (it.id === 'leaf' || it.id === 'fern' ? ' Tienes ' + (s.items[it.id] || 0) + '.' : '') + '</div></div>' +
        '<button class="btn small" data-act="buy" data-id="' + it.id + '"' + (can ? '' : ' disabled') + '>' + icon('coin') + '<span class="num">' + it.price + '</span></button></div>';
    }).join('');
    var codes = s.codes.length ? s.codes.map(function (c) {
      return '<div class="card code-card' + (c.redeemed ? ' used' : '') + '"><div class="qr">' + qrSVG(c.code) + '</div><div style="min-width:0">' +
        '<div class="code">' + c.code + '</div><b>' + esc(c.label) + '</b><div class="muted" style="font-size:.75rem">' + esc(c.source) + '</div>' +
        '<div class="row" style="margin-top:6px;gap:6px">' + (c.redeemed ? '<span class="chip">Canjeado</span>' : '<span class="chip" style="color:var(--leaf)">Listo para canjear</span>') +
        '<button class="btn ghost small" data-act="copy" data-code="' + c.code + '">Copiar</button></div></div></div>';
    }).join('') : '<div class="card muted">Aún no tienes códigos. Completa la ruta de 5 zonas, junta sellos en tu pasaporte o compra un premio real con Dino-monedas.</div>';
    return '<div class="stack"><div><div class="eyebrow">Tienda del parque</div><h1 class="num">' + icon('coin', 'coin-i') + ' ' + s.coins + '</h1>' +
      '<p class="muted" style="font-size:.85rem">Ganas monedas peleando, capturando, respondiendo fichas y con misiones. Las monedas se guardan entre visitas.</p></div>' +
      '<div class="card">' + shop + '</div>' +
      '<div class="section-title"><h2>Mis códigos</h2><span class="muted" style="font-size:.8rem">Muéstralos en caja</span></div>' + codes + '</div>';
  }

  /* =====================================================================
     AJUSTES Y PANEL
     ===================================================================== */
  function sw(key, on, label, sub) {
    return '<div class="toggle-row"><div><b>' + label + '</b>' + (sub ? '<div class="muted" style="font-size:.78rem">' + sub + '</div>' : '') + '</div>' +
      '<button class="switch" role="switch" aria-checked="' + !!on + '" aria-label="' + esc(label) + '" data-act="setting" data-key="' + key + '"></button></div>';
  }
  function settings() {
    var s = S();
    var diffs = Object.keys(DC.DIFFICULTY).map(function (k) {
      var d = DC.DIFFICULTY[k];
      return '<button class="choice" style="grid-template-columns:1fr" data-act="diff" data-d="' + k + '" aria-pressed="' + (s.difficulty === k) + '"><div><b>' + d.name + '</b> <span class="chip">' + d.tag + '</span><div class="muted" style="font-size:.8rem">' + d.desc + '</div></div></button>';
    }).join('');
    var ages = [['nino', 'Niño'], ['joven', 'Joven'], ['adulto', 'Adulto']].map(function (a) {
      return '<button data-act="age" data-a="' + a[0] + '" aria-pressed="' + (s.age === a[0]) + '">' + a[1] + '</button>';
    }).join('');
    return modal('<div class="sheet-head"><h2>Ajustes</h2><button class="icon-btn" data-act="close" aria-label="Cerrar">' + icon('close') + '</button></div>' +
      '<div class="stack" style="margin-top:12px">' +
      '<label class="stack" style="gap:6px"><span class="eyebrow">Nombre del explorador</span><input id="set-name" class="field" maxlength="18" value="' + esc(s.name) + '"></label>' +
      '<div class="row between"><span class="eyebrow">Fichas para</span><div class="seg" role="group">' + ages + '</div></div>' +
      '<div class="eyebrow">Dificultad</div><div class="choice-grid">' + diffs + '</div>' +
      '<div class="card" style="padding:4px 14px">' +
      sw('sound', s.settings.sound, 'Sonido y vibración') +
      sw('camera', s.settings.camera, 'Cámara AR', 'Ver los dinosaurios sobre la cámara. Apagado: parque 3D') +
      sw('gyro', s.settings.gyro, 'Giroscopio', 'Mueve el celular para mirar alrededor') +
      sw('lite', s.settings.lite, 'Modo ligero', 'Menos efectos: ahorra batería y datos') +
      sw('qr', s.settings.qr, 'Validar zonas con QR', 'Para el parque: cada zona tiene su QR') +
      '</div>' +
      '<div class="card stack" style="gap:10px"><div><div class="eyebrow">Modo presentación</div><p class="muted" style="font-size:.8rem">Para mostrar el proyecto en clase sin esperar días reales.</p></div>' +
      '<button class="btn ghost small" data-act="dev-visit">Simular próxima visita (+1 día)</button>' +
      '<button class="btn ghost small" data-act="dev-spheres">+10 Dinoesferas y +500 monedas</button>' +
      '<button class="btn ghost small" data-act="panel">' + icon('chart') + 'Panel Dino Park</button>' +
      '<button class="btn danger small" data-act="reset">Borrar progreso</button></div>' +
      '<p class="muted" style="font-size:.75rem;text-align:center">' + esc(DC.MODEL_CREDIT || '') + '</p>' +
      '</div>', { onClose: function () { var n = $('#set-name'); } });
  }

  function panel() {
    var s = S();
    var hist = s.history.slice();
    if (s.visit) hist.push({ day: s.visit.day, route: s.visit.routeDone, caps: s.visit.stats.caps, wins: s.visit.stats.wins, encounters: s.visit.stats.encounters,
      fichas: s.visit.stats.fichas, quiz: s.visit.stats.quiz, zones: s.visit.zones, minutes: Math.round(((s.visit.lastAt || Date.now()) - s.visit.startedAt) / 60000) });
    var visits = hist.length || 1;
    var routes = hist.filter(function (h) { return h.route; }).length;
    var mins = hist.reduce(function (a, h) { return a + (h.minutes || 0); }, 0);
    var zoneCount = [0, 0, 0, 0, 0];
    hist.forEach(function (h) { (h.zones || []).forEach(function (z) { zoneCount[z - 1]++; }); });
    var maxZ = Math.max.apply(null, zoneCount.concat([1]));
    var bars = DC.ZONES.map(function (z, i) {
      return '<div class="hbar"><span>' + esc(z.short) + '</span><span class="track"><i style="width:' + pct(zoneCount[i], maxZ) + '%"></i></span><span class="num">' + zoneCount[i] + '</span></div>';
    }).join('');
    var redeemed = s.codes.filter(function (c) { return c.redeemed; }).length;
    return modal('<div class="sheet-head"><div><div class="eyebrow">Para la administración</div><h2>Panel Dino Park</h2></div><button class="icon-btn" data-act="close" aria-label="Cerrar">' + icon('close') + '</button></div>' +
      '<p class="muted" style="font-size:.8rem;margin:6px 0 12px">Demo con los datos de este dispositivo. En producción se agregan todas las visitas del parque.</p>' +
      '<div class="kpis">' +
      '<div class="kpi"><b>' + Math.round(routes / visits * 100) + '%</b><span>Rutas completadas (North Star)</span></div>' +
      '<div class="kpi"><b>' + Math.round(mins / visits) + ' min</b><span>Tiempo promedio de juego</span></div>' +
      '<div class="kpi"><b>' + s.visits + '</b><span>Visitas registradas</span></div>' +
      '<div class="kpi"><b>' + s.totals.caps + '</b><span>Capturas</span></div>' +
      '<div class="kpi"><b>' + s.totals.fichas + '</b><span>Fichas leídas</span></div>' +
      '<div class="kpi"><b>' + s.totals.quiz + '</b><span>Respuestas correctas</span></div>' +
      '<div class="kpi"><b>' + s.codes.length + '</b><span>Códigos generados</span></div>' +
      '<div class="kpi"><b>' + redeemed + '</b><span>Códigos canjeados</span></div></div>' +
      '<h3 style="margin:16px 0 8px">Zonas visitadas</h3><div class="hbars">' + bars + '</div>' +
      '<h3 style="margin:16px 0 8px">Validar código en caja</h3>' +
      '<form class="row" id="validate-form"><input id="code-in" class="field" placeholder="DC-XXXX-XXXX" autocomplete="off" style="text-transform:uppercase"><button class="btn small" type="submit">Validar</button></form>' +
      '<p id="code-out" class="muted" style="margin-top:8px;min-height:1.4em"></p>');
  }

  /* =====================================================================
     Eventos
     ===================================================================== */
  function claimMission(id) {
    var r = DC.Store.claimMission(id);
    if (!r) return;
    DC.Audio.play('coin');
    toast('+' + r.coins + ' monedas · +' + r.xp + ' XP' + (r.bonus ? ' · ¡Las 3 misiones! +3 Dinoesferas' : ''), 'coin');
    if (r.levelUps.length) levelUp(r.levelUps[r.levelUps.length - 1]);
    render();
  }
  function levelUp(lvl) {
    DC.Audio.play('levelup');
    modal('<div style="text-align:center" class="stack"><div class="orb" style="margin:0 auto;width:96px;height:96px"></div><div class="eyebrow">¡Subiste de nivel!</div>' +
      '<h1 class="num">Nivel ' + lvl + '</h1><p>Título: <b>' + DC.titleFor(lvl) + '</b></p><div class="reward-list"><div><span>Dinoesferas</span><span class="num">+2</span></div><div><span>Dino-monedas</span><span class="num">+50</span></div></div>' +
      '<button class="btn block" data-act="close" autofocus>¡Genial!</button></div>', { center: true });
  }
  function confirmBox(text, okLabel, fn) {
    var m = modal('<div class="stack"><h2>' + esc(text) + '</h2><div class="row"><button class="btn ghost" data-act="close" style="flex:1">Cancelar</button><button class="btn danger" id="cf-ok" style="flex:1">' + esc(okLabel) + '</button></div></div>', { center: true });
    m.querySelector('#cf-ok').addEventListener('click', function () { m.close(); fn(); });
  }

  function onClick(e) {
    var b = e.target.closest('[data-act]');
    if (!b) return;
    var act = b.dataset.act, s = S();
    DC.Audio.unlock();
    switch (act) {
      case 'tab': DC.Audio.play('tap'); go(b.dataset.tab); break;
      case 'close': DC.Audio.play('back'); var mb = b.closest('.modal-back'); if (mb) mb.close(); break;
      case 'zone': DC.Audio.play('tap'); zoneSheet(+b.dataset.zone); break;
      case 'explore': closeModals(); DC.Encounter.start(+b.dataset.zone); break;
      case 'scanqr': closeModals(); DC.Encounter.scanQR(+b.dataset.zone); break;
      case 'claim': claimMission(b.dataset.id); break;
      case 'ficha': DC.Audio.play('tap'); ficha(b.dataset.sp); break;
      case 'fmode':
        s.age = b.dataset.m === 'nino' ? 'nino' : (s.age === 'nino' ? 'adulto' : s.age);
        DC.Store.save();
        var mm = b.closest('.modal-back'); var sp = mm && mm.dataset.sp;
        if (sp) {
          mm.querySelector('#ftext').textContent = b.dataset.m === 'nino' ? DC.SP[sp].kid : DC.SP[sp].adult;
          mm.querySelectorAll('[data-act="fmode"]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
        }
        break;
      case 'quiz':
        var spq = DC.SP[b.dataset.sp], ok = +b.dataset.i === spq.quiz.a, entry = DC.Store.albumEntry(spq.id);
        var opts = b.parentNode.querySelectorAll('button');
        opts.forEach(function (x, i) { x.disabled = true; if (i === spq.quiz.a) x.classList.add('ok'); });
        if (ok) {
          entry.quiz = true; s.coins += 30; s.totals.quiz++;
          var lv = DC.Store.addXp(40); var md = DC.Store.bump('quiz');
          DC.Audio.play('capture'); toast('¡Correcto! +40 XP · +30 monedas', 'check');
          md.forEach(function (m) { toast('Misión completada: ' + esc(m.text), 'star'); });
          if (lv.length) setTimeout(function () { levelUp(lv[lv.length - 1]); }, 600);
          checkMedals();
        } else {
          b.classList.add('bad'); DC.Audio.play('fail');
          toast('Casi. Lee la ficha y vuelve a intentarlo en tu próxima captura.', 'book');
        }
        DC.Store.save(); renderTop();
        break;
      case 'partner': s.partner = b.dataset.uid; DC.Store.save(); DC.Audio.play('tap'); toast('Nuevo compañero de pelea', 'team'); render(); break;
      case 'heal':
        var d = s.team.find(function (x) { return x.uid === b.dataset.uid; });
        if (d && s.items.leaf > 0) {
          var mx = DC.Store.stats(d).maxHp; d.hp = Math.min(mx, d.hp + Math.round(mx * 0.6)); s.items.leaf--; DC.Store.save();
          DC.Audio.play('pop'); toast(DC.SP[d.sp].name + ' recuperó vida', 'leaf'); render();
        }
        break;
      case 'buy': buy(b.dataset.id); break;
      case 'copy':
        var code = b.dataset.code;
        try { navigator.clipboard.writeText(code).then(function () { toast('Código copiado', 'check'); }, function () { toast(code, 'qr'); }); } catch (er) { toast(code, 'qr'); }
        break;
      case 'settings': DC.Audio.play('tap'); settings(); break;
      case 'setting':
        var k = b.dataset.key; s.settings[k] = !s.settings[k]; b.setAttribute('aria-checked', s.settings[k]); DC.Store.save();
        if (k === 'sound' && s.settings.sound) DC.Audio.play('tap');
        if (k === 'lite') toast('Se aplica al recargar la app', 'gear');
        break;
      case 'diff':
        s.difficulty = b.dataset.d; DC.Store.save();
        b.parentNode.querySelectorAll('.choice').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
        DC.Audio.play('tap');
        break;
      case 'age':
        s.age = b.dataset.a; DC.Store.save();
        b.parentNode.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
        break;
      case 'dev-visit':
        s.devOffsetDays = (s.devOffsetDays || 0) + 1;
        closeModals();
        DC.Main.visitCheck(true);
        break;
      case 'dev-spheres': s.spheres += 10; s.coins += 500; DC.Store.save(); toast('+10 Dinoesferas · +500 monedas', 'sphere'); renderTop(); break;
      case 'panel': closeModals(); panel(); bindPanel(); break;
      case 'reset': confirmBox('¿Borrar todo el progreso de este dispositivo?', 'Borrar', function () { DC.Store.reset(); location.reload(); }); break;
      case 'photo': closeModals(); DC.Encounter.photo(b.dataset.sp, b.dataset.uid); break;
    }
  }
  function bindPanel() {
    var f = $('#validate-form');
    if (!f) return;
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var c = $('#code-in').value.trim().toUpperCase();
      var out = $('#code-out');
      if (!DC.Store.validCode(c)) { out.innerHTML = '<b style="color:var(--danger)">Código no válido.</b> Revisa que esté bien escrito.'; return; }
      var mine = S().codes.find(function (x) { return x.code.replace(/-/g, '') === c.replace(/[^A-Z0-9]/g, ''); });
      if (mine && mine.redeemed) { out.innerHTML = '<b style="color:var(--danger)">Ya fue canjeado.</b>'; return; }
      if (mine) { mine.redeemed = true; DC.Store.save(); }
      out.innerHTML = '<b style="color:var(--leaf)">Código válido.</b> ' + (mine ? esc(mine.label) + ' · marcado como canjeado.' : 'Entrega el premio indicado por el visitante.');
      renderTabs();
    });
  }
  function buy(id) {
    var s = S(), it = DC.SHOP.find(function (x) { return x.id === id; });
    if (!it || s.coins < it.price) return;
    if (id === 'sphere') { if (s.visit.bought >= DC.SPHERE_BUY_LIMIT) return; s.visit.bought++; s.spheres++; }
    else if (it.kind === 'item') s.items[id] = (s.items[id] || 0) + 1;
    else DC.Store.addCode(it.name, 'Canje con Dino-monedas');
    s.coins -= it.price;
    DC.Store.save(); DC.Audio.play('coin');
    toast(it.kind === 'real' ? '¡Premio listo! Muestra el código en caja' : 'Compraste: ' + esc(it.name), it.kind === 'real' ? 'gift' : 'check');
    render();
  }
  function checkMedals() {
    DC.Store.checkMedals().forEach(function (m) { toast('Nueva medalla: ' + esc(m.name), 'medal'); });
  }

  /* ---------------- Onboarding ---------------- */
  function onboarding(done) {
    var s = S();
    var st = { step: 0, name: s.name || '', age: s.age || 'nino', diff: s.difficulty || 'facil', starter: 'triceratops' };
    var wrap = document.createElement('div');
    wrap.className = 'onb';
    $('#overlay').appendChild(wrap);
    var starters = ['triceratops', 'velociraptor', 'pteranodon'];
    function dots() { var h = ''; for (var i = 0; i < 4; i++) h += '<i class="' + (i === st.step ? 'on' : '') + '"></i>'; return '<div class="steps-dots">' + h + '</div>'; }
    function draw() {
      var h = '';
      if (st.step === 0) {
        h = '<div class="grow"></div><div class="logo"><div class="orb" aria-hidden="true"></div><div class="eyebrow" style="margin-top:18px">Dino Park · Arequipa</div>' +
          '<div class="word">Dino<em>Caza</em><br>AR</div><p class="muted" style="max-width:320px">Recorre el parque, encuentra dinosaurios con la cámara de tu celular, pelea, atrápalos con tu Dinoesfera de ámbar y gana premios reales.</p></div>' +
          '<div class="grow"></div><button class="btn block" data-o="next">Empezar la aventura</button>';
      } else if (st.step === 1) {
        h = dots() + '<div class="stack" style="margin-top:24px"><h1>¿Cómo te llamas, explorador?</h1>' +
          '<input id="onb-name" class="field" maxlength="18" placeholder="Tu nombre" value="' + esc(st.name) + '" autocomplete="nickname">' +
          '<div class="eyebrow" style="margin-top:8px">¿Quién va a jugar?</div><div class="choice-grid">' +
          [['nino', 'Niño o niña', '5 a 12 años · fichas fáciles de leer'], ['joven', 'Joven', '13 a 17 años'], ['adulto', 'Adulto', 'Fichas con datos científicos']].map(function (a) {
            return '<button class="choice" style="grid-template-columns:1fr" data-o="age" data-v="' + a[0] + '" aria-pressed="' + (st.age === a[0]) + '"><div><b>' + a[1] + '</b><div class="muted" style="font-size:.82rem">' + a[2] + '</div></div></button>';
          }).join('') + '</div></div><div class="grow"></div><button class="btn block" data-o="next">Continuar</button>';
      } else if (st.step === 2) {
        h = dots() + '<div class="stack" style="margin-top:24px"><h1>Elige la dificultad</h1><p class="muted">Puedes cambiarla cuando quieras en Ajustes. En Difícil ganas más premios.</p><div class="choice-grid">' +
          Object.keys(DC.DIFFICULTY).map(function (k) {
            var d = DC.DIFFICULTY[k];
            return '<button class="choice" style="grid-template-columns:1fr" data-o="diff" data-v="' + k + '" aria-pressed="' + (st.diff === k) + '"><div><b>' + d.name + '</b> <span class="chip">' + d.tag + '</span><div class="muted" style="font-size:.82rem">' + d.desc + '</div></div></button>';
          }).join('') + '</div></div><div class="grow"></div><button class="btn block" data-o="next">Continuar</button>';
      } else {
        h = dots() + '<div class="stack" style="margin-top:24px"><h1>Elige tu primer compañero</h1><p class="muted">Te acompañará en las peleas. Cada tipo es fuerte contra otro.</p><div class="choice-grid">' +
          starters.map(function (id) {
            var sp = DC.SP[id];
            return '<button class="choice" data-o="starter" data-v="' + id + '" aria-pressed="' + (st.starter === id) + '">' + img(id, '', sp.name) +
              '<div><b style="font-size:1.05rem">' + esc(sp.name) + '</b><div class="row" style="gap:6px;margin:4px 0">' + typeChip(sp.type) + '</div><div class="muted" style="font-size:.8rem">Fuerte contra ' + DC.TYPES[DC.TYPE_BEATS[sp.type]].name + '. ' + esc(sp.moves.special) + '.</div></div></button>';
          }).join('') + '</div></div><div class="grow" style="min-height:16px"></div><button class="btn block" data-o="finish">¡A explorar!</button>';
      }
      wrap.innerHTML = h;
      fillPortraits(wrap);
      var ni = wrap.querySelector('#onb-name');
      if (ni) ni.addEventListener('input', function () { st.name = ni.value; });
    }
    wrap.addEventListener('click', function (e) {
      var b = e.target.closest('[data-o]'); if (!b) return;
      DC.Audio.unlock(); DC.Audio.play('tap');
      var o = b.dataset.o;
      if (o === 'next') {
        if (st.step === 1 && !st.name.trim()) { var ni = wrap.querySelector('#onb-name'); ni.focus(); ni.style.borderColor = 'var(--danger)'; return; }
        if (st.step === 1 && st.age !== 'nino' && st.diff === 'facil') st.diff = 'normal';
        st.step++; draw();
      } else if (o === 'age' || o === 'diff' || o === 'starter') {
        st[o] = b.dataset.v;
        b.parentNode.querySelectorAll('.choice').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
      } else if (o === 'finish') {
        s.name = st.name.trim().slice(0, 18); s.age = st.age; s.difficulty = st.diff; s.onboarded = true;
        var inst = DC.Store.makeInst(st.starter, 3, false);
        DC.Store.addToTeam(inst);
        var a = DC.Store.albumEntry(st.starter); a.seen++; a.caught++; a.first = Date.now();
        DC.Store.saveNow();
        wrap.remove();
        done && done();
      }
    });
    draw();
  }

  DC.UI = {
    init: function () { document.getElementById('app').addEventListener('click', onClick); },
    render: render, renderTop: renderTop, go: go, toast: toast, modal: modal, closeModals: closeModals,
    ficha: ficha, levelUp: levelUp, onboarding: onboarding, checkMedals: checkMedals, icon: icon, esc: esc,
    typeChip: typeChip, stars: stars, img: img, fillPortraits: fillPortraits, zoneSheet: zoneSheet, hpClass: hpClass, pct: pct,
    tab: function () { return tab; }
  };
})();
