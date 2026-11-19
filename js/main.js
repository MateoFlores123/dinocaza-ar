/* =====================================================================
   DinoCaza AR · main.js
   Arranque: carga el progreso, registra la visita del día, abre la
   zona si se llegó por un QR (#zona-N) y activa el modo sin internet.
   ===================================================================== */
(function () {
  var $ = function (s) { return document.querySelector(s); };

  function visitCheck(simulated) {
    var ev = DC.Store.checkVisit();
    DC.UI.render();
    if (!ev.newVisit) return;
    var s = DC.Store.get();
    var hatched = ev.hatched.map(function (d) {
      return '<div class="row" style="gap:10px">' + DC.UI.img(d.sp, d.golden ? 'golden-img' : '', DC.SP[d.sp].name).replace('<img', '<img style="width:56px;height:56px;border-radius:12px;background:rgba(0,0,0,.25)"') +
        '<div><b>¡Eclosionó un ' + DC.UI.esc(DC.SP[d.sp].name) + (d.golden ? ' dorado' : '') + '!</b><div class="muted" style="font-size:.8rem">Nv. ' + d.lvl + ' · ya está en tu equipo</div></div></div>';
    }).join('');
    var pass = ev.passport.map(function (p) {
      return '<div class="card" style="background:rgba(242,165,49,.1);border-color:rgba(242,165,49,.35)"><div class="eyebrow" style="color:var(--amber)">Sello ' + p.visit + ' · ' + DC.UI.esc(p.title) + '</div><b>' + DC.UI.esc(p.reward) + '</b></div>';
    }).join('');
    var bonus = Math.min(5, s.visits - 1);
    DC.Audio.play(ev.hatched.length ? 'egg' : 'coin');
    DC.UI.modal('<div class="stack"><div style="text-align:center"><div class="eyebrow">' + (simulated ? 'Modo presentación · día simulado' : 'Pasaporte Jurásico') + '</div>' +
      '<h1>' + (ev.visitNo === 1 ? '¡Bienvenido a Dino Park!' : '¡Volviste! Visita n.º ' + ev.visitNo) + '</h1></div>' +
      '<div class="reward-list"><div><span>Dinoesferas de hoy</span><span class="num" style="color:var(--amber)">+' + (DC.SPHERES_PER_VISIT + bonus) + '</span></div>' +
      (ev.visitNo > 1 ? '<div><span>Tu equipo se recuperó</span><span style="color:var(--leaf)">100 %</span></div><div><span>Misiones nuevas</span><span class="num">3</span></div>' : '') + '</div>' +
      hatched + pass +
      '<button class="btn block" data-act="close" autofocus>' + (ev.visitNo === 1 ? 'Ver el mapa' : '¡A explorar!') + '</button></div>', { center: true, onClose: function () { DC.UI.checkMedals(); } });
  }

  function zoneFromHash() {
    var m = (location.hash || '').match(/zona-(\d)/i);
    if (!m) return;
    var z = +m[1];
    if (z < 1 || z > 5) return;
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    setTimeout(function () { DC.UI.toast('Llegaste a ' + DC.ZONES[z - 1].name, 'qr'); DC.UI.zoneSheet(z); }, 600);
  }

  function boot() {
    if (!window.THREE) {
      document.getElementById('app').innerHTML = '<div style="padding:24px"><h2>No se pudo cargar el motor 3D</h2><p>Revisa tu conexión y vuelve a abrir la app.</p></div>';
      return;
    }
    var s = DC.Store.load();
    DC.Models.setLite(s.settings.lite);
    DC.UI.init();
    try { DC.AR.init($('#stage')); } catch (e) { console.error(e); }
    DC.Encounter.init();
    DC.Store.tickHeal();
    setInterval(function () { DC.Store.tickHeal(); DC.Store.save(); }, 60000);
    function enter() {
      $('#screens').hidden = false;
      visitCheck(false);
      zoneFromHash();
    }
    if (!s.onboarded) DC.UI.onboarding(enter);
    else enter();
    window.addEventListener('hashchange', zoneFromHash);
    document.addEventListener('visibilitychange', function () { if (document.hidden) DC.Store.saveNow(); });
    window.addEventListener('pagehide', function () { DC.Store.saveNow(); });
    /* Modo sin internet (PWA) */
    if ('serviceWorker' in navigator && /^https:|^http:\/\/localhost|^http:\/\/127\./.test(location.href) && !/claude|anthropic/.test(location.hostname)) {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
  }

  DC.Main = { visitCheck: visitCheck };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
