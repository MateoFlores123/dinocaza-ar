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
      var lk = DC.look(d.variant);
      return '<li class="hatch">' + DC.UI.img(d.sp, '', DC.SP[d.sp].name, d.variant) + '<span><b>¡Eclosionó un ' + DC.UI.esc(DC.SP[d.sp].name) + (lk ? ' ' + DC.UI.esc(lk.name.toLowerCase()) : '') + '!</b><small>Nv. ' + d.lvl + ' · ya está en tu equipo</small></span></li>';
    }).join('');
    var pass = ev.passport.map(function (p) {
      return '<li class="stampwin">' + (p.prize ? DC.UI.prizeArt(p.prize) : '<span class="st-ic">' + DC.UI.icon('passport') + '</span>') + '<span><b>Sello ' + p.visit + ' · ' + DC.UI.esc(p.title) + '</b><small>' + DC.UI.esc(p.reward) + '</small></span></li>';
    }).join('');
    var bonus = Math.min(5, s.visits - 1);
    DC.Audio.play(ev.hatched.length ? 'egg' : 'coin');
    DC.UI.modal('<div class="welcome"><div class="eyebrow">' + (simulated ? 'Modo presentación · día simulado' : 'Pasaporte Jurásico') + '</div>' +
      '<h1>' + (ev.visitNo === 1 ? '¡Bienvenido, ' + DC.UI.esc(s.name || 'explorador') + '!' : '¡Volviste! Visita n.º ' + ev.visitNo) + '</h1>' +
      (DC.SEASON.xmas ? '<p class="muted">Navidad Jurásica: hoy puede aparecer <b>1 especial navideño</b> en los hábitats.</p>' : '') +
      '<ul class="reward-list"><li><span><i class="ball-ico dino"></i> Dinoesferas de hoy</span><b class="num">+' + (DC.SPHERES_PER_VISIT + bonus) + '</b></li>' +
      '<li><span>Dino-puntos que puedes ganar hoy</span><b class="num">' + DC.POINTS.daily + '</b></li>' +
      (ev.visitNo > 1 ? '<li><span>Tu equipo se recuperó</span><b>100 %</b></li><li><span>Misiones nuevas</span><b class="num">3</b></li>' : '') + '</ul>' +
      (hatched || pass ? '<ul class="win-list">' + hatched + pass + '</ul>' : '') +
      '<button class="btn block sun big" data-act="close">¡A caminar!</button></div>', { center: true, onClose: function () { DC.UI.checkMedals(); } });
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
      DC.Walk.openWalk();
      visitCheck(false);
      zoneFromHash();
    }
    /* Modelos 3D externos: se cargan en segundo plano; al llegar, se refrescan los retratos */
    var refreshT = null;
    DC.onModelLoaded = function (id) {
      document.querySelectorAll('img[data-sp="' + id + '"]').forEach(function (im) { im.removeAttribute('src'); });
      clearTimeout(refreshT);
      refreshT = setTimeout(function () { DC.UI.fillPortraits(document); if (DC.Map3D) DC.Map3D.modelsChanged(); }, 150);
    };
    setTimeout(function () { DC.GLB.preloadAll(); }, 400);
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
