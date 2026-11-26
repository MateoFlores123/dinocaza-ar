/* =====================================================================
   DinoCaza AR · ui.js
   Pantallas: inicio con mapa 3D, álbum (especies, únicos, colores),
   equipo, premios, pasaporte, fichas, ajustes, panel y bienvenida.
   ===================================================================== */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var S = function () { return DC.Store.get(); };
  var tab = 'map', albumSub = 'species';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function icon(id, cls) { return '<svg class="icon ' + (cls || '') + '" aria-hidden="true"><use href="#i-' + id + '"/></svg>'; }
  function typeChip(t) { var x = DC.TYPES[t]; return '<span class="chip type" style="--tc:' + x.color + '">' + x.name + '</span>'; }
  function stars(r) { var n = DC.RARITY[r].stars; return '<span class="stars" aria-label="' + DC.RARITY[r].name + '">' + '★'.repeat(n) + '<span class="off">' + '★'.repeat(4 - n) + '</span></span>'; }
  function pct(a, b) { return Math.max(0, Math.min(100, b ? a / b * 100 : 0)); }
  function hpClass(p) { return p < 25 ? 'low' : p < 55 ? 'mid' : ''; }
  function img(spId, cls, alt, variant) {
    return '<img data-sp="' + spId + '"' + (variant && variant !== 'normal' ? ' data-v="' + variant + '"' : '') + ' class="' + (cls || '') + '" alt="' + esc(alt || '') + '" width="200" height="200">';
  }
  function ballsTotal() { var s = S(); return (s.spheres || 0) + (s.items.super || 0) + (s.items.ultra || 0); }

  /* Retratos 3D progresivos */
  var pq = [], pumping = false;
  function fillPortraits(root) {
    (root || document).querySelectorAll('img[data-sp]:not([src])').forEach(function (el) { pq.push(el); });
    if (pumping) return;
    pumping = true;
    (function step() {
      var t0 = performance.now();
      while (pq.length && performance.now() - t0 < 30) {
        var el = pq.shift();
        if (!el.isConnected || el.src) continue;
        try { el.src = DC.portrait(el.dataset.sp, el.dataset.v); } catch (e) { /* sin WebGL */ }
        var sel = 'img[data-sp="' + el.dataset.sp + '"]' + (el.dataset.v ? '[data-v="' + el.dataset.v + '"]' : ':not([data-v])') + ':not([src])';
        document.querySelectorAll(sel).forEach(function (o) { o.src = el.src; });
      }
      if (pq.length) setTimeout(step, 16); else pumping = false;
    })();
  }

  /* ---------------- Ilustraciones de premios (SVG) ---------------- */
  function prizeArt(id) {
    var a = {
      canchita: '<path d="M18 30h28l-4 30H22z" fill="#fff"/><path d="M22 30h5l1 30h-6zM32 30h5l-1 30h-5zM42 30h4l-4 30h-3z" fill="#ff5a4e"/><g fill="#fff6cf" stroke="#f4c84a" stroke-width="1.5"><circle cx="22" cy="27" r="6"/><circle cx="31" cy="23" r="7"/><circle cx="41" cy="26" r="6"/><circle cx="27" cy="18" r="5"/><circle cx="37" cy="17" r="5"/></g>',
      juego: '<rect x="10" y="26" width="44" height="24" rx="12" fill="#2b4d8f"/><rect x="18" y="34" width="10" height="3" rx="1.5" fill="#fff"/><rect x="21.5" y="30.5" width="3" height="10" rx="1.5" fill="#fff"/><circle cx="42" cy="33" r="3" fill="#ffc531"/><circle cx="47" cy="38" r="3" fill="#ff6f59"/><path d="M32 26v-8h8" stroke="#2b4d8f" stroke-width="3" fill="none" stroke-linecap="round"/>',
      helado: '<path d="M22 32l10 28 10-28z" fill="#e8a45a"/><path d="M24 36l14 0M26 42h10M28 48h6" stroke="#c07a34" stroke-width="2"/><circle cx="26" cy="28" r="8" fill="#ff8fb1"/><circle cx="38" cy="28" r="8" fill="#9fe3c8"/><circle cx="32" cy="19" r="8" fill="#fff1c8"/><circle cx="32" cy="11" r="3" fill="#ff4f5e"/>',
      peluche: '<ellipse cx="32" cy="44" rx="16" ry="13" fill="#7fc95a"/><circle cx="32" cy="24" r="13" fill="#7fc95a"/><path d="M22 14l3-6 3 5 4-6 3 6 4-5 2 7" fill="#4f9a3a"/><circle cx="27" cy="23" r="2.4" fill="#1b2a33"/><circle cx="37" cy="23" r="2.4" fill="#1b2a33"/><path d="M27 30q5 4 10 0" stroke="#1b2a33" stroke-width="2" fill="none" stroke-linecap="round"/><ellipse cx="32" cy="46" rx="9" ry="7" fill="#c7efa8"/>',
      peluche_oro: '<ellipse cx="32" cy="44" rx="16" ry="13" fill="#f2c14e"/><circle cx="32" cy="24" r="13" fill="#f2c14e"/><path d="M22 14l3-6 3 5 4-6 3 6 4-5 2 7" fill="#d69b12"/><circle cx="27" cy="23" r="2.4" fill="#3a2600"/><circle cx="37" cy="23" r="2.4" fill="#3a2600"/><path d="M27 30q5 4 10 0" stroke="#3a2600" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M48 12l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1z" fill="#fff"/>',
      sticker: '<path d="M32 8l7 15 16 2-12 11 3 16-14-8-14 8 3-16L9 25l16-2z" fill="#2fae66" stroke="#fff" stroke-width="3"/><circle cx="32" cy="30" r="6" fill="#ffc531"/>',
      foto: '<rect x="10" y="20" width="44" height="32" rx="7" fill="#ff6f59"/><rect x="24" y="14" width="16" height="8" rx="3" fill="#ff6f59"/><circle cx="32" cy="36" r="10" fill="#fff"/><circle cx="32" cy="36" r="6" fill="#1b2a33"/><circle cx="46" cy="27" r="2.5" fill="#fff"/>',
      entrada20: '<path d="M8 22h48v8a5 5 0 0 0 0 10v8H8v-8a5 5 0 0 0 0-10z" fill="#2fae66"/><text x="32" y="41" text-anchor="middle" font-family="Lilita One, sans-serif" font-size="14" fill="#fff">-20%</text>',
      entrada: '<path d="M8 22h48v8a5 5 0 0 0 0 10v8H8v-8a5 5 0 0 0 0-10z" fill="#ffc531"/><text x="32" y="40" text-anchor="middle" font-family="Lilita One, sans-serif" font-size="11" fill="#5a3b00">GRATIS</text>',
      tienda10: '<path d="M12 30l18-18h20v20L32 50z" fill="#3fb5ff"/><circle cx="43" cy="21" r="3" fill="#fff"/><text x="30" y="38" text-anchor="middle" font-family="Lilita One, sans-serif" font-size="11" fill="#fff" transform="rotate(-45 30 34)">-10%</text>'
    }[id] || '<circle cx="32" cy="32" r="18" fill="#ffc531"/>';
    return '<svg viewBox="0 0 64 64" class="prize-art" aria-hidden="true">' + a + '</svg>';
  }

  /* ---------------- Avisos y modales ---------------- */
  function toast(html, ic) {
    var t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = '<span class="toast-ic">' + icon(ic || 'star') + '</span><span>' + html + '</span>';
    $('#toasts').appendChild(t);
    setTimeout(function () { t.classList.add('out'); }, 2700);
    setTimeout(function () { t.remove(); }, 3200);
  }
  function modal(html, o) {
    o = o || {};
    var back = document.createElement('div');
    back.className = 'modal-back' + (o.center ? ' center' : '');
    back.innerHTML = '<div class="sheet' + (o.cls ? ' ' + o.cls : '') + '" role="dialog" aria-modal="true">' + (o.center ? '' : '<div class="grab"></div>') + html + '</div>';
    back.addEventListener('click', function (e) { if (e.target === back && !o.locked) close(); });
    $('#overlay').appendChild(back);
    function close() { if (!back.isConnected) return; back.remove(); o.onClose && o.onClose(); }
    back.close = close;
    fillPortraits(back);
    return back;
  }
  function closeModals() { document.querySelectorAll('#overlay .modal-back').forEach(function (m) { m.close ? m.close() : m.remove(); }); }
  function head(eyebrow, title) {
    return '<div class="sheet-head"><div>' + (eyebrow ? '<div class="eyebrow">' + eyebrow + '</div>' : '') + '<h2>' + title + '</h2></div><button class="icon-btn soft" data-act="close" aria-label="Cerrar">' + icon('close') + '</button></div>';
  }

  /* ---------------- Barra superior y pestañas ---------------- */
  var TITLES = { map: 'Mapa del parque', album: 'Álbum', team: 'Mi equipo', prizes: 'Premios', passport: 'Pasaporte' };
  function renderTop() {
    $('#topbar').innerHTML = '<div class="tb-inner"><button class="tb-back" data-act="closemenu">' + icon('back') + '<span>Parque</span></button>' +
      '<h1 class="tb-title">' + TITLES[tab] + '</h1><button class="icon-btn soft" data-act="settings" aria-label="Ajustes">' + icon('gear') + '</button></div>';
    if (DC.Walk && DC.Walk.hudRes) DC.Walk.hudRes();
  }
  function openMenu(t) {
    if (DC.Walk) { DC.Walk.pause(); DC.Walk.menu = true; }
    $('#screens').hidden = false;
    go(t || tab);
  }
  function closeMenu() {
    if (DC.Map3D) DC.Map3D.unmount();
    closeModals();
    $('#screens').hidden = true;
    if (DC.Walk) DC.Walk.resume();
  }
  function renderTabs() {
    var s = S();
    var claim = s.visit ? s.visit.missions.filter(function (m) { return m.done && !m.claimed; }).length : 0;
    var tabs = [['map', 'map', 'Mapa', claim], ['album', 'book', 'Álbum', 0], ['team', 'team', 'Equipo', 0], ['prizes', 'gift', 'Premios', s.codes.filter(function (c) { return !c.redeemed; }).length], ['passport', 'passport', 'Pasaporte', 0]];
    $('#tabbar').innerHTML = tabs.map(function (t) {
      return '<button data-act="tab" data-tab="' + t[0] + '"' + (tab === t[0] ? ' aria-current="page"' : '') + '><span class="tab-ic">' + icon(t[1]) + '</span><span class="tab-tx">' + t[2] + '</span>' +
        (t[3] ? '<span class="badge num">' + t[3] + '</span>' : '') + '</button>';
    }).join('');
  }
  function render() {
    renderTop(); renderTabs();
    var v = $('#view');
    if (DC.Map3D) DC.Map3D.unmount();
    var fn = { map: viewMap, album: viewAlbum, team: viewTeam, passport: viewPassport, prizes: viewPrizes }[tab];
    v.className = 'view-' + tab;
    v.innerHTML = fn();
    if (tab === 'map' && DC.Map3D && !$('#screens').hidden) { try { DC.Map3D.mount($('#map3d')); } catch (e) { console.error(e); } }
    fillPortraits(v);
  }
  function go(t) { tab = t; render(); $('#view').scrollTop = 0; }

  /* =====================================================================
     INICIO: mapa 3D
     ===================================================================== */
  function nextZone() { var v = S().visit || { zones: [] }; return DC.ZONES.find(function (z) { return v.zones.indexOf(z.id) < 0; }); }
  function xmasStrip() {
    if (!DC.SEASON.xmas) return '';
    var s = S(), n = Object.keys(s.xmas || {}).length, seen = s.visit ? (s.visit.xmasSeen || 0) : 0;
    return '<button class="xmas-strip" data-act="tab" data-tab="album" data-sub="navidad"><span class="xs-snow">' + icon('snow') + '</span><span class="xs-txt"><b>Navidad Jurásica · ' + n + '/' + DC.XMAS.length + '</b><small>' +
      (seen >= DC.XMAS_PER_VISIT ? 'Ya apareció el especial de hoy. ¡Vuelve mañana!' : 'Hoy puede aparecer 1 especial navideño en los hábitats') + '</small></span>' +
      '<span class="xs-mini">' + DC.XMAS.slice(0, 3).map(function (x) { return img(x.sp, s.xmas[x.id] ? '' : 'sil', x.name, x.id); }).join('') + '</span></button>';
  }
  function viewMap() {
    var s = S(), v = s.visit;
    var done = v ? v.zones.length : 0;
    var steps = '';
    for (var i = 0; i < DC.ZONES.length; i++) steps += '<i class="' + (v && v.zones.indexOf(i + 1) >= 0 ? 'on' : '') + '"></i>';
    var missions = v ? v.missions.map(function (m) {
      var def = DC.Store.missionDef(m.id); if (!def) return '';
      return '<div class="mission' + (m.done ? ' done' : '') + (m.claimed ? ' claimed' : '') + '"><div class="m-ic">' + icon(m.claimed ? 'check' : 'star') + '</div><div class="m-body"><b>' + esc(def.text) + '</b>' +
        '<div class="m-bar"><i style="width:' + pct(m.progress, def.goal) + '%"></i></div><small class="num">' + m.progress + '/' + def.goal + ' · +' + def.coins + ' monedas</small></div>' +
        (m.claimed ? '' : m.done ? '<button class="btn small sun" data-act="claim" data-id="' + m.id + '">Reclamar</button>' : '') + '</div>';
    }).join('') : '';
    var eggs = s.eggs.length ? '<div class="card egg-card"><div class="egg-shape" aria-hidden="true"></div><div><b>' + s.eggs.length + (s.eggs.length > 1 ? ' huevos incubando' : ' huevo incubando') + '</b><p class="muted">Eclosiona' + (s.eggs.length > 1 ? 'n' : '') + ' en tu próxima visita.</p></div></div>' : '';
    return '<div class="home">' +
      '<div class="map-card"><div class="map3d" id="map3d"></div>' +
      '<div class="map-top"><span class="tag">Visita ' + (v ? v.n : 1) + '</span><span class="tag route"><span class="route-steps">' + steps + '</span>' + done + '/' + DC.ZONES.length + ' hoy</span></div></div>' +
      '<p class="note">' + icon('pin') + '<span>El mapa es para mirar. Para atrapar dinosaurios, <b>camina hasta el hábitat</b> con tu avatar.</span></p>' +
      xmasStrip() +
      '<div class="section-title"><h2>Misiones de hoy</h2><span class="muted">Las 3: +3 esferas</span></div>' +
      '<div class="list-plain">' + missions + '</div>' + eggs + '</div>';
  }

  function zoneSheet(zid) {
    var z = DC.ZONES.find(function (x) { return x.id === zid; });
    if (DC.Map3D && DC.Map3D.focus) DC.Map3D.focus(zid);
    var s = S();
    var sp = DC.SPECIES.filter(function (x) { return x.zone === zid; });
    var list = sp.map(function (x) {
      var a = DC.Store.availability(x), e = s.album[x.id];
      return '<div class="sp-row">' + img(x.id, (e && e.caught ? '' : 'sil'), x.name) +
        '<div class="sp-info"><b>' + (e && e.seen ? esc(x.name) : '???') + '</b> ' + stars(x.rarity) +
        '<small class="' + (a.ok ? 'ok' : '') + '">' + (a.ok ? 'Puede aparecer hoy' : esc(a.why)) + (e && e.caught ? ' · capturado x' + e.caught : '') + '</small></div>' + typeChip(x.type) + '</div>';
    }).join('');
    var uLeft = DC.UNIQUES.filter(function (u) { return u.zone === zid; });
    var uq = uLeft.length ? '<div class="uniq-strip">' + uLeft.map(function (u) {
      var got = s.uniques[u.id];
      return '<span class="u-chip' + (got ? ' got' : '') + '" style="--vc:' + u.color + '">★ ' + (got ? esc(u.name) : 'Único escondido') + '</span>';
    }).join('') + '</div>' : '';
    var xm = DC.SEASON.xmas ? DC.XMAS.filter(function (x) { return x.zone === zid; }) : [];
    var xs = xm.length ? '<div class="uniq-strip">' + xm.map(function (x) { var got = s.xmas[x.id]; return '<span class="u-chip xm' + (got ? ' got' : '') + '">' + icon('snow') + (got ? esc(x.name) : 'Especial navideño') + '</span>'; }).join('') + '</div>' : '';
    var here = s.visit && s.visit.zones.indexOf(zid) >= 0;
    return modal('<div class="zone-hero" style="--zc:' + z.color + '"><div class="eyebrow">Hábitat ' + z.id + ' de ' + DC.ZONES.length + '</div><h2>' + esc(z.name) + '</h2><p>' + esc(z.desc) + '</p>' +
      '<button class="icon-btn soft" data-act="close" aria-label="Cerrar">' + icon('close') + '</button></div>' +
      list + uq + xs +
      '<div class="stack" style="margin-top:16px">' +
      '<button class="btn block sun big" data-act="walkto" data-zone="' + zid + '">' + icon('pin') + 'Ir caminando</button>' +
      '<p class="muted small center-text">' + (here ? 'Ya visitaste este hábitat hoy.' : 'Los dinosaurios aparecen cuando tu avatar llega al hábitat.') + '</p>' +
      '</div>');
  }

  /* =====================================================================
     ÁLBUM: especies, únicos y colores
     ===================================================================== */
  function viewAlbum() {
    var s = S(), n = DC.Store.caughtCount(), uq = Object.keys(s.uniques || {}).length;
    var nv = DC.VARIANT_ORDER.filter(function (v) { return DC.SPECIES.some(function (sp) { return s.album[sp.id] && s.album[sp.id].variants && s.album[sp.id].variants[v]; }); }).length;
    var seg = '<div class="segtabs" role="tablist">' +
      [['species', 'Especies', n + '/' + DC.SPECIES.length], ['navidad', 'Navidad', Object.keys(s.xmas || {}).length + '/' + DC.XMAS.length], ['uniques', 'Únicos', uq + '/' + DC.UNIQUES.length], ['colors', 'Colores', nv + '/' + DC.VARIANT_ORDER.length]].map(function (t) {
        return '<button role="tab" data-act="albumsub" data-sub="' + t[0] + '" aria-selected="' + (albumSub === t[0]) + '">' + t[1] + '<small class="num">' + t[2] + '</small></button>';
      }).join('') + '</div>';
    var body;
    if (albumSub === 'navidad') body = viewXmas();
    else if (albumSub === 'uniques') body = viewUniques();
    else if (albumSub === 'colors') body = viewColors();
    else {
      body = '<div class="album-head"><div class="ring-prog" style="--p:' + pct(n, DC.SPECIES.length) + '"><b class="num">' + n + '</b><small>/' + DC.SPECIES.length + '</small></div><div><h1>Dinopedia</h1><p class="muted">Completa el álbum y gana una <b>entrada gratis</b>.</p></div></div>' +
        '<div class="album-grid">' + DC.SPECIES.map(function (sp) {
          var e = s.album[sp.id], caught = e && e.caught > 0, seen = e && e.seen > 0;
          var vs = caught && e.variants ? Object.keys(e.variants).filter(function (k) { return DC.VARIANTS[k]; }) : [];
          return '<button class="dcard r-' + sp.rarity + (caught ? '' : ' locked') + '" data-act="ficha" data-sp="' + sp.id + '" aria-label="' + (seen ? esc(sp.name) : 'Especie desconocida') + '">' +
            '<span class="no num">' + String(sp.no).padStart(2, '0') + '</span>' + (caught ? '<span class="tdot" style="--tc:' + DC.TYPES[sp.type].color + '"></span>' : '') +
            '<span class="dimg">' + img(sp.id, caught ? '' : 'sil', '') + '</span>' +
            '<span class="nm">' + (seen ? esc(sp.name) : '???') + '</span>' +
            '<span class="meta">' + stars(sp.rarity) + (vs.length ? '<span class="vdots">' + vs.map(function (k) { return '<i style="--vc:' + DC.VARIANTS[k].chip + '"></i>'; }).join('') + '</span>' : '<span class="num">' + (caught ? 'x' + e.caught : seen ? 'Visto' : 'Zona ' + sp.zone) + '</span>') + '</span></button>';
        }).join('') + '</div>';
    }
    return '<div class="stack">' + seg + body + '</div>';
  }
  function viewXmas() {
    var s = S(), n = Object.keys(s.xmas || {}).length, done = s.collectionPrizes.indexOf('xmas') >= 0;
    return '<div class="xmas-hero"><div class="xh-snow" aria-hidden="true">' + icon('snow') + '</div><div><div class="eyebrow">Temporada especial</div><h1>Navidad Jurásica</h1>' +
      '<p>6 dinosaurios con gorros, astas y estrellas. Son <b>muy raros</b>: sale como máximo <b>1 por visita</b>. Con los 6 ganas <b class="num">' + DC.POINTS.xmasAll + '</b> Dino-puntos y un <b>peluche</b>.</p>' +
      '<div class="uq-bar"><i style="width:' + pct(n, DC.XMAS.length) + '%"></i><span class="num">' + n + ' / ' + DC.XMAS.length + '</span></div>' + (done ? '<span class="chip ok">' + icon('check') + 'Colección completa</span>' : '') + '</div></div>' +
      '<div class="uniq-grid">' + DC.XMAS.map(function (x) {
        var got = s.xmas[x.id];
        return '<div class="ucard xcard' + (got ? ' got' : '') + '" style="--vc:' + x.color + '"><div class="u-img">' + img(x.sp, got ? '' : 'sil', x.name, x.id) + (got ? '' : '<span class="u-q">?</span>') + '</div>' +
          '<b>' + (got ? esc(x.name) : '???') + '</b><small>' + (got ? esc(x.lore) : 'Hábitat ' + x.zone + ' · ' + esc(DC.ZONES[x.zone - 1].short)) + '</small>' +
          '<span class="u-prize">+' + DC.POINTS.xmas + ' pts</span></div>';
      }).join('') + '</div>';
  }
  function viewUniques() {
    var s = S(), n = Object.keys(s.uniques || {}).length;
    return '<div class="uniq-hero">' + prizeArt('helado') + '<div><h1>Dinosaurios únicos</h1><p>Hay <b>8</b> en todo el parque y cada uno aparece una sola vez para ti. Por cada único que atrapes ganas un <b>helado gratis</b>. ¡Con los 8, un peluche dorado!</p>' +
      '<div class="uq-bar"><i style="width:' + pct(n, 8) + '%"></i><span class="num">' + n + ' / 8</span></div></div></div>' +
      '<div class="uniq-grid">' + DC.UNIQUES.map(function (u) {
        var got = s.uniques[u.id], sp = DC.SP[u.sp], av = DC.Store.availability(sp);
        var code = got ? s.codes.find(function (c) { return c.code === got.code; }) : null;
        return '<div class="ucard' + (got ? ' got' : '') + '" style="--vc:' + u.color + ';--va:' + u.aura + '">' +
          '<div class="u-img">' + img(u.sp, got ? '' : 'sil', u.name, got ? u.id : null) + (got ? '' : '<span class="u-q">?</span>') + '</div>' +
          '<b>' + (got ? esc(u.name) : '¿' + esc(sp.name) + ' único?') + '</b>' +
          '<small>' + (got ? esc(u.lore) : 'Zona ' + u.zone + ' · ' + esc(DC.ZONES[u.zone - 1].short) + (av.ok ? '' : ' · ' + esc(av.why))) + '</small>' +
          (got ? (code ? '<button class="btn small ' + (code.redeemed ? 'ghost' : 'pink') + '" data-act="showcode" data-code="' + code.code + '">' + (code.redeemed ? 'Helado canjeado' : 'Ver mi helado') + '</button>' : '')
            : '<span class="u-prize">' + prizeArt('helado') + 'Helado gratis</span>') + '</div>';
      }).join('') + '</div>';
  }
  function viewColors() {
    var s = S();
    return '<div class="colors-intro"><h1>Dinos de colores</h1><p class="muted">Cualquier especie puede aparecer con un color especial. Son más fuertes y dan más monedas. Al atardecer (desde las 4 p. m.) los dorados salen casi el doble.</p></div>' +
      '<div class="color-list">' + DC.VARIANT_ORDER.map(function (k) {
        var v = DC.VARIANTS[k], cnt = 0, sps = [];
        DC.SPECIES.forEach(function (sp) { var e = s.album[sp.id]; if (e && e.variants && e.variants[k]) { cnt += e.variants[k]; sps.push(sp.id); } });
        return '<div class="color-row" style="--vc:' + v.chip + '"><span class="swatch"></span><div class="c-body"><b>' + v.name + '</b><small>1 de cada ' + Math.round(1 / v.chance) + ' encuentros · monedas x' + v.coins + ' · stats +' + Math.round((v.mult - 1) * 100) + ' %</small>' +
          (sps.length ? '<div class="c-mini">' + sps.slice(0, 6).map(function (id) { return img(id, '', DC.SP[id].name, k); }).join('') + '</div>' : '') + '</div><b class="num c-cnt">' + cnt + '</b></div>';
      }).join('') + '</div>';
  }

  function ficha(spId, fromCapture) {
    var sp = DC.SP[spId], s = S(), e = DC.Store.albumEntry(spId);
    var caught = e.caught > 0;
    if (!e.seen) {
      return modal(head('#' + String(sp.no).padStart(2, '0') + ' · Zona ' + sp.zone, 'Especie desconocida') +
        '<div class="unknown">' + img(spId, 'sil', '') + '<p>Búscala en <b>' + esc(DC.ZONES[sp.zone - 1].name) + '</b>. ' + esc(DC.Store.availability(sp).why) + '.</p></div>');
    }
    if (caught && !e.read) { e.read = true; s.totals.fichas++; DC.Store.bump('fichas'); }
    var kid = s.age === 'nino';
    var beats = DC.TYPE_BEATS[sp.type], weak = Object.keys(DC.TYPE_BEATS).find(function (k) { return DC.TYPE_BEATS[k] === sp.type; });
    var quiz = '';
    if (caught && !e.quiz) {
      quiz = '<div class="quiz"><div class="eyebrow">Pregunta · +40 XP · +30 monedas</div><h3>' + esc(sp.quiz.q) + '</h3>' +
        '<div class="quiz-opts">' + sp.quiz.options.map(function (o, i) { return '<button data-act="quiz" data-sp="' + spId + '" data-i="' + i + '"><span class="qletter">' + 'ABC'[i] + '</span>' + esc(o) + '</button>'; }).join('') + '</div></div>';
    } else if (e.quiz) quiz = '<div class="chip okchip">' + icon('check') + 'Pregunta respondida</div>';
    var vs = e.variants ? Object.keys(e.variants) : [];
    var html = '<div class="ficha-hero" style="--tc:' + DC.TYPES[sp.type].color + '">' +
      '<button class="icon-btn soft" data-act="close" aria-label="Cerrar">' + icon('close') + '</button>' +
      '<div class="fh-img">' + img(spId, '', sp.name) + '</div>' +
      '<div class="eyebrow">#' + String(sp.no).padStart(2, '0') + ' · ' + esc(DC.ZONES[sp.zone - 1].name) + '</div><h2>' + esc(sp.name) + '</h2>' +
      '<div class="chips">' + typeChip(sp.type) + stars(sp.rarity) + (sp.notDino ? '<span class="chip sky">No es dinosaurio</span>' : '') + '</div>' +
      '<small>' + esc(sp.period) + ' · ' + esc(sp.mya) + (caught ? ' · capturado x' + e.caught : '') + '</small></div>' +
      '<div class="stack">' +
      (vs.length ? '<div class="var-row">' + vs.map(function (k) { var lk = DC.look(k); return lk ? '<span class="vchip' + (lk.unique ? ' unique' : '') + '" style="--vc:' + lk.chip + '">' + esc(lk.name) + '</span>' : ''; }).join('') + '</div>' : '') +
      '<div class="row between"><h3>Ficha educativa</h3><div class="seg" role="group" aria-label="Nivel de lectura">' +
      '<button data-act="fmode" data-m="nino" aria-pressed="' + kid + '">Niño</button><button data-act="fmode" data-m="adulto" aria-pressed="' + !kid + '">Adulto</button></div></div>' +
      '<p id="ftext" class="ftext">' + esc(kid ? sp.kid : sp.adult) + '</p>' +
      '<div class="facts"><div><small>Largo</small><b>' + sp.length + ' m</b></div><div><small>Peso</small><b>' + esc(sp.weight) + '</b></div><div><small>Altura</small><b>' + sp.height + ' m</b></div><div><small>Dieta</small><b>' + esc(sp.diet) + '</b></div></div>' +
      '<div class="fact-card"><div class="eyebrow">¿Sabías que…?</div><p>' + esc(sp.fact) + '</p></div>' +
      '<div class="adv"><div class="good"><b>Fuerte contra ' + DC.TYPES[beats].name + '</b><span>' + esc(DC.TYPE_REASON[sp.type]) + '</span></div>' +
      '<div class="bad"><b>Débil contra ' + DC.TYPES[weak].name + '</b><span>' + esc(DC.TYPE_REASON[weak]) + '</span></div></div>' +
      quiz +
      (caught ? '<button class="btn ghost block" data-act="photo" data-sp="' + spId + '">' + icon('photo') + 'Tomar foto AR con ' + esc(sp.name) + '</button>' : '') +
      (fromCapture ? '<button class="btn block sun" data-act="close">Seguir explorando</button>' : '') +
      '</div>';
    var m = modal(html, { cls: 'ficha' });
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
      var sp = DC.SP[d.sp], st = DC.Store.stats(d), lk = DC.look(d.variant);
      var hp = pct(d.hp, st.maxHp), isP = d.uid === s.partner;
      var u = DC.UNIQUE[d.variant];
      return '<div class="tcard' + (isP ? ' partner' : '') + '" style="--tc:' + DC.TYPES[sp.type].color + (lk ? ';--vc:' + lk.chip : '') + '">' +
        '<div class="t-img' + (lk ? ' special' : '') + '">' + img(d.sp, '', sp.name, d.variant) + '<span class="t-lv num">Nv. ' + d.lvl + '</span></div>' +
        '<div class="t-body">' + (isP ? '<span class="partner-tag">' + icon('star') + 'Compañero</span>' : '') +
        '<b class="t-name">' + esc(u ? u.name : sp.name) + '</b>' +
        '<div class="chips">' + typeChip(sp.type) + (lk ? '<span class="vchip' + (lk.unique ? ' unique' : '') + '" style="--vc:' + lk.chip + '">' + (lk.unique ? '★ Único' : esc(lk.name)) + '</span>' : '') + '</div>' +
        '<div class="hpbar ' + hpClass(hp) + '"><i style="width:' + hp + '%"></i><span class="num">' + d.hp + ' / ' + st.maxHp + '</span></div>' +
        '<div class="t-stats num"><span>ATQ ' + st.atk + '</span><span>DEF ' + st.def + '</span><span>XP ' + d.xp + '/' + DC.dinoXpToNext(d.lvl) + '</span></div>' +
        '<div class="t-acts">' + (isP ? '' : '<button class="btn small green" data-act="partner" data-uid="' + d.uid + '">Elegir</button>') +
        (d.hp < st.maxHp ? '<button class="btn small ghost" data-act="heal" data-uid="' + d.uid + '"' + (s.items.leaf > 0 ? '' : ' disabled') + '>' + icon('leaf') + 'Curar (' + (s.items.leaf || 0) + ')</button>' : '') +
        '<button class="btn small ghost" data-act="photo" data-sp="' + d.sp + '" data-uid="' + d.uid + '">' + icon('photo') + 'Foto</button></div></div></div>';
    }).join('');
    return '<div class="stack"><div class="page-head"><h1>Tu manada</h1><p class="muted">' + s.team.length + ' dinosaurio' + (s.team.length > 1 ? 's' : '') + '. Recuperan vida con el tiempo y se curan por completo en tu próxima visita.</p></div>' + list + '</div>';
  }

  /* =====================================================================
     PASAPORTE
     ===================================================================== */
  function viewPassport() {
    var s = S();
    var stamps = DC.PASSPORT.map(function (p) {
      var on = s.visits >= p.visit;
      return '<div class="stamp' + (on ? ' on' : '') + '"><div class="st-in"><b class="num">' + p.visit + '</b><span>' + esc(p.title) + '</span></div>' + (p.prize ? '<span class="st-prize">' + prizeArt(p.prize) + '</span>' : '') + '</div>';
    }).join('');
    var next = DC.PASSPORT.find(function (p) { return s.visits < p.visit; });
    var cal = DC.SPECIES.filter(function (sp) { return sp.days || sp.afterHour || sp.minVisits; }).map(function (sp) {
      var a = DC.Store.availability(sp), e = s.album[sp.id];
      var rule = sp.days ? sp.days.map(function (d) { return DC.DAYS[d]; }).join(', ') : sp.afterHour ? 'Desde las ' + (sp.afterHour - 12) + ' p. m.' : 'Desde tu visita n.º ' + sp.minVisits;
      return '<tr><td><b>' + (e && e.seen ? esc(sp.name) : '???') + '</b><small>Zona ' + sp.zone + '</small></td><td>' + esc(rule) + '</td><td>' + (a.ok ? '<span class="yes">Hoy sí</span>' : '<span class="no">Hoy no</span>') + '</td></tr>';
    }).join('');
    var medals = DC.MEDALS.map(function (m) {
      var on = s.medals.indexOf(m.id) >= 0;
      return '<div class="medal' + (on ? ' on' : '') + '" title="' + esc(m.name) + '"><span>' + icon(on ? 'medal' : 'lock') + '</span><small>' + esc(m.name) + '</small></div>';
    }).join('');
    return '<div class="stack"><div class="passport-hero"><div class="pp-icon">' + icon('passport') + '</div><div><div class="eyebrow">Pasaporte Jurásico</div><h1 class="num">' + s.visits + (s.visits === 1 ? ' visita' : ' visitas') + '</h1>' +
      '<p>' + (next ? 'Próximo sello en la visita <b>' + next.visit + '</b>: ' + esc(next.reward) : '¡Completaste el pasaporte!') + '</p></div></div>' +
      '<div class="stamps">' + stamps + '</div>' +
      '<div class="section-title"><h2>Calendario de especies</h2></div>' +
      '<div class="card table-wrap"><table class="cal"><thead><tr><th>Especie</th><th>Cuándo aparece</th><th>Hoy</th></tr></thead><tbody>' + cal + '</tbody></table></div>' +
      '<div class="section-title"><h2>Medallas</h2><span class="muted num">' + s.medals.length + '/' + DC.MEDALS.length + '</span></div>' +
      '<div class="medals">' + medals + '</div>' +
      '<div class="stats4"><div><b class="num">' + s.totals.caps + '</b><small>Capturas</small></div><div><b class="num">' + s.totals.wins + '</b><small>Victorias</small></div><div><b class="num">' + s.totals.routes + '</b><small>Rutas</small></div><div><b class="num">' + ((s.totals.variants || 0) + Object.keys(s.uniques || {}).length) + '</b><small>Especiales</small></div></div>' +
      '</div>';
  }

  /* =====================================================================
     PREMIOS
     ===================================================================== */
  function qrSVG(text) {
    try { var q = window.qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 3, margin: 0, scalable: true }); }
    catch (e) { return '<span class="mono">' + esc(text) + '</span>'; }
  }
  function viewPrizes() {
    var s = S(), v = s.visit || { bought: 0 }, today = DC.Store.pointsToday(), cap = DC.POINTS.daily;
    var real = DC.POINT_PRIZES.map(function (pp) {
      var p = DC.PRIZES[pp.id], can = s.points >= pp.pts;
      return '<div class="prow" style="--pc:' + p.color + '"><span class="pr-art">' + prizeArt(pp.id) + '</span><div class="pr-body"><b>' + esc(p.name) + '</b><small>' + esc(p.place) + '</small>' +
        '<div class="pc-bar"><i style="width:' + pct(s.points, pp.pts) + '%"></i></div></div>' +
        '<button class="btn small ' + (can ? 'sun' : 'ghost') + '" data-act="buyprize" data-id="' + pp.id + '"' + (can ? '' : ' disabled') + '><span class="num">' + pp.pts + '</span> pts</button></div>';
    }).join('');
    var shop = DC.SHOP.map(function (it) {
      var lim = it.id === 'sphere' && v.bought >= DC.SPHERE_BUY_LIMIT;
      var can = s.coins >= it.price && !lim;
      var have = it.id === 'sphere' ? s.spheres : (s.items[it.id] || 0);
      var ic = it.id === 'sphere' ? '<i class="ball-ico dino big"></i>' : it.id === 'super' ? '<i class="ball-ico super big"></i>' : it.id === 'ultra' ? '<i class="ball-ico ultra big"></i>' : '<span class="item-ic ' + it.id + '">' + icon('leaf') + '</span>';
      return '<div class="shop-row">' + ic + '<div class="sr-body"><b>' + esc(it.name) + '</b><small>' + esc(it.desc) + ' Tienes <b class="num">' + have + '</b>.</small></div>' +
        '<button class="btn small ' + (can ? 'green' : 'ghost') + '" data-act="buy" data-id="' + it.id + '"' + (can ? '' : ' disabled') + '><i class="coin-ico"></i><span class="num">' + it.price + '</span></button></div>';
    }).join('');
    var codes = s.codes.length ? s.codes.map(function (c) {
      return '<button class="code-card' + (c.redeemed ? ' used' : '') + '" data-act="showcode" data-code="' + c.code + '"><span class="cc-art">' + prizeArt(c.prize || 'sticker') + '</span><span class="cc-body"><b>' + esc(c.label) + '</b><span class="code mono">' + c.code + '</span><small>' + esc(c.source) + '</small></span>' +
        '<span class="cc-state">' + (c.redeemed ? 'Canjeado' : icon('qr')) + '</span></button>';
    }).join('') : '<p class="muted empty-line">Aún no tienes premios. Junta Dino-puntos o completa la ruta de todos los hábitats.</p>';
    var P = DC.POINTS;
    var earn = [['Capturar (común · rara · épica · legendaria)', P.capture.comun + ' · ' + P.capture.rara + ' · ' + P.capture.epica + ' · ' + P.capture.legendaria],
      ['Dinosaurio de color', '+' + P.variant], ['Dinosaurio único', '+' + P.unique], ['Especial navideño', '+' + P.xmas], ['Vencer a un jefe (réplica)', '+' + P.boss], ['Ruta de todos los hábitats', '+' + P.route],
      ['Colección navideña completa', '+' + P.xmasAll + ' (sin límite)']].map(function (r) { return '<div class="earn-row"><span>' + r[0] + '</span><b class="num">' + r[1] + '</b></div>'; }).join('');
    return '<div class="stack">' +
      '<div class="wallet"><div class="eyebrow">Tus Dino-puntos</div><div class="wallet-num"><span class="pt-big">★</span><b class="num">' + s.points + '</b></div>' +
      '<div class="daybar"><i style="width:' + pct(today, cap) + '%"></i></div><small class="num">Hoy ' + today + ' / ' + cap + ' · ' + (today >= cap ? 'Límite de hoy alcanzado: vuelve mañana' : 'límite diario, los premios grandes toman varias visitas') + '</small></div>' +
      '<div class="section-title"><h2>Mis premios</h2></div>' + codes +
      '<div class="section-title"><h2>Canjea tus puntos</h2></div><div class="list-plain">' + real + '</div>' +
      '<div class="section-title"><h2>Cómo ganar puntos</h2></div><div class="list-plain earn">' + earn + '</div>' +
      '<div class="section-title"><h2>Tienda</h2><span class="muted"><i class="coin-ico"></i> <b class="num">' + s.coins + '</b> monedas</span></div><div class="list-plain">' + shop + '</div></div>';
  }
  function prizeModal(c, onClose, title) {
    if (!c) { onClose && onClose(); return; }
    var p = DC.PRIZES[c.prize] || {};
    DC.Audio.play('levelup');
    return modal('<div class="prize-modal" style="--pc:' + (p.color || '#ffc531') + '"><div class="pm-burst"></div><div class="pm-art">' + prizeArt(c.prize || 'sticker') + '</div>' +
      '<div class="eyebrow">' + esc(title || '¡Ganaste un premio!') + '</div><h1>' + esc(c.label) + '</h1>' +
      '<p class="muted">' + esc(p.desc || '') + (p.place ? ' Canjéalo en: <b>' + esc(p.place) + '</b>.' : '') + '</p>' +
      '<div class="pm-qr">' + qrSVG(c.code) + '</div><div class="code mono">' + c.code + '</div>' +
      (c.redeemed ? '<span class="chip">Ya fue canjeado</span>' : '<button class="btn ghost small" data-act="copy" data-code="' + c.code + '">Copiar código</button>') +
      '<button class="btn block sun" data-act="close">¡Genial!</button></div>', { center: true, onClose: onClose });
  }

  /* =====================================================================
     AJUSTES Y PANEL
     ===================================================================== */
  function sw(key, on, label, sub) {
    return '<div class="toggle-row"><div><b>' + label + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>' +
      '<button class="switch" role="switch" aria-checked="' + !!on + '" aria-label="' + esc(label) + '" data-act="setting" data-key="' + key + '"></button></div>';
  }
  function settings() {
    var s = S();
    var ages = [['nino', 'Niño'], ['joven', 'Joven'], ['adulto', 'Adulto']].map(function (a) { return '<button data-act="age" data-a="' + a[0] + '" aria-pressed="' + (s.age === a[0]) + '">' + a[1] + '</button>'; }).join('');
    return modal(head('', 'Ajustes') +
      '<div class="stack" style="margin-top:12px">' +
      '<label class="field-wrap"><span class="eyebrow">Nombre del explorador</span><input id="set-name" class="field" maxlength="18" value="' + esc(s.name) + '"></label>' +
      '<div class="row between"><span class="eyebrow">Fichas para</span><div class="seg" role="group">' + ages + '</div></div>' +
      '<div class="card list">' +
      sw('sound', s.settings.sound, 'Sonido y vibración') +
      sw('camera', s.settings.camera, 'Cámara AR', 'Ver los dinosaurios sobre la cámara. Apagado: parque 3D') +
      sw('gyro', s.settings.gyro, 'Giroscopio', 'Mueve el celular para mirar alrededor') +
      sw('lite', s.settings.lite, 'Modo ligero', 'Menos efectos: ahorra batería') +
      '</div>' +
      '<button class="btn ghost small" data-act="editavatar">' + icon('team') + 'Editar mi avatar</button>' +
      '<button class="btn ghost small" data-act="train">' + icon('target') + 'Entrenar réplicas del parque (cámara)</button>' +
      '<div class="card stack" style="gap:10px"><div><div class="eyebrow">Modo presentación</div><p class="muted">Para mostrar el proyecto sin esperar días reales.</p></div>' +
      '<button class="btn ghost small" data-act="dev-visit">Simular próxima visita (+1 día)</button>' +
      '<button class="btn ghost small" data-act="dev-spheres">+10 esferas de cada tipo y +2000 monedas</button>' +
      '<button class="btn ghost small" data-act="dev-unique">Hacer aparecer un dinosaurio único</button>' +
      '<button class="btn ghost small" data-act="dev-xmas">Hacer aparecer un especial navideño</button>' +
      '<button class="btn ghost small" data-act="dev-points">+500 Dino-puntos</button>' +
      '<button class="btn ghost small" data-act="panel">' + icon('chart') + 'Panel Dino Park</button>' +
      '<button class="btn danger small" data-act="reset">Borrar progreso</button></div>' +
      '<p class="credit">' + esc(DC.MODEL_CREDIT || '') + '</p>' +
      '</div>', {
      onClose: function () { var n = $('#set-name'); }
    });
  }
  function defaultAvatar() { var C = DC.AVATAR_COLORS; return { hat: 'navidad', shirt: C.shirt[2], pants: C.pants[0], skin: C.skin[0], hair: C.hair[0] }; }
  function avatarPreview(host) {
    var T = THREE, w = host.clientWidth || 200, h = host.clientHeight || 230;
    var r = new T.WebGLRenderer({ antialias: true, alpha: true }); r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); r.setSize(w, h);
    host.appendChild(r.domElement);
    var sc = new T.Scene(); sc.add(new T.HemisphereLight('#ffffff', '#8a9a7a', 1.0));
    var dl = new T.DirectionalLight('#ffffff', 0.8); dl.position.set(2, 4, 3); sc.add(dl);
    var cam = new T.PerspectiveCamera(30, w / h, 0.1, 50); cam.position.set(0, 1.55, 5.3); cam.lookAt(0, 1.32, 0);
    var base = new T.Mesh(new T.CylinderGeometry(0.9, 0.9, 0.08, 32), new T.MeshStandardMaterial({ color: '#eef4f1' })); base.position.y = -0.04; sc.add(base);
    var av = null, alive = true, t0 = performance.now();
    function set(a) { if (av) sc.remove(av); av = DC.Avatar.build(a, true); sc.add(av); }
    var last = performance.now(); (function loop() { if (!alive) return; requestAnimationFrame(loop); var now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now; var t = (now - t0) / 1000; if (av) { av.rotation.y = Math.sin(t * 0.7) * 0.55; DC.Avatar.animate(av, 0, dt, t); } r.render(sc, cam); })();
    return { set: set, dispose: function () { alive = false; r.dispose(); } };
  }
  function avatarForm(a) {
    var C = DC.AVATAR_COLORS;
    function row(label, k, list) { return '<div class="av-row"><span>' + label + '</span><div class="swatches">' + list.map(function (c) { return '<button class="swatch" data-av="' + k + '" data-v="' + c + '" style="--c:' + c + '" aria-label="' + label + '" aria-pressed="' + (a[k] === c) + '"></button>'; }).join('') + '</div></div>'; }
    return '<div class="av-edit"><div class="av-prev" id="avprev"></div><div class="av-opts">' +
      '<div class="av-hats">' + DC.AVATAR_HATS.map(function (h) { return '<button class="hat-btn" data-av="hat" data-v="' + h.id + '" aria-pressed="' + (a.hat === h.id) + '">' + esc(h.name) + '</button>'; }).join('') + '</div>' +
      row('Polera', 'shirt', C.shirt) + row('Pantalón', 'pants', C.pants) + row('Piel', 'skin', C.skin) + row('Cabello', 'hair', C.hair) + '</div></div>';
  }
  function bindAvatarForm(root, a) {
    var pv = avatarPreview(root.querySelector('#avprev')); pv.set(a);
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-av]'); if (!b) return;
      a[b.dataset.av] = b.dataset.v; DC.Audio.play('tap');
      root.querySelectorAll('[data-av="' + b.dataset.av + '"]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
      pv.set(a);
    });
    return pv;
  }
  function avatarEditor() {
    var s = S(), a = Object.assign(defaultAvatar(), s.avatar || {});
    var m = modal(head('', 'Mi avatar') + avatarForm(a) + '<button class="btn block sun" id="av-save">Guardar</button>', { center: true });
    var pv = bindAvatarForm(m, a);
    m.querySelector('#av-save').addEventListener('click', function () { s.avatar = a; DC.Store.save(); if (DC.Walk.rebuildAvatar) DC.Walk.rebuildAvatar(); pv.dispose(); m.close(); toast('Avatar actualizado', 'check'); });
  }
  function avatarPicker() {
    var a = S().avatar || {}, C = DC.AVATAR_COLORS;
    var dots = function (k, list, cur) { return list.map(function (c, i) { return '<button class="swatch" data-act="avatar" data-k="' + k + '" data-c="' + c + '" style="--c:' + c + '" aria-label="Color ' + (i + 1) + '" aria-pressed="' + ((cur || list[0]) === c) + '"></button>'; }).join(''); };
    return '<div class="card stack" style="gap:8px"><div class="eyebrow">Tu avatar para el paseo</div>' +
      '<div class="row between"><span class="small">Polera</span><div class="swatches">' + dots('shirt', C.shirt, a.shirt) + '</div></div>' +
      '<div class="row between"><span class="small">Piel</span><div class="swatches">' + dots('skin', C.skin, a.skin) + '</div></div></div>';
  }
  function panel() {
    var s = S();
    var hist = s.history.slice();
    if (s.visit) hist.push({ day: s.visit.day, route: s.visit.routeDone, zones: s.visit.zones, minutes: Math.round(((s.visit.lastAt || Date.now()) - s.visit.startedAt) / 60000) });
    var visits = hist.length || 1;
    var routes = hist.filter(function (h) { return h.route; }).length;
    var mins = hist.reduce(function (a, h) { return a + (h.minutes || 0); }, 0);
    var zoneCount = [0, 0, 0, 0, 0];
    hist.forEach(function (h) { (h.zones || []).forEach(function (z) { zoneCount[z - 1]++; }); });
    var maxZ = Math.max.apply(null, zoneCount.concat([1]));
    var bars = DC.ZONES.map(function (z, i) { return '<div class="hbar"><span>' + esc(z.short) + '</span><span class="track"><i style="width:' + pct(zoneCount[i], maxZ) + '%;background:' + z.color + '"></i></span><span class="num">' + zoneCount[i] + '</span></div>'; }).join('');
    var byPrize = {};
    s.codes.forEach(function (c) { var k = c.prize || 'otro'; byPrize[k] = byPrize[k] || [0, 0]; byPrize[k][0]++; if (c.redeemed) byPrize[k][1]++; });
    var prizeRows = Object.keys(byPrize).map(function (k) { var p = DC.PRIZES[k]; return '<div class="hbar"><span>' + esc(p ? p.name : k) + '</span><span class="track"><i style="width:' + pct(byPrize[k][1], byPrize[k][0]) + '%;background:' + (p ? p.color : '#999') + '"></i></span><span class="num">' + byPrize[k][1] + '/' + byPrize[k][0] + '</span></div>'; }).join('') || '<p class="muted">Aún no hay premios generados.</p>';
    var redeemed = s.codes.filter(function (c) { return c.redeemed; }).length;
    var m = modal(head('Para la administración', 'Panel Dino Park') +
      '<p class="muted" style="margin:6px 0 12px">Demo con los datos de este dispositivo. En producción se suman todas las visitas del parque.</p>' +
      '<div class="kpis">' +
      '<div class="kpi"><b class="num">' + Math.round(routes / visits * 100) + '%</b><span>Rutas completadas (North Star)</span></div>' +
      '<div class="kpi"><b class="num">' + Math.round(mins / visits) + ' min</b><span>Tiempo promedio de juego</span></div>' +
      '<div class="kpi"><b class="num">' + s.visits + '</b><span>Visitas</span></div>' +
      '<div class="kpi"><b class="num">' + s.totals.caps + '</b><span>Capturas</span></div>' +
      '<div class="kpi"><b class="num">' + Object.keys(s.uniques || {}).length + '/8</b><span>Únicos atrapados</span></div>' +
      '<div class="kpi"><b class="num">' + s.totals.fichas + '</b><span>Fichas leídas</span></div>' +
      '<div class="kpi"><b class="num">' + s.codes.length + '</b><span>Premios generados</span></div>' +
      '<div class="kpi"><b class="num">' + redeemed + '</b><span>Premios canjeados</span></div></div>' +
      '<h3 class="mt">Zonas visitadas</h3><div class="hbars">' + bars + '</div>' +
      '<h3 class="mt">Premios canjeados por tipo</h3><div class="hbars">' + prizeRows + '</div>' +
      '<h3 class="mt">Validar código en caja</h3>' +
      '<form class="row" id="validate-form"><input id="code-in" class="field" placeholder="DC-XXXX-XXXX" autocomplete="off" style="text-transform:uppercase"><button class="btn small sun" type="submit">Validar</button></form>' +
      '<p id="code-out" class="muted" style="margin-top:8px;min-height:1.4em"></p>');
    var f = m.querySelector('#validate-form');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var c = m.querySelector('#code-in').value.trim().toUpperCase(), out = m.querySelector('#code-out');
      if (!DC.Store.validCode(c)) { out.innerHTML = '<b class="red">Código no válido.</b> Revisa que esté bien escrito.'; return; }
      var mine = S().codes.find(function (x) { return x.code.replace(/-/g, '') === c.replace(/[^A-Z0-9]/g, ''); });
      if (mine && mine.redeemed) { out.innerHTML = '<b class="red">Ya fue canjeado.</b>'; return; }
      if (mine) { mine.redeemed = true; DC.Store.save(); }
      out.innerHTML = '<b class="green">Código válido.</b> ' + (mine ? esc(mine.label) + ' · marcado como canjeado.' : 'Entrega el premio indicado por el visitante.');
      renderTabs();
    });
  }

  /* =====================================================================
     Eventos
     ===================================================================== */
  function claimMission(id) {
    var r = DC.Store.claimMission(id);
    if (!r) return;
    DC.Audio.play('coin');
    toast('+' + r.coins + ' monedas · +' + r.xp + ' XP' + (r.bonus ? ' · ¡Las 3 misiones! +3 Dinoesferas y 1 Superesfera' : ''), 'coin');
    if (r.levelUps.length) levelUp(r.levelUps[r.levelUps.length - 1]);
    render();
  }
  function levelUp(lvl) {
    DC.Audio.play('levelup');
    return modal('<div class="levelup"><div class="lv-badge num">' + lvl + '</div><div class="eyebrow">¡Subiste de nivel!</div><h1>' + DC.titleFor(lvl) + '</h1>' +
      '<ul class="reward-list"><li><span>Dinoesferas</span><b class="num">+2</b></li><li><span>Superesfera</span><b class="num">+1</b></li><li><span>Dino-monedas</span><b class="num">+50</b></li></ul>' +
      '<button class="btn block sun" data-act="close">¡Genial!</button></div>', { center: true });
  }
  function confirmBox(text, okLabel, fn) {
    var m = modal('<div class="stack"><h2>' + esc(text) + '</h2><div class="row"><button class="btn ghost" data-act="close" style="flex:1">Cancelar</button><button class="btn danger" id="cf-ok" style="flex:1">' + esc(okLabel) + '</button></div></div>', { center: true });
    m.querySelector('#cf-ok').addEventListener('click', function () { m.close(); fn(); });
  }
  function checkMedals() { DC.Store.checkMedals().forEach(function (m) { toast('Nueva medalla: ' + esc(m.name), 'medal'); }); }

  function buy(id) {
    var s = S(), it = DC.SHOP.find(function (x) { return x.id === id; });
    if (!it || s.coins < it.price) return;
    if (id === 'sphere') { if (s.visit.bought >= DC.SPHERE_BUY_LIMIT) return; s.visit.bought++; s.spheres++; }
    else s.items[id] = (s.items[id] || 0) + 1;
    s.coins -= it.price;
    DC.Store.save(); DC.Audio.play('coin');
    toast('Compraste: ' + esc(it.name), 'check');
    render();
  }
  function buyPrize(id) {
    var s = S(), p = DC.PRIZES[id], pp = DC.POINT_PRIZES.find(function (x) { return x.id === id; });
    if (!p || !pp || s.points < pp.pts) return;
    var m = modal('<div class="stack center-text">' + prizeArt(id) + '<h2>¿Canjear ' + esc(p.name) + '?</h2><p class="muted">Se descontarán <b class="num">' + pp.pts + '</b> Dino-puntos y recibirás un código QR para ' + esc(p.place) + '.</p>' +
      '<div class="row"><button class="btn ghost" data-act="close" style="flex:1">Cancelar</button><button class="btn sun" id="bp-ok" style="flex:1">Canjear</button></div></div>', { center: true });
    m.querySelector('#bp-ok').addEventListener('click', function () {
      m.close();
      s.points -= pp.pts;
      var c = DC.Store.addPrize(id, 'Canje con Dino-puntos');
      DC.Store.save();
      render();
      prizeModal(c, null, '¡Premio listo!');
    });
  }
  function onClick(e) {
    var b = e.target.closest('[data-act]');
    if (!b) return;
    var act = b.dataset.act, s = S();
    DC.Audio.unlock();
    switch (act) {
      case 'tab':
        DC.Audio.play('tap');
        if (b.dataset.sub) albumSub = b.dataset.sub;
        closeModals(); go(b.dataset.tab); break;
      case 'albumsub': DC.Audio.play('tap'); albumSub = b.dataset.sub; render(); break;
      case 'close': DC.Audio.play('back'); var mb = b.closest('.modal-back'); if (mb) mb.close(); break;
      case 'zone': DC.Audio.play('tap'); zoneSheet(+b.dataset.zone); break;
      case 'explore': closeModals(); DC.Encounter.start(+b.dataset.zone); break;
      case 'scanqr': closeModals(); DC.Encounter.scanQR(+b.dataset.zone); break;
      case 'claim': claimMission(b.dataset.id); break;
      case 'ficha': DC.Audio.play('tap'); ficha(b.dataset.sp); break;
      case 'fmode':
        s.age = b.dataset.m === 'nino' ? 'nino' : (s.age === 'nino' ? 'adulto' : s.age);
        DC.Store.save();
        var mm = b.closest('.modal-back'), sp = mm && mm.dataset.sp;
        if (sp) {
          mm.querySelector('#ftext').textContent = b.dataset.m === 'nino' ? DC.SP[sp].kid : DC.SP[sp].adult;
          mm.querySelectorAll('[data-act="fmode"]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
        }
        break;
      case 'quiz':
        var spq = DC.SP[b.dataset.sp], ok = +b.dataset.i === spq.quiz.a, entry = DC.Store.albumEntry(spq.id);
        b.parentNode.querySelectorAll('button').forEach(function (x, i) { x.disabled = true; if (i === spq.quiz.a) x.classList.add('ok'); });
        if (ok) {
          entry.quiz = true; s.coins += 30; s.totals.quiz++; DC.Store.addPoints(DC.POINTS.quiz);
          var lv = DC.Store.addXp(40), md = DC.Store.bump('quiz');
          DC.Audio.play('capture'); toast('¡Correcto! +40 XP · +30 monedas', 'check');
          md.forEach(function (m) { toast('Misión completada: ' + esc(m.text), 'star'); });
          if (lv.length) setTimeout(function () { levelUp(lv[lv.length - 1]); }, 600);
          checkMedals();
        } else { b.classList.add('bad'); DC.Audio.play('fail'); toast('Casi. Lee la ficha y vuelve a intentarlo en tu próxima captura.', 'book'); }
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
      case 'buyprize': buyPrize(b.dataset.id); break;
      case 'showcode': var c = s.codes.find(function (x) { return x.code === b.dataset.code; }); prizeModal(c, null, c && c.redeemed ? 'Premio canjeado' : 'Muestra este código'); break;
      case 'copy':
        var code = b.dataset.code;
        try { navigator.clipboard.writeText(code).then(function () { toast('Código copiado', 'check'); }, function () { toast(code, 'qr'); }); } catch (er) { toast(code, 'qr'); }
        break;
      case 'settings': DC.Audio.play('tap'); settings(); break;
      case 'walk': DC.Audio.play('tap'); closeMenu(); break;
      case 'closemenu': DC.Audio.play('back'); closeMenu(); break;
      case 'walkto': DC.Audio.play('tap'); var wz = +b.dataset.zone; closeModals(); closeMenu(); DC.Walk.walkTo(wz); toast('Caminando a ' + esc(DC.ZONES[wz - 1].short) + '…', 'pin'); break;
      case 'editavatar': closeModals(); avatarEditor(); break;
      case 'dev-xmas':
        var xl = DC.XMAS.filter(function (x) { return !s.xmas[x.id]; });
        if (!xl.length) { toast('Ya tienes los 6 especiales navideños', 'star'); break; }
        var xx = xl[Math.floor(Math.random() * xl.length)];
        DC.forceXmas = xx.id; closeModals(); DC.Encounter.start(xx.zone);
        break;
      case 'dev-points': s.points += 500; s.pointsTotal += 500; DC.Store.save(); toast('+500 Dino-puntos', 'star'); render(); break;
      case 'train': DC.Vision.trainer(); break;
      case 'avatar':
        s.avatar = s.avatar || {}; s.avatar[b.dataset.k] = b.dataset.c; DC.Store.save();
        b.parentNode.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
        DC.Walk.rebuildAvatar();
        break;
      case 'setting':
        var k = b.dataset.key; s.settings[k] = !s.settings[k]; b.setAttribute('aria-checked', s.settings[k]); DC.Store.save();
        if (k === 'sound' && s.settings.sound) DC.Audio.play('tap');
        if (k === 'lite') toast('Se aplica al recargar la app', 'gear');
        break;
      case 'age':
        s.age = b.dataset.a; DC.Store.save();
        b.parentNode.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
        break;
      case 'dev-visit': s.devOffsetDays = (s.devOffsetDays || 0) + 1; closeModals(); DC.Main.visitCheck(true); break;
      case 'dev-spheres': s.spheres += 10; s.items.super = (s.items.super || 0) + 10; s.items.ultra = (s.items.ultra || 0) + 10; s.coins += 2000; DC.Store.save(); toast('+10 esferas de cada tipo · +2000 monedas', 'sphere'); render(); break;
      case 'dev-unique':
        var left = DC.UNIQUES.filter(function (u) { return !s.uniques[u.id]; });
        if (!left.length) { toast('Ya atrapaste los 8 únicos', 'star'); break; }
        var u = left[Math.floor(Math.random() * left.length)];
        DC.forceUnique = u.id;
        closeModals(); DC.Encounter.start(u.zone);
        break;
      case 'panel': closeModals(); panel(); break;
      case 'reset': confirmBox('¿Borrar todo el progreso de este dispositivo?', 'Borrar', function () { DC.Store.reset(); location.reload(); }); break;
      case 'photo': closeModals(); DC.Encounter.photo(b.dataset.sp, b.dataset.uid); break;
    }
  }
  function onInput(e) {
    if (e.target.id === 'set-name') { S().name = e.target.value.slice(0, 18); DC.Store.save(); renderTop(); }
  }

  /* ---------------- Bienvenida ---------------- */
  function onboarding(done) {
    var s = S();
    var st = { step: 0, name: s.name || '', age: s.age || 'nino', starter: 'triceratops', avatar: Object.assign(defaultAvatar(), s.avatar || {}) };
    var wrap = document.createElement('div');
    wrap.className = 'onb';
    $('#overlay').appendChild(wrap);
    var starters = ['triceratops', 'velociraptor', 'pteranodon'];
    var pv = null;
    function dots() { var h = ''; for (var i = 1; i <= 3; i++) h += '<i class="' + (i === st.step ? 'on' : '') + '"></i>'; return '<div class="steps-dots">' + h + '</div>'; }
    function draw() {
      if (pv) { pv.dispose(); pv = null; }
      var h = '';
      if (st.step === 0) {
        h = '<div class="onb-hero"><div class="snowfall" aria-hidden="true">' + '<i></i>'.repeat(18) + '</div>' +
          '<div class="onb-orb" aria-hidden="true"><i class="ball-ico dino huge"></i><span class="santa-hat"></span></div>' +
          '<div class="eyebrow light">Dino Park · Arequipa · Navidad Jurásica</div><div class="logo-word">Dino<em>Caza</em><span>AR</span></div>' +
          '<p>Crea tu explorador, camina por el parque y atrapa dinosaurios. Junta Dino-puntos y gana <b>helados, canchita, juegos y peluches</b> de verdad.</p></div>' +
          '<div class="onb-foot"><button class="btn block sun big" data-o="next">Crear mi explorador</button></div>';
      } else if (st.step === 1) {
        h = '<div class="onb-body">' + dots() + '<h1>¿Cómo te llamas?</h1>' +
          '<input id="onb-name" class="field" maxlength="18" placeholder="Tu nombre de explorador" value="' + esc(st.name) + '" autocomplete="nickname">' +
          '<div class="eyebrow">¿Quién va a jugar?</div><div class="choice-grid">' +
          [['nino', 'Niño o niña', 'Fichas fáciles'], ['joven', 'Joven', '13 a 17 años'], ['adulto', 'Adulto', 'Datos científicos']].map(function (a) {
            return '<button class="choice" data-o="age" data-v="' + a[0] + '" aria-pressed="' + (st.age === a[0]) + '"><b>' + a[1] + '</b><small>' + a[2] + '</small></button>';
          }).join('') + '</div></div><div class="onb-foot"><button class="btn block sun big" data-o="next">Continuar</button></div>';
      } else if (st.step === 2) {
        h = '<div class="onb-body">' + dots() + '<h1>Personaliza tu avatar</h1><p class="muted">Así te verás caminando por el parque.</p>' + avatarForm(st.avatar) + '</div>' +
          '<div class="onb-foot"><button class="btn block sun big" data-o="next">Listo</button></div>';
      } else {
        h = '<div class="onb-body">' + dots() + '<h1>Elige tu compañero</h1><p class="muted">Te acompaña en las peleas. Cada tipo le gana a otro.</p><div class="starter-grid">' +
          starters.map(function (id) {
            var sp = DC.SP[id];
            return '<button class="starter" data-o="starter" data-v="' + id + '" aria-pressed="' + (st.starter === id) + '" style="--tc:' + DC.TYPES[sp.type].color + '">' + img(id, '', sp.name) +
              '<b>' + esc(sp.name) + '</b>' + typeChip(sp.type) + '<small>Fuerte contra ' + DC.TYPES[DC.TYPE_BEATS[sp.type]].name + '</small></button>';
          }).join('') + '</div></div><div class="onb-foot"><button class="btn block sun big" data-o="finish">¡Entrar al parque!</button></div>';
      }
      wrap.innerHTML = h;
      fillPortraits(wrap);
      var ni = wrap.querySelector('#onb-name');
      if (ni) ni.addEventListener('input', function () { st.name = ni.value; });
      if (st.step === 2) pv = bindAvatarForm(wrap, st.avatar);
    }
    wrap.addEventListener('click', function (e) {
      var b = e.target.closest('[data-o]'); if (!b) return;
      DC.Audio.unlock(); DC.Audio.play('tap');
      var o = b.dataset.o;
      if (o === 'next') {
        if (st.step === 1 && !st.name.trim()) { var ni = wrap.querySelector('#onb-name'); ni.focus(); ni.classList.add('err'); return; }
        st.step++; draw();
      } else if (o === 'age' || o === 'starter') {
        st[o] = b.dataset.v;
        b.parentNode.querySelectorAll('[data-o]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
      } else if (o === 'finish') {
        s.name = st.name.trim().slice(0, 18); s.age = st.age; s.difficulty = 'normal'; s.onboarded = true; s.avatar = st.avatar;
        var inst = DC.Store.makeInst(st.starter, 3, 'normal');
        DC.Store.addToTeam(inst);
        var a = DC.Store.albumEntry(st.starter); a.seen++; a.caught++; a.first = Date.now();
        DC.Store.saveNow();
        if (pv) pv.dispose();
        wrap.remove();
        done && done();
      }
    });
    draw();
  }

  DC.UI = {
    init: function () { var app = document.getElementById('app'); app.addEventListener('click', onClick); app.addEventListener('input', onInput); },
    render: render, renderTop: renderTop, go: go, toast: toast, modal: modal, closeModals: closeModals,
    ficha: ficha, levelUp: levelUp, onboarding: onboarding, checkMedals: checkMedals, icon: icon, esc: esc,
    typeChip: typeChip, stars: stars, img: img, fillPortraits: fillPortraits, zoneSheet: zoneSheet, hpClass: hpClass, pct: pct,
    prizeModal: prizeModal, prizeArt: prizeArt, openMenu: openMenu, closeMenu: closeMenu, avatarEditor: avatarEditor,
    tab: function () { return tab; }
  };
})();
