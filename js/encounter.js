/* =====================================================================
   DinoCaza AR · encounter.js
   Encuentro en AR: búsqueda → aparición → pelea en tiempo real
   (atacar con timing, esquivar el aviso rojo, ataque especial) →
   captura con la Dinoesfera (lanzar tocando o deslizando) → premios.
   También: validar zona con QR y modo foto AR.
   ===================================================================== */
(function () {
  var T = THREE;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var S = function () { return DC.Store.get(); };
  var U = function () { return DC.UI; };
  var st = null;

  /* ---------------- Escenario ---------------- */
  function showStage() {
    $('#screens').hidden = true;
    $('#stage').hidden = false;
    DC.AR.active = true;
    DC.AR.resize();
    DC.Audio.startAmbient();
  }
  function hideStage() {
    DC.AR.active = false;
    DC.AR.clearActors();
    DC.FX.clear();
    DC.AR.stopCamera();
    DC.AR.disableGyro();
    DC.Audio.stopAmbient();
    $('#hud').innerHTML = '';
    $('#stage').hidden = true;
    $('#screens').hidden = false;
  }
  function prepareView() {
    var s = S();
    DC.AR.look.yaw = 0; DC.AR.look.pitch = -0.12; DC.AR.look.ty = null;
    var cam = s.settings.camera ? DC.AR.startCamera() : Promise.resolve(false);
    return cam.then(function (ok) {
      if (s.settings.camera && !ok) { s.settings.camera = false; DC.Store.save(); U().toast('No se pudo usar la cámara aquí: juegas en el parque 3D. Puedes reactivarla en Ajustes.', 'cube'); }
      return DC.AR.enableGyro();
    }).then(function (g) { DC.AR.recenter(); return g; });
  }

  /* ---------------- HUD ---------------- */
  function icon(id) { return U().icon(id); }
  function hudBase() {
    $('#hud').innerHTML =
      '<div class="hud-top"><button class="icon-btn" data-h="leave" aria-label="Salir">' + icon('back') + '</button>' +
      '<div class="eplate" id="eplate" hidden></div>' +
      '<div class="hud-side"><button class="icon-btn" data-h="mode" aria-label="Cambiar entre cámara AR y parque 3D" id="modebtn">' + icon(DC.AR.mode === 'ar' ? 'cube' : 'camera') + '</button>' +
      '<button class="icon-btn" data-h="center" aria-label="Centrar vista">' + icon('target') + '</button></div></div>' +
      '<div class="passthru" id="fxl" style="position:absolute;inset:0"></div>' +
      '<div class="guide-arrow" id="guide" hidden>' + icon('arrow') + '</div>' +
      '<div class="hint" id="hint" hidden></div>' +
      '<div class="hud-bottom" id="hb"></div>';
  }
  function hint(t) { var h = $('#hint'); if (!h) return; h.hidden = !t; if (t) h.textContent = t; }
  function banner(html, ms) {
    var fx = $('#fxl'); if (!fx) return;
    var b = document.createElement('div'); b.className = 'banner'; b.innerHTML = html;
    fx.appendChild(b);
    setTimeout(function () { b.style.transition = 'opacity .35s'; b.style.opacity = '0'; }, ms || 1300);
    setTimeout(function () { b.remove(); }, (ms || 1300) + 400);
  }
  function floatText(pos3, html, cls) {
    var p = DC.AR.project(pos3), fx = $('#fxl'); if (!fx || !p.on) return;
    var d = document.createElement('div'); d.className = 'dmg ' + (cls || ''); d.innerHTML = html;
    d.style.left = p.x + 'px'; d.style.top = p.y + 'px';
    fx.appendChild(d); setTimeout(function () { d.remove(); }, 1000);
  }
  function flashWhite() { var f = document.createElement('div'); f.className = 'flashwhite'; $('#fxl').appendChild(f); setTimeout(function () { f.remove(); }, 520); }
  function enemyName(e) { return e.unique ? e.unique.name : e.sp.name; }
  function variantChip(lk) {
    if (!lk) return '';
    return '<span class="vchip' + (lk.unique ? ' unique' : '') + '" style="--vc:' + lk.chip + '">' + (lk.unique ? '★ Único' : U().esc(lk.name)) + '</span>';
  }
  function enemyPlate() {
    var e = st.enemy, el = $('#eplate'); if (!el || !e) return;
    var hp = U().pct(e.hp, e.max);
    el.hidden = false;
    el.innerHTML = '<div class="ep-face">' + U().img(e.sp.id, '', '', e.variant) + '</div>' +
      '<div class="ep-body"><div class="ep-name"><span class="t">' + U().esc(enemyName(e)) + '</span>' + variantChip(e.look) + '</div>' +
      '<div class="ep-meta">' + U().typeChip(e.sp.type) + '<span class="num">Nv. ' + e.lvl + '</span>' + U().stars(e.sp.rarity) + '</div>' +
      '<div class="hpbar ' + U().hpClass(hp) + '"><i style="width:' + hp + '%"></i><span class="num">' + Math.max(0, Math.ceil(e.hp)) + ' / ' + e.max + '</span></div></div>';
    U().fillPortraits(el);
  }
  function meBar() {
    var m = st.me; if (!m) return '';
    var hp = U().pct(m.inst.hp, m.max);
    return '<div class="mecard"><div class="ep-face">' + U().img(m.sp.id, '', '', m.inst.variant) + '</div><div class="ep-body">' +
      '<div class="ep-name"><span class="t">' + U().esc(m.sp.name) + '</span><span class="num lv">Nv. ' + m.inst.lvl + '</span>' + U().typeChip(m.sp.type) + '</div>' +
      '<div class="hpbar ' + U().hpClass(hp) + '" id="mehp"><i style="width:' + hp + '%"></i><span class="num" id="mehpt">' + Math.max(0, m.inst.hp) + ' / ' + m.max + '</span></div></div></div>';
  }
  function updateMe() {
    var m = st && st.me; if (!m) return;
    var hp = U().pct(m.inst.hp, m.max), b = $('#mehp'), t = $('#mehpt');
    if (b) { b.className = 'hpbar ' + U().hpClass(hp); b.firstChild.style.width = hp + '%'; }
    if (t) t.textContent = Math.max(0, m.inst.hp) + ' / ' + m.max;
    var sp = $('#btn-special');
    if (sp) { var ready = m.energy >= 100; sp.disabled = !ready; sp.classList.toggle('ready', ready); sp.style.setProperty('--e', m.energy); }
  }

  /* ---------------- Inicio del encuentro ---------------- */
  function start(zoneId) {
    if (st) cleanup();
    var s = S();
    st = { zone: zoneId, phase: 'scan', enemy: null, me: null, unsub: [], toasts: [], levelUps: [], rewards: [], appeared: false, outcome: null };
    showStage();
    hudBase();
    $('#hb').innerHTML = '<div class="hud-pills"><button class="pillbtn" data-h="leave">' + icon('back') + 'Volver al mapa</button></div>';
    var sc = document.createElement('div'); sc.className = 'scan'; sc.id = 'scan'; $('#fxl').appendChild(sc);
    hint('Buscando huellas en ' + DC.ZONES[zoneId - 1].short + '…');
    st.unsub.push(DC.AR.onFrame(frame));
    var myst = st;
    prepareView().then(function () {
      if (st !== myst) return;
      hint(DC.AR.gyro.on ? 'Mueve tu celular despacio alrededor' : 'Desliza la pantalla para mirar alrededor');
      setTimeout(function () { if (st === myst) spawn(); }, 1300 + Math.random() * 1300);
    });
  }

  function spawn() {
    var myst = st;
    var roll = DC.Store.rollEncounter(st.zone);
    DC.GLB.ready(roll.sp.id, 3000).then(function () { if (st === myst) spawnRoll(roll); });
  }
  function spawnRoll(roll) {
    var s = S();
    var sp = roll.sp;
    var actor = new DC.Models.Actor(sp, { variant: roll.variant });
    var spread = DC.AR.gyro.on ? 1.05 : 0.6;
    var th = (Math.random() * 2 - 1) * spread;
    var d = sp.id === 'brachiosaurus' ? 7.2 : sp.model.kind === 'ptero' ? 4.4 : 4.9;
    var x = Math.sin(th) * d, z = -Math.cos(th) * d;
    actor.root.position.set(x, 0, z);
    actor.faceTo(0, 0);
    actor.root.rotation.y += (th > 0 ? 1 : -1) * 0.55; /* de tres cuartos: se ve mejor la silueta */
    DC.AR.add(actor);
    var stats = DC.Store.stats({ sp: sp.id, lvl: roll.lvl, variant: roll.variant });
    var lk = DC.look(roll.variant);
    st.enemy = { actor: actor, sp: sp, lvl: roll.lvl, variant: roll.variant, look: lk, unique: roll.unique, golden: roll.variant === 'oro', st: stats, hp: stats.maxHp, max: stats.maxHp, pos: new T.Vector3(x, 0, z), exhausted: false };
    st.phase = 'appear';
    var e = DC.Store.albumEntry(sp.id); e.seen++;
    s.totals.encounters++; DC.Store.bump('encounters');
    $('#scan') && $('#scan').remove();
    /* efectos de aparición según la zona */
    var p = st.enemy.pos;
    if (sp.model.kind === 'ptero') DC.FX.burst(new T.Vector3(p.x, 2, p.z), { color: '#ffffff', count: 30, speed: 2.5, size: 0.18, gravity: -1 });
    else if (sp.zone === 3) { DC.FX.ring(p, { color: '#7fe3ff', to: 4 }); DC.FX.burst(new T.Vector3(p.x, 0.2, p.z), { color: '#9feaff', count: 40, speed: 3, up: true, size: 0.16 }); DC.Audio.play('splash'); }
    else { DC.FX.crack(p, 2.8 + actor.radius); DC.FX.burst(new T.Vector3(p.x, 0.15, p.z), { color: '#c9a77a', count: 36, speed: 2.4, up: true, size: 0.3, additive: false, gravity: -3 }); }
    if (sp.zone === 2) DC.FX.leaves(p);
    if (lk) {
      DC.FX.burst(new T.Vector3(p.x, 1, p.z), { tex: 'star', color: lk.aura, count: lk.unique ? 60 : 30, speed: 3, size: 0.22 });
      if (lk.unique) { DC.FX.ring(p, { color: lk.aura, to: 7, life: 1.2 }); DC.Audio.play('levelup'); }
    }
    actor.play('spawn').then(function () { return actor.play('roar', { onPeak: function () { roarFx(actor); } }); });
    DC.Audio.vibe([30, 40, 60]);
    st.appearAt = performance.now();
  }
  function roarFx(actor) {
    var big = actor.sp.id === 'trex' || actor.sp.id === 'spinosaurus' || actor.sp.id === 'brachiosaurus';
    if (actor.sp.model.kind === 'ptero') DC.Audio.play('screech'); else DC.Audio.play('roar', big ? 1.4 : actor.sp.model.kind === 'theropod' ? 1 : 0.8);
    DC.AR.shake(big ? 0.09 : 0.04);
    DC.FX.ring(actor.root.position, { color: '#ffffff', to: big ? 6 : 4, life: 0.8 });
  }

  function onAppear() {
    st.phase = 'menu';
    st.appeared = true;
    var e = st.enemy;
    hint('');
    if (e.unique) banner('<span style="color:' + e.look.aura + '">¡Dinosaurio único!</span><br>' + U().esc(e.unique.name) + '<small>Atrápalo y gana un helado gratis</small>', 2600);
    else banner((e.look ? '<span style="color:' + e.look.aura + '">¡Variante ' + U().esc(e.look.name) + '!</span><br>' : '') + '¡' + U().esc(e.sp.name) + ' salvaje!<small>' + DC.RARITY[e.sp.rarity].name + ' · Nv. ' + e.lvl + '</small>', 1800);
    enemyPlate();
    menu();
  }
  function ballsLeft() { var s = S(); return (s.spheres || 0) + (s.items.super || 0) + (s.items.ultra || 0); }
  function menu() {
    st.phase = 'menu';
    var healthy = DC.Store.healthyTeam().length > 0;
    var nb = ballsLeft();
    $('#hb').innerHTML =
      '<div class="menu-acts">' +
      '<button class="bigbtn glass" data-h="leave">' + icon('run') + '<span>Huir</span></button>' +
      '<button class="bigbtn green" data-h="fight"' + (healthy ? '' : ' disabled') + '>' + icon('claw') + '<span>Pelear</span></button>' +
      '<button class="bigbtn sun" data-h="tocapture"' + (nb > 0 ? '' : ' disabled') + '>' + icon('sphere') + '<span>Capturar</span></button></div>' +
      '<p class="hud-note">' + (healthy ? 'Pelear lo cansa y sube la probabilidad de captura · ' + nb + ' esferas' : 'Tu equipo necesita descansar: cúralo en Equipo o vuelve en tu próxima visita.') + '</p>';
  }

  /* =====================================================================
     PELEA
     ===================================================================== */
  function startFight(inst) {
    var s = S();
    inst = inst || DC.Store.partner();
    if (!inst || inst.hp <= 0) inst = DC.Store.healthyTeam()[0];
    if (!inst) return;
    if (st.me && st.me.actor) DC.AR.remove(st.me.actor);
    var sp = DC.SP[inst.sp];
    var a = new DC.Models.Actor(sp, { variant: inst.variant });
    var e = st.enemy;
    var th = Math.atan2(e.pos.x, -e.pos.z);
    var side = th > 0.1 ? -1 : 1;
    var pth = th + side * 0.22, pd = 3.1;
    var px = Math.sin(pth) * pd, pz = -Math.cos(pth) * pd;
    a.root.position.set(px, 0, pz);
    a.root.scale.setScalar(sp.id === 'brachiosaurus' ? 0.4 : 0.58);
    a.faceTo(e.pos.x, e.pos.z);
    DC.AR.add(a);
    var stt = DC.Store.stats(inst);
    st.me = { actor: a, inst: inst, sp: sp, st: stt, max: stt.maxHp, energy: st.me ? st.me.energy : 0, pos: new T.Vector3(px, 0, pz), cd: 0.6, counter: 1 };
    e.actor.faceTo(px, pz);
    e.actor.root.rotation.y += side * 0.35;
    st.phase = 'battle';
    st.tele = null;
    st.enemyTimer = 1.6 + Math.random();
    st.ring = 0;
    st.dodgeCd = 0;
    DC.FX.burst(new T.Vector3(px, 0.6, pz), { color: '#ffb84a', count: 30, speed: 2.4, size: 0.18 });
    DC.FX.ring(st.me.pos, { color: '#ffb84a', to: 2.5 });
    DC.Audio.play('pop');
    a.play('grow').then(function () { return a.play('roar', { onPeak: function () { roarFx(a); } }); });
    if (!DC.AR.gyro.on) {
      var mid = new T.Vector3().addVectors(e.pos, st.me.pos).multiplyScalar(0.5);
      DC.AR.lookTowards(mid, -0.2);
    }
    hint('');
    $('#hb').innerHTML = meBar() +
      '<div class="battle-acts"><button class="rb dodge" data-h="dodge" id="btn-dodge">' + icon('dodge') + '<span>Esquivar</span></button>' +
      '<button class="rb attack" data-h="attack" id="btn-attack">' + icon('claw') + '<span>' + U().esc(sp.moves.basic) + '</span></button>' +
      '<button class="rb special" data-h="special" id="btn-special" disabled style="--e:0">' + icon('flame') + '<span>Especial</span></button></div>' +
      '<div class="hud-pills"><button class="pillbtn" data-h="leave">' + icon('run') + 'Huir</button><button class="pillbtn" data-h="tocapture"' + (ballsLeft() > 0 ? '' : ' disabled') + '>' + icon('sphere') + 'Capturar (' + ballsLeft() + ')</button></div>';
    var fx = $('#fxl');
    var rt = document.createElement('div'); rt.className = 'ring-target'; rt.id = 'ringT'; fx.appendChild(rt);
    var rm = document.createElement('div'); rm.className = 'ring-move'; rm.id = 'ringM'; fx.appendChild(rm);
    if (!S().totals.wins && !st.tutorShown) {
      st.tutorShown = true;
      setTimeout(function () { banner('Toca el ataque cuando<br>el anillo coincida<small>Si aparece el aviso rojo, ¡esquiva!</small>', 2600); }, 1400);
    }
    updateMe();
  }

  function damage(att, def, at, dt, q) {
    var base = (att.atk * 0.55 + 6) * (att.atk / (att.atk + def.def * 0.8));
    return Math.max(1, Math.round(base * DC.typeMult(at, dt) * q * (0.9 + Math.random() * 0.2)));
  }
  function ringScale() { var period = 1.15 / DC.DIFF.ringSpeed; var f = (st.ring % period) / period; return 2.0 - 1.5 * f; }

  function playerAttack() {
    var m = st.me, e = st.enemy;
    if (!m || st.phase !== 'battle' || m.cd > 0 || m.busy) return;
    var sc = ringScale(), q = Math.abs(sc - 1);
    var qual = q < 0.13 ? 'crit' : q < 0.33 ? 'good' : 'weak';
    var mult = qual === 'crit' ? 1.6 : qual === 'good' ? 1 : 0.55;
    mult *= m.counter; m.counter = 1;
    var spd = m.st.spd;
    m.cd = 0.8 * (1 - Math.min(0.35, (spd - 20) / 120));
    m.busy = true;
    var dist = m.pos.distanceTo(e.pos);
    DC.Audio.play('whoosh');
    m.actor.play('attack', { reach: dist * 0.42 / m.actor.root.scale.x, onImpact: function () {
      if (!st || st.phase !== 'battle') return;
      var dmg = damage(m.st, e.st, m.sp.type, e.sp.type, mult);
      hitEnemy(dmg, qual);
      m.energy = Math.min(100, m.energy + (qual === 'crit' ? 30 : qual === 'good' ? 20 : 10));
      if (qual === 'crit') { DC.Store.bump('crits'); S().totals.crits++; }
      updateMe();
    } }).then(function () { if (st && st.me === m) m.busy = false; });
  }
  function hitEnemy(dmg, qual, special) {
    var e = st.enemy;
    e.hp -= dmg;
    var tm = DC.typeMult(st.me.sp.type, e.sp.type);
    var chest = e.actor.chestWorld();
    e.actor.hit(qual === 'crit' || special ? '#ffd040' : '#ff3020');
    DC.FX.burst(chest, { color: qual === 'crit' ? '#ffd45a' : '#ffffff', count: qual === 'crit' ? 30 : 16, speed: 3, size: 0.14, tex: qual === 'crit' ? 'star' : 'soft' });
    DC.Audio.play('hit', qual === 'crit' || special);
    DC.Audio.vibe(qual === 'crit' ? 40 : 20);
    DC.AR.shake(special ? 0.08 : qual === 'crit' ? 0.04 : 0.015);
    var label = special ? '¡ESPECIAL!' : qual === 'crit' ? '¡CRÍTICO!' : qual === 'weak' ? 'roce' : '';
    if (tm > 1) label += (label ? '<br>' : '') + 'súper eficaz';
    else if (tm < 1) label += (label ? '<br>' : '') + 'poco eficaz';
    floatText(chest.clone().add(new T.Vector3(0, 0.3, 0)), dmg + (label ? '<small>' + label + '</small>' : ''), qual === 'crit' || special ? 'crit' : '');
    var interrupt = st.tele && (special || qual === 'crit');
    if (interrupt) {
      st.tele = null; removeWarn();
      st.enemyTimer = 1.4 + Math.random();
      banner('¡Interrumpido!', 900);
    }
    if (!st.tele) e.actor.play('hit');
    enemyPlate();
    if (e.hp <= 0) win();
  }
  function playerSpecial() {
    var m = st.me, e = st.enemy;
    if (!m || st.phase !== 'battle' || m.energy < 100 || m.busy) return;
    m.energy = 0; m.busy = true; updateMe();
    DC.Store.bump('specials'); S().totals.specials++;
    banner(U().esc(m.sp.moves.special), 1100);
    DC.Audio.play('special');
    var dist = m.pos.distanceTo(e.pos);
    var fx = m.sp.moves.fx;
    if (fx === 'roar') setTimeout(function () { roarFx(m.actor); }, 200);
    m.actor.play('special', { reach: dist * 0.5 / m.actor.root.scale.x, onImpact: function () {
      if (!st || st.phase !== 'battle') return;
      var p = e.pos, chest = e.actor.chestWorld();
      if (fx === 'quake') { DC.FX.crack(p, 4); DC.FX.ring(p, { color: '#d9b27a', to: 6 }); DC.Audio.play('quake'); DC.AR.shake(0.14); }
      else if (fx === 'wave') { DC.FX.wave(m.pos, p); DC.Audio.play('splash'); }
      else if (fx === 'dive') { DC.FX.burst(chest, { color: '#cfe8ff', count: 40, speed: 4, size: 0.15 }); }
      else if (fx === 'spikes') { DC.FX.burst(chest, { color: '#f3e6c4', count: 34, speed: 4.5, size: 0.12, additive: false }); }
      else if (fx === 'charge') { DC.FX.burst(new T.Vector3(p.x, 0.2, p.z), { color: '#c9a77a', count: 40, speed: 3, up: true, size: 0.3, additive: false }); DC.FX.ring(p, { color: '#ffffff', to: 4 }); }
      else if (fx === 'slash') { for (var i = 0; i < 3; i++) setTimeout(function () { DC.FX.burst(chest, { tex: 'star', color: '#ffffff', count: 12, speed: 3.5, size: 0.14 }); DC.Audio.play('hit'); }, i * 110); }
      else { DC.FX.ring(p, { color: '#ffd45a', to: 5 }); }
      var dmg = damage(m.st, e.st, m.sp.type, e.sp.type, 2.4);
      hitEnemy(dmg, 'crit', true);
    } }).then(function () { if (st && st.me === m) m.busy = false; });
  }
  function playerDodge() {
    var m = st.me;
    if (!m || st.phase !== 'battle' || st.dodgeCd > 0) return;
    st.dodgeCd = 0.55;
    var dir = Math.random() < 0.5 ? -1 : 1;
    m.actor.play('dodge', { dir: dir }).then(function () {});
    DC.Audio.play('dodge');
    if (st.tele && st.tele.dodgeAt === null) st.tele.dodgeAt = st.tele.t;
  }

  /* IA del enemigo: aviso (telegrafiado) → golpe */
  function enemyUpdate(dt) {
    var e = st.enemy, m = st.me, d = DC.DIFF;
    if (!m) return;
    if (st.tele) {
      st.tele.t += dt;
      if (st.tele.t >= st.tele.dur) {
        var tele = st.tele; st.tele = null; removeWarn();
        if (tele.feint) {
          e.actor.play('roar', { dur: 0.9 });
          banner('¡Fue un amague!', 800);
          st.enemyTimer = 0.9 + Math.random() * 0.6;
          return;
        }
        var dist = m.pos.distanceTo(e.pos);
        DC.Audio.play('whoosh');
        e.actor.play('strike', { reach: dist * 0.45, onImpact: function () { if (st && st.phase === 'battle') enemyImpact(tele); } });
        var combo = Math.random() < d.combo;
        st.enemyTimer = combo ? 0.7 : rand(d.atkEvery[0], d.atkEvery[1]) * (1 - Math.min(0.3, (e.st.spd - 20) / 120));
        st.comboNext = combo;
      }
      return;
    }
    st.enemyTimer -= dt;
    if (st.enemyTimer <= 0 && !e.actor.action) {
      var wind = d.windup * (st.comboNext ? 0.75 : 1) * rand(0.9, 1.12);
      st.comboNext = false;
      st.tele = { t: 0, dur: wind, dodgeAt: null, feint: Math.random() < d.feint };
      e.actor.play('windup', { dur: wind + 0.05 });
      DC.Audio.play('warn');
      showWarn();
      var db = $('#btn-dodge'); if (db) db.classList.add('alert');
    }
  }
  function enemyImpact(tele) {
    var m = st.me, e = st.enemy, d = DC.DIFF;
    var dmg = damage(e.st, m.st, e.sp.type, m.sp.type, 1) * d.enemyDmg * 1.5;
    var chest = m.actor.chestWorld();
    if (tele.dodgeAt !== null) {
      var before = tele.dur - tele.dodgeAt;
      if (before <= d.dodgeWin) {
        floatText(chest, '¡Esquiva perfecta!', 'heal');
        m.energy = Math.min(100, m.energy + 25); m.counter = 1.3;
        DC.Store.bump('perfect'); S().totals.perfect++;
        DC.Audio.play('pop');
        updateMe();
        return;
      }
      dmg *= 0.5;
      floatText(chest.clone().add(new T.Vector3(0, 0.4, 0)), '<small>muy pronto</small>', 'me');
    }
    dmg = Math.max(1, Math.round(dmg));
    m.inst.hp = Math.max(0, m.inst.hp - dmg);
    m.actor.hit('#ff3020');
    m.actor.play('hit');
    DC.FX.burst(chest, { color: '#ff9a7a', count: 16, speed: 2.6, size: 0.13 });
    floatText(chest, '-' + dmg, 'me');
    DC.Audio.play('hit', true);
    DC.Audio.vibe(70);
    DC.AR.shake(0.06);
    var red = document.createElement('div'); red.className = 'flashwhite'; red.style.background = '#e8613c'; $('#fxl').appendChild(red); setTimeout(function () { red.remove(); }, 500);
    updateMe();
    DC.Store.save();
    if (m.inst.hp <= 0) lose();
  }
  function showWarn() {
    removeWarn();
    var w = document.createElement('div'); w.className = 'warn-mark'; w.id = 'warn'; w.textContent = '!';
    $('#fxl').appendChild(w);
  }
  function removeWarn() { var w = $('#warn'); if (w) w.remove(); var db = $('#btn-dodge'); if (db) db.classList.remove('alert'); }
  function rand(a, b) { return a + Math.random() * (b - a); }

  /* ---------------- Ganar / perder ---------------- */
  function win() {
    var s = S(), e = st.enemy, m = st.me, d = DC.DIFF, R = DC.RARITY[e.sp.rarity];
    st.phase = 'exhausted';
    e.hp = 0; e.exhausted = true;
    st.tele = null; removeWarn(); clearRings();
    e.actor.play('kneel');
    m.actor.play('celebrate');
    DC.Audio.play('win');
    banner('¡Ganaste!<small>' + U().esc(e.sp.name) + ' está agotado</small>', 1500);
    var lvlF = 1 + 0.05 * e.lvl;
    var vm = e.look ? e.look.coins : 1;
    var xp = Math.round(R.xp * lvlF * d.reward * (e.look ? 1.5 : 1));
    var coins = Math.round(R.coins * d.reward * vm);
    s.coins += coins;
    st.levelUps = st.levelUps.concat(DC.Store.addXp(xp));
    var dl = DC.Store.addDinoXp(m.inst, xp * 0.9);
    st.rewards.push(['Experiencia', '+' + xp + ' XP'], ['Dino-monedas', '+' + coins]);
    if (dl) st.rewards.push([m.sp.name + ' subió de nivel', 'Nv. ' + m.inst.lvl]);
    s.totals.wins++;
    collect(DC.Store.bump('wins'));
    var eggP = 0.14 + R.stars * 0.05;
    if (Math.random() < eggP) { s.eggs.push({ id: DC.Store.uid(), laidVisit: s.visits }); st.rewards.push(['¡Huevo de dinosaurio!', 'Eclosiona en tu próxima visita']); }
    if (Math.random() < 0.3) { s.items.leaf = (s.items.leaf || 0) + 1; st.rewards.push(['Hoja medicinal', '+1']); }
    DC.Store.save();
    U().renderTop();
    setTimeout(function () { if (st && st.phase === 'exhausted') toCapture(); }, 1500);
  }
  function lose() {
    var s = S(), m = st.me;
    st.phase = 'lost';
    st.tele = null; removeWarn(); clearRings();
    m.actor.play('faint');
    DC.Audio.play('lose');
    s.totals.losses++; DC.Store.bump('losses');
    banner('¡' + U().esc(m.sp.name) + ' se desmayó!', 1500);
    var others = DC.Store.healthyTeam();
    setTimeout(function () {
      if (!st) return;
      if (others.length) {
        $('#hb').innerHTML = '<div class="glasscard"><b>Elige otro dinosaurio para seguir</b><div class="swap-row">' +
          others.slice(0, 4).map(function (o) { return '<button class="swapbtn" data-h="swap" data-uid="' + o.uid + '">' + U().img(o.sp, '', '', o.variant) + '<span>' + U().esc(DC.SP[o.sp].name) + '</span><small class="num">Nv. ' + o.lvl + '</small></button>'; }).join('') + '</div></div>' +
          '<div class="hud-pills"><button class="pillbtn" data-h="leave">' + icon('run') + 'Retirarse</button></div>';
        U().fillPortraits($('#hb'));
      } else {
        var e = st.enemy;
        e.actor.play('roar', { onPeak: function () { roarFx(e.actor); } }).then(function () { return flee(); }).then(function () { finish('lost'); });
      }
    }, 1500);
  }

  /* =====================================================================
     CAPTURA
     ===================================================================== */
  function ballCount(t) { var s = S(); return t === 'dino' ? s.spheres : (s.items[t] || 0); }
  function chance(fern, ballType) {
    var e = st.enemy, R = DC.RARITY[e.sp.rarity], d = DC.DIFF;
    var hpF = 1 + 1.8 * (1 - Math.max(0, e.hp) / e.max);
    var vm = e.look ? e.look.capture : 1;
    var bm = DC.BALLS[ballType || 'dino'].mult;
    return Math.min(0.96, R.capture * hpF * d.capture * vm * bm * (fern ? 1.5 : 1));
  }
  function toCapture() {
    var s = S();
    st.phase = 'capture';
    st.useFern = st.useFern && s.items.fern > 0;
    if (!st.ball || ballCount(st.ball) <= 0) st.ball = ['dino', 'super', 'ultra'].find(function (t) { return ballCount(t) > 0; }) || 'dino';
    clearRings();
    if (!DC.AR.gyro.on) DC.AR.lookTowards(st.enemy.pos, -0.12);
    var c = Math.round(chance(st.useFern, st.ball) * 100);
    var color = c >= 50 ? 'green' : c >= 25 ? 'yellow' : 'red';
    var n = ballCount(st.ball);
    var canBuy = ballsLeft() <= 0 && s.coins >= 60 && s.visit.bought < DC.SPHERE_BUY_LIMIT;
    var picker = ['dino', 'super', 'ultra'].map(function (t) {
      var k = ballCount(t), B = DC.BALLS[t];
      return '<button class="ballpick' + (st.ball === t ? ' on' : '') + '" data-h="pickball" data-t="' + t + '"' + (k > 0 ? '' : ' disabled') + ' aria-pressed="' + (st.ball === t) + '">' +
        '<i class="ball-ico ' + t + '"></i><span>' + B.name.replace('esfera', '') + '</span><b class="num">' + k + '</b></button>';
    }).join('');
    $('#hb').innerHTML =
      '<div class="cap-panel">' +
      '<p class="hud-note">' + (n > 0 ? 'Lanza cuando el anillo esté pequeño · toca o desliza hacia arriba' : 'Te quedaste sin esferas') + '</p>' +
      '<div class="chance-meter ' + color + '"><span>Probabilidad</span><div class="cm-track"><i style="width:' + c + '%"></i></div><b class="num">' + c + '%</b></div>' +
      '<div class="ball-row">' + picker + '</div>' +
      '<button class="throw-ball ' + st.ball + '" id="ball" aria-label="Lanzar ' + DC.BALLS[st.ball].name + '"' + (n > 0 ? '' : ' disabled') + '><span class="shine"></span><span class="count num">' + n + '</span></button>' +
      '<div class="hud-pills">' +
      (s.items.fern > 0 ? '<button class="pillbtn fern" data-h="fern" aria-pressed="' + !!st.useFern + '">' + icon('leaf') + 'Helecho (' + s.items.fern + ')</button>' : '') +
      (canBuy ? '<button class="pillbtn" data-h="buyball">' + icon('coin') + 'Comprar 1 · 60</button>' : '') +
      (st.enemy.exhausted ? '<button class="pillbtn" data-h="letgo">' + icon('run') + 'Dejarlo ir</button>'
        : '<button class="pillbtn" data-h="leave">' + icon('run') + 'Huir</button>' + (DC.Store.healthyTeam().length ? '<button class="pillbtn" data-h="fight">' + icon('claw') + 'Pelear</button>' : '')) +
      '</div></div>';
    hint('');
    var rm = document.createElement('div'); rm.className = 'ring-move capture-' + color; rm.id = 'ringC'; $('#fxl').appendChild(rm);
    st.cring = 0;
    bindBall();
  }
  function bindBall() {
    var b = $('#ball'); if (!b) return;
    var start = null;
    b.addEventListener('pointerdown', function (e) { start = { x: e.clientX, y: e.clientY, t: performance.now() }; b.setPointerCapture && b.setPointerCapture(e.pointerId); });
    b.addEventListener('pointerup', function (e) {
      if (!start) return;
      var dy = e.clientY - start.y, dx = e.clientX - start.x;
      start = null;
      throwSphere(dy < -50 ? { swipe: true, dx: dx } : { swipe: false });
    });
    b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); throwSphere({ swipe: false }); } });
  }
  function captureRingScale() { var period = 1.3 / DC.DIFF.ringSpeed; var f = (st.cring % period) / period; return 1 - 0.75 * f; }

  function throwSphere(o) {
    var s = S(), e = st.enemy, type = st.ball || 'dino';
    if (st.phase !== 'capture' || ballCount(type) <= 0 || st.throwing) return;
    st.throwing = true;
    if (type === 'dino') s.spheres--; else s.items[type]--;
    s.totals.throws++; DC.Store.bump('throws');
    DC.Store.save(); U().renderTop();
    var sc = captureRingScale();
    var qual = sc < 0.45 ? 'Excelente' : sc < 0.72 ? 'Genial' : 'Bien';
    var qm = qual === 'Excelente' ? 1.7 : qual === 'Genial' ? 1.3 : 1;
    if (o.swipe) qm *= 1.1;
    if (qual === 'Excelente') { DC.Store.bump('excellent'); s.totals.excellent++; }
    var useFern = st.useFern && s.items.fern > 0;
    if (useFern) { s.items.fern--; st.useFern = false; }
    var p = Math.min(0.97, chance(useFern, type) * qm);
    $('#hb').innerHTML = ''; hint(''); var rc = $('#ringC'); if (rc) rc.remove();
    var sphere = DC.Models.makeSphere(type), ud = sphere.userData, B = ud.ball;
    var cam = DC.AR.camera;
    var from = cam.localToWorld(new T.Vector3(0, -0.42, -0.65));
    var to = e.actor.chestWorld();
    var dodge = !e.exhausted && e.unique && Math.random() < 0.15;
    sphere.position.copy(from);
    DC.AR.scene.add(sphere);
    DC.Audio.play('whoosh');
    var side = o.swipe ? Math.max(-1, Math.min(1, (o.dx || 0) / 120)) : 0;
    var trailT = 0;
    DC.tween(0.62, function (u) {
      sphere.position.lerpVectors(from, to, u);
      sphere.position.y += Math.sin(Math.PI * u) * 0.9;
      sphere.position.x += Math.sin(Math.PI * u) * side * 0.6;
      sphere.rotation.x -= 0.45; sphere.rotation.z += 0.15 * side;
      if (u - trailT > 0.06) { trailT = u; DC.FX.burst(sphere.position, { color: B.glow, count: 3, speed: 0.3, size: 0.1, gravity: 0, life: 0.4 }); }
    }, 'linear').then(function () {
      if (dodge) {
        e.actor.play('dodge', { dir: 1 });
        banner('¡Lo esquivó!', 900);
        return DC.tween(0.5, function (u) { sphere.position.y = Math.max(0.11, to.y - u * u * to.y); sphere.position.z -= 0.04; }, 'linear').then(function () {
          DC.AR.scene.remove(sphere); st.throwing = false; afterFail(false);
        });
      }
      floatText(to.clone().add(new T.Vector3(0, 0.5, 0)), qual + (o.swipe ? '<small>con impulso</small>' : ''), qual === 'Excelente' ? 'crit' : '');
      /* la esfera mira al dinosaurio y abre la tapa */
      sphere.rotation.set(0, Math.atan2(to.x - from.x, to.z - from.z) + Math.PI, 0);
      DC.tween(0.18, function (u) { ud.lid.rotation.x = -1.25 * u; }, 'out');
      DC.FX.burst(to, { color: B.glow, count: 30, speed: 2.6, size: 0.16 });
      flashWhite();
      DC.Audio.play('beam');
      DC.FX.beam(sphere.position.clone(), e.actor.chestWorld(), B.glow);
      var start = e.actor.root.position.clone();
      e.actor.play('shrink').then(function () { e.actor.root.visible = false; e.actor.root.position.copy(start); });
      DC.tween(0.55, function (u) { e.actor.root.position.lerpVectors(start, new T.Vector3(sphere.position.x, 0, sphere.position.z), u * 0.85); }, 'in');
      var groundY = 0.11;
      return DC.wait(0.55).then(function () {
        DC.Audio.play('click');
        DC.FX.burst(sphere.position, { tex: 'star', color: '#ffffff', count: 10, speed: 1.4, size: 0.08 });
        return DC.tween(0.12, function (u) { ud.lid.rotation.x = -1.25 * (1 - u); }, 'in');
      }).then(function () {
        return DC.tween(0.5, function (u) {
          var b = Math.abs(Math.cos(u * Math.PI * 1.5)) * (1 - u);
          sphere.position.y = groundY + (to.y - groundY) * (1 - u) * (1 - u) + b * 0.25;
        }, 'linear');
      }).then(function () {
        sphere.rotation.set(0, Math.atan2(-sphere.position.x, -sphere.position.z) + Math.PI, 0);
        var each = Math.pow(p, 1 / 3), i = 0;
        function shake() {
          ud.btnMat.emissive.set('#ff3b30');
          return DC.tween(0.55, function (u) { sphere.rotation.z = Math.sin(u * Math.PI * 3) * 0.45 * (1 - u); ud.btnMat.emissiveIntensity = 0.6 + Math.abs(Math.sin(u * Math.PI * 3)) * 1.6; }, 'linear').then(function () {
            ud.btnMat.emissive.set(B.glow);
            DC.Audio.play('click');
            var ok = Math.random() < each;
            if (!ok) return false;
            i++;
            DC.FX.burst(sphere.position, { color: B.glow, count: 6, speed: 1, size: 0.08 });
            return i >= 3 ? true : DC.wait(0.25).then(shake);
          });
        }
        return DC.wait(0.3).then(shake);
      }).then(function (ok) {
        st.throwing = false;
        if (ok) captured(sphere);
        else {
          DC.tween(0.15, function (u) { ud.lid.rotation.x = -1.4 * u; }, 'out');
          DC.FX.burst(sphere.position, { color: B.glow, count: 34, speed: 3.2, size: 0.18 });
          DC.Audio.play('fail');
          setTimeout(function () { DC.AR.scene.remove(sphere); }, 250);
          e.actor.root.visible = true;
          e.actor.play('grow').then(function () {
            if (e.exhausted) return e.actor.play('kneel');
            return e.actor.play('roar', { onPeak: function () { roarFx(e.actor); } });
          });
          banner('¡Se escapó de la esfera!', 1000);
          setTimeout(function () { afterFail(true); }, 700);
        }
      });
    });
  }
  function afterFail(broke) {
    var e = st.enemy, R = DC.RARITY[e.sp.rarity];
    var fleeP = R.flee * (e.exhausted ? 0.5 : 1) * (broke ? 1 : 0.6);
    if (Math.random() < fleeP) {
      banner('¡' + U().esc(e.sp.name) + ' huyó!', 1400);
      S().totals.flees++;
      flee().then(function () { finish('escaped'); });
    } else if (ballsLeft() <= 0 && !(S().coins >= 60 && S().visit.bought < DC.SPHERE_BUY_LIMIT)) {
      toCapture();
      hint('Sin Dinoesferas: compra más en Premios o vuelve en tu próxima visita');
    } else toCapture();
  }
  function captured(sphere) {
    var s = S(), e = st.enemy, d = DC.DIFF, R = DC.RARITY[e.sp.rarity];
    st.phase = 'done';
    DC.Audio.play('capture');
    DC.Audio.vibe([40, 60, 120]);
    var ud = sphere.userData;
    ud.btnMat.emissive.set('#3dff7a'); ud.btnMat.emissiveIntensity = 2.4;
    DC.FX.burst(sphere.position.clone().add(new T.Vector3(0, 0.2, 0)), { tex: 'star', color: e.look ? e.look.aura : '#ffd45a', count: 44, speed: 3, size: 0.2 });
    DC.FX.ring(sphere.position, { color: '#ffffff', to: 2.2 });
    banner('¡Capturado!<small>' + U().esc(enemyName(e)) + (e.look && !e.unique ? ' · ' + U().esc(e.look.name) : '') + '</small>', 1600);
    var inst = DC.Store.makeInst(e.sp.id, e.lvl, e.variant);
    DC.Store.addToTeam(inst);
    var a = DC.Store.albumEntry(e.sp.id);
    var isNew = a.caught === 0;
    a.caught++; if (!a.first) a.first = Date.now();
    DC.Store.noteVariant(e.sp.id, e.variant);
    s.totals.caps++;
    collect(DC.Store.bump('caps'));
    collect(DC.Store.bump('cap_' + e.sp.type));
    var vm = e.look ? e.look.coins : 1;
    var xp = Math.round(R.xp * 0.8 * d.reward * (isNew ? 1.5 : 1) * (e.look ? 1.4 : 1));
    var coins = Math.round(R.coins * 0.6 * d.reward * vm);
    s.coins += coins;
    st.levelUps = st.levelUps.concat(DC.Store.addXp(xp));
    st.rewards.push(['Captura' + (isNew ? ' (nueva especie)' : ''), '+' + xp + ' XP'], ['Dino-monedas', '+' + coins]);
    if (e.look && !e.unique) st.rewards.push(['Variante ' + e.look.name, 'monedas x' + vm]);
    if (isNew) st.rewards.push(['Ficha desbloqueada', DC.Store.caughtCount() + '/' + DC.SPECIES.length]);
    st.prizes = st.prizes || [];
    if (e.unique) {
      var code = DC.Store.captureUnique(e.unique.id);
      if (code) { st.rewards.push(['¡Helado gratis!', 'Código en Premios']); st.prizes.push(code); }
    }
    DC.Store.checkCollections().forEach(function (c) { st.rewards.push(['¡Colección completa!', c.label]); st.prizes.push(c); });
    st.captured = inst;
    DC.Store.save(); U().renderTop();
    setTimeout(function () {
      DC.AR.scene.remove(sphere);
      finish('captured');
    }, 1700);
  }
  function flee() {
    var e = st.enemy, a = e.actor;
    var dir = new T.Vector3(e.pos.x, 0, e.pos.z).normalize();
    var from = a.root.position.clone();
    a.walk = 1;
    a.play('flee', { dur: 1.8 });
    return DC.tween(1.8, function (u) {
      var k = Math.max(0, (u - 0.2) / 0.8);
      a.root.position.copy(from).addScaledVector(dir, k * k * 6);
    }, 'linear').then(function () { a.root.visible = false; });
  }
  function clearRings() { ['#ringT', '#ringM', '#ringC'].forEach(function (s) { var x = $(s); if (x) x.remove(); }); }
  function collect(missions) { (missions || []).forEach(function (m) { st.toasts.push('Misión completada: ' + U().esc(m.text)); }); }

  /* ---------------- Fin del encuentro y resultados ---------------- */
  function finish(outcome) {
    var s = S();
    st.outcome = outcome;
    st.phase = 'result';
    clearRings(); removeWarn();
    var zr = st.appeared ? DC.Store.markZone(st.zone) : { first: false, route: false };
    st.route = zr.route;
    var e = st.enemy;
    var title = { captured: '¡Capturado!', escaped: 'Se escapó', lost: 'Tu equipo perdió', fled: 'Saliste del encuentro', won: '¡Victoria!' }[outcome] || 'Encuentro terminado';
    var sub = {
      captured: e.sp.name + ' se unió a tu equipo.',
      escaped: 'Volverás a encontrarlo. Debilitarlo antes ayuda mucho.',
      lost: 'Cura a tu equipo o vuelve en tu próxima visita: se recupera por completo.',
      fled: 'El dinosaurio sigue por aquí.',
      won: 'Lo dejaste ir. Ganaste experiencia igual.'
    }[outcome] || '';
    if (zr.first) st.rewards.push(['Zona explorada', s.visit.zones.length + '/5']);
    if (zr.route) st.rewards.push(['¡Ruta del tesoro completa!', '+150 monedas y código']);
    var rw = st.rewards.map(function (r) { return '<li><span>' + U().esc(r[0]) + '</span><b class="num">' + U().esc(r[1]) + '</b></li>'; }).join('');
    var wrap = document.createElement('div');
    wrap.className = 'result ' + outcome;
    var nm = enemyName(e);
    wrap.innerHTML = '<div class="result-card">' +
      '<div class="result-hero' + (e.unique ? ' unique' : '') + '" style="' + (e.look ? '--vc:' + e.look.chip : '') + '">' + U().img(e.sp.id, '', nm, outcome === 'captured' ? e.variant : 'normal') + '</div>' +
      '<div class="eyebrow">' + U().esc(DC.ZONES[st.zone - 1].name) + '</div><h2>' + title + '</h2><p class="muted">' + U().esc(outcome === 'captured' ? nm + ' se unió a tu equipo.' : sub) + '</p>' +
      (rw ? '<ul class="reward-list">' + rw + '</ul>' : '') +
      '<div class="stack">' +
      (outcome === 'captured' ? '<button class="btn block" data-h="seeficha">' + icon('book') + 'Ver ficha y responder pregunta</button>' : '') +
      '<button class="btn ' + (outcome === 'captured' ? 'ghost ' : '') + 'block" data-h="tomap">Volver al mapa</button></div></div>';
    $('#hud').appendChild(wrap);
    U().fillPortraits(wrap);
    DC.Store.save();
  }
  function endToMap(openFicha) {
    var res = st;
    cleanup();
    hideStage();
    U().render();
    res.toasts.forEach(function (t, i) { setTimeout(function () { U().toast(t, 'star'); }, 300 + i * 500); });
    setTimeout(function () { U().checkMedals(); }, 200);
    var chain = Promise.resolve();
    if (res.route) {
      chain = chain.then(function () {
        return new Promise(function (r) {
          var c = S().codes.find(function (x) { return x.prize === 'canchita'; }) || S().codes[0];
          U().prizeModal(c, r, '¡Recorriste las 5 zonas!');
        });
      });
    }
    (res.prizes || []).forEach(function (c) {
      chain = chain.then(function () { return new Promise(function (r) { U().prizeModal(c, r); }); });
    });
    if (res.levelUps.length) chain = chain.then(function () { return new Promise(function (r) { var m = U().levelUp(res.levelUps[res.levelUps.length - 1]); var mods = document.querySelectorAll('#overlay .modal-back'); var last = mods[mods.length - 1]; var obs = new MutationObserver(function () { if (!last.isConnected) { obs.disconnect(); r(); } }); obs.observe(document.getElementById('overlay'), { childList: true }); }); });
    if (openFicha && res.captured) chain.then(function () { U().ficha(res.captured.sp, true); });
  }
  function cleanup() {
    if (!st) return;
    st.unsub.forEach(function (f) { f(); });
    if (st.qrTimer) clearInterval(st.qrTimer);
    st = null;
  }

  /* ---------------- Bucle por cuadro ---------------- */
  function frame(dt) {
    if (!st) return;
    var e = st.enemy;
    /* aura de variantes y únicos */
    if (e && e.look && e.actor.root.visible && st.phase !== 'result') {
      st.auraT = (st.auraT || 0) + dt;
      if (st.auraT > (e.unique ? 0.12 : 0.22)) {
        st.auraT = 0;
        var ap = e.actor.root.position, hh = e.actor.height;
        DC.FX.burst(new T.Vector3(ap.x + (Math.random() - 0.5) * e.actor.radius * 1.6, 0.2 + Math.random() * hh, ap.z + (Math.random() - 0.5) * e.actor.radius * 1.6),
          { tex: 'star', color: e.look.aura, count: e.unique ? 3 : 2, speed: 0.4, size: 0.09, gravity: 0.6, life: 0.9 });
      }
    }
    /* flecha guía hacia el dinosaurio */
    var g = $('#guide');
    if (e && g && e.actor.root.visible && st.phase !== 'result') {
      var target = e.actor.chestWorld();
      var ang = DC.AR.offscreen(target);
      if (ang === null) {
        g.hidden = true;
        if (st.phase === 'appear' && performance.now() - st.appearAt > 900) onAppear();
      } else {
        var w = DC.AR.stage.clientWidth, h = DC.AR.stage.clientHeight, R = Math.min(w, h) * 0.36;
        g.hidden = false;
        g.style.left = (w / 2 + Math.cos(ang) * R) + 'px';
        g.style.top = (h / 2 - Math.sin(ang) * R) + 'px';
        g.style.transform = 'rotate(' + (-ang) + 'rad)';
        if (st.phase === 'appear') hint(DC.AR.gyro.on ? '¡Por aquí! Gira tu celular' : '¡Por aquí! Desliza para mirar');
        if (st.phase === 'appear' && performance.now() - st.appearAt > 4500) onAppear();
      }
    } else if (g) g.hidden = true;

    if (st.phase === 'battle') {
      var m = st.me;
      if (m) {
        m.cd = Math.max(0, m.cd - dt);
        st.dodgeCd = Math.max(0, st.dodgeCd - dt);
        st.ring += dt;
        enemyUpdate(dt);
        var rt = $('#ringT'), rm = $('#ringM');
        if (rt && rm && st.phase === 'battle') {
          var c = e.actor.chestWorld(), pc = DC.AR.project(c);
          var top = DC.AR.project(c.clone().add(new T.Vector3(0, Math.max(0.35, e.actor.height * 0.32), 0)));
          var r = Math.max(26, Math.min(120, Math.abs(pc.y - top.y)));
          var ready = m.cd <= 0 && !m.busy && pc.on;
          rt.hidden = rm.hidden = !ready;
          if (ready) {
            var sc = ringScale();
            rt.style.left = rm.style.left = pc.x + 'px'; rt.style.top = rm.style.top = pc.y + 'px';
            rt.style.width = rt.style.height = (r * 2) + 'px';
            rm.style.width = rm.style.height = (r * 2 * sc) + 'px';
            rm.style.borderColor = Math.abs(sc - 1) < 0.13 ? '#ffd45a' : '';
          }
        }
        var ab = $('#btn-attack'); if (ab) ab.disabled = !(m.cd <= 0 && !m.busy);
      }
      var wn = $('#warn');
      if (wn && e) {
        var hp = DC.AR.project(e.actor.root.localToWorld(new T.Vector3(0, e.actor.height + 0.25, 0)));
        wn.style.left = hp.x + 'px'; wn.style.top = Math.max(70, hp.y) + 'px';
        if (st.tele) { var k = st.tele.t / st.tele.dur; wn.style.background = k > 1 - DC.DIFF.dodgeWin / st.tele.dur ? '#ffd45a' : ''; wn.style.color = k > 1 - DC.DIFF.dodgeWin / st.tele.dur ? '#2a1704' : ''; }
      }
    }
    if (st.phase === 'capture') {
      st.cring += dt;
      var rc = $('#ringC');
      if (rc && e) {
        var cc = e.actor.chestWorld(), pcc = DC.AR.project(cc);
        var tp = DC.AR.project(cc.clone().add(new T.Vector3(0, Math.max(0.4, e.actor.height * 0.4), 0)));
        var rr = Math.max(30, Math.min(140, Math.abs(pcc.y - tp.y)));
        rc.hidden = !pcc.on;
        rc.style.left = pcc.x + 'px'; rc.style.top = pcc.y + 'px';
        var s2 = captureRingScale();
        rc.style.width = rc.style.height = (rr * 2 * s2) + 'px';
      }
    }
  }

  /* ---------------- Botones del HUD ---------------- */
  function onHud(ev) {
    var b = ev.target.closest('[data-h]'); if (!b || !st && b.dataset.h !== 'leave' && b.dataset.h !== 'closephoto' && b.dataset.h !== 'shutter' && b.dataset.h !== 'roarbtn') return;
    var h = b.dataset.h;
    DC.Audio.unlock();
    switch (h) {
      case 'leave':
        if (st && st.photo) { cleanup(); hideStage(); U().render(); return; }
        if (!st) { hideStage(); U().render(); return; }
        if (st.appeared && (st.phase === 'battle' || st.phase === 'menu' || st.phase === 'capture' || st.phase === 'lost')) {
          if (st.me && st.me.inst.hp <= 0) { finish('lost'); return; }
          finish('fled');
        } else { cleanup(); hideStage(); U().render(); }
        break;
      case 'mode':
        if (DC.AR.mode === 'ar') { DC.AR.stopCamera(); S().settings.camera = false; }
        else { DC.AR.startCamera().then(function (ok) { if (!ok) U().toast('No se pudo abrir la cámara. Revisa los permisos del navegador.', 'camera'); else S().settings.camera = true; DC.Store.save(); var mb = $('#modebtn'); if (mb) mb.innerHTML = icon(DC.AR.mode === 'ar' ? 'cube' : 'camera'); }); }
        b.innerHTML = icon(DC.AR.mode === 'ar' ? 'cube' : 'camera');
        DC.Store.save();
        break;
      case 'center':
        if (DC.AR.gyro.on) DC.AR.recenter();
        if (st && st.enemy) {
          if (DC.AR.gyro.on) { /* recentrar mueve el mundo: llevamos a los actores al frente */ }
          else DC.AR.lookTowards(st.me ? new T.Vector3().addVectors(st.enemy.pos, st.me.pos).multiplyScalar(0.5) : st.enemy.pos, -0.15);
        } else DC.AR.look.ty = 0, DC.AR.look.tp = -0.12;
        break;
      case 'fight': clearRings(); startFight(); break;
      case 'swap':
        var inst = S().team.find(function (x) { return x.uid === b.dataset.uid; });
        S().partner = inst.uid; DC.Store.save();
        startFight(inst);
        break;
      case 'tocapture': clearRings(); removeWarn(); st.tele = null; if (st.me && st.me.actor) st.me.actor.play('wake'); toCapture(); break;
      case 'attack': playerAttack(); break;
      case 'dodge': playerDodge(); break;
      case 'special': playerSpecial(); break;
      case 'fern': st.useFern = !st.useFern; toCapture(); break;
      case 'pickball': st.ball = b.dataset.t; DC.Audio.play('tap'); toCapture(); break;
      case 'buyball':
        var s = S();
        if (s.coins >= 60 && s.visit.bought < DC.SPHERE_BUY_LIMIT) { s.coins -= 60; s.spheres++; s.visit.bought++; st.ball = 'dino'; DC.Store.save(); U().renderTop(); DC.Audio.play('coin'); toCapture(); }
        break;
      case 'letgo': finish('won'); break;
      case 'seeficha': endToMap(true); break;
      case 'tomap': endToMap(false); break;
      case 'shutter': takePhoto(); break;
      case 'roarbtn': if (st && st.photoActor) st.photoActor.play('roar', { onPeak: function () { roarFx(st.photoActor); } }); break;
      case 'closephoto': cleanup(); hideStage(); U().render(); break;
    }
  }
  /* Deslizar a los lados en la pelea = esquivar */
  function bindSwipe() {
    var st0 = null, stage = $('#stage');
    stage.addEventListener('pointerdown', function (e) { if (e.target.closest('button')) return; st0 = { x: e.clientX, y: e.clientY }; });
    stage.addEventListener('pointerup', function (e) {
      if (!st0) return;
      var dx = e.clientX - st0.x; st0 = null;
      if (st && st.phase === 'battle' && Math.abs(dx) > 60) playerDodge();
    });
  }

  /* =====================================================================
     QR de zona (BarcodeDetector) y modo foto
     ===================================================================== */
  function scanQR(zone) {
    if (st) cleanup();
    st = { photo: false, qr: true, unsub: [], toasts: [], rewards: [], levelUps: [] };
    showStage(); hudBase();
    $('#hb').innerHTML = '<div class="glasscard" style="text-align:center"><b>Apunta al código QR de ' + U().esc(DC.ZONES[zone - 1].name) + '</b><div class="muted">Está en el letrero de la zona.</div></div>' +
      '<div class="hud-pills"><button class="pillbtn" data-h="leave">' + icon('back') + 'Cancelar</button></div>';
    var myst = st;
    DC.AR.startCamera().then(function (ok) {
      if (!ok) { U().toast('Necesitas permitir la cámara para leer el QR', 'camera'); return; }
      if (!('BarcodeDetector' in window)) {
        $('#hb').innerHTML = '<div class="glasscard"><b>Tu navegador no lee QR dentro de la app.</b><div class="muted">Abre la cámara normal del celular y escanea el QR de la zona: te traerá aquí con la zona validada.</div></div>' +
          '<div class="hud-pills"><button class="pillbtn" data-h="leave">' + icon('back') + 'Volver</button></div>';
        return;
      }
      var det = new window.BarcodeDetector({ formats: ['qr_code'] });
      myst.qrTimer = setInterval(function () {
        if (st !== myst) return;
        det.detect(DC.AR.video).then(function (codes) {
          if (!codes.length || st !== myst) return;
          var v = codes[0].rawValue || '', m = v.match(/zona[-:](\d)/i);
          if (!m) return;
          var n = +m[1];
          if (n === zone) { clearInterval(myst.qrTimer); DC.Audio.play('capture'); U().toast('Zona validada', 'check'); start(zone); }
          else U().toast('Ese QR es de la zona ' + n + ': ' + DC.ZONES[n - 1].name, 'qr');
        }).catch(function () {});
      }, 400);
    });
  }

  function photo(spId, uid) {
    if (st) cleanup();
    var inst = uid ? S().team.find(function (x) { return x.uid === uid; }) : null;
    st = { photo: true, unsub: [], toasts: [], rewards: [], levelUps: [] };
    showStage(); hudBase();
    var sp = DC.SP[spId];
    var a = new DC.Models.Actor(sp, { variant: inst ? inst.variant : 'normal' });
    a.root.position.set(0, 0, sp.id === 'brachiosaurus' ? -6 : -3.6);
    a.faceTo(0.6, 0);
    DC.AR.add(a);
    st.photoActor = a;
    $('#hb').innerHTML = '<div class="battle-acts"><button class="rb dodge" data-h="closephoto">' + icon('back') + '<span>Salir</span></button>' +
      '<button class="rb attack" data-h="shutter">' + icon('camera') + '<span>Foto</span></button>' +
      '<button class="rb special ready" data-h="roarbtn" style="--e:100">' + icon('sound') + '<span>Rugir</span></button></div>';
    prepareView().then(function () {
      hint(DC.AR.mode === 'ar' ? 'Ponte al lado de tu ' + sp.name + ' y toma la foto' : 'Desliza para encuadrar');
      a.play('roar', { onPeak: function () { roarFx(a); } });
    });
  }
  function takePhoto() {
    var c = DC.AR.snapshot();
    var g = c.getContext('2d');
    var w = c.width, h = c.height, sz = Math.round(w * 0.045);
    g.fillStyle = 'rgba(14,27,23,.75)'; g.fillRect(0, h - sz * 2.4, w, sz * 2.4);
    g.fillStyle = '#f2a531'; g.font = sz + 'px "Lilita One", sans-serif'; g.textBaseline = 'middle';
    g.fillText('DinoCaza AR · Dino Park Arequipa', sz * 0.8, h - sz * 1.2);
    flashWhite(); DC.Audio.play('click');
    var url = c.toDataURL('image/jpeg', 0.9);
    var m = U().modal('<div class="stack"><h2>¡Foto lista!</h2><img src="' + url + '" alt="Foto con tu dinosaurio" style="border-radius:16px;width:100%">' +
      '<a class="btn block" href="' + url + '" download="dinocaza-foto.jpg">' + icon('photo') + 'Guardar foto</a>' +
      '<button class="btn ghost block" id="share-ph">Compartir</button><button class="btn ghost block" data-act="close">Seguir</button></div>', { center: true });
    var sh = m.querySelector('#share-ph');
    sh.addEventListener('click', function () {
      if (!navigator.share) { U().toast('Usa "Guardar foto" y compártela desde tu galería', 'photo'); return; }
      c.toBlob(function (blob) {
        var file = new File([blob], 'dinocaza.jpg', { type: 'image/jpeg' });
        var data = { title: 'DinoCaza AR', text: '¡Mira mi dinosaurio en Dino Park Arequipa!', files: [file] };
        if (navigator.canShare && !navigator.canShare(data)) delete data.files;
        navigator.share(data).catch(function () {});
      }, 'image/jpeg', 0.9);
    });
  }

  DC.Encounter = {
    init: function () { $('#hud').addEventListener('click', onHud); bindSwipe(); },
    start: start, scanQR: scanQR, photo: photo,
    state: function () { return st; }
  };
})();
