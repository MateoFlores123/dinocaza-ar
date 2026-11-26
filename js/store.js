/* =====================================================================
   DinoCaza AR · store.js
   Estado del jugador, guardado local, visitas (días distintos),
   pasaporte, huevos, misiones, códigos canjeables y métricas.
   ===================================================================== */
(function () {
  var KEY = 'dinocaza_ar_save_v1';
  var mem = null; /* respaldo si el navegador bloquea localStorage */
  var saveTimer = null;

  function now() { return Date.now() + (S && S.devOffsetDays ? S.devOffsetDays * 86400000 : 0); }
  function dayKey(t) {
    var d = new Date(t);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function uid() { return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  var S = null;

  function fresh() {
    return {
      v: 1, created: Date.now(), devOffsetDays: 0, onboarded: false,
      name: '', age: 'nino', difficulty: 'normal',
      settings: { sound: true, camera: true, lite: false, gyro: true, qr: false },
      level: 1, xp: 0, coins: 120, spheres: 0, items: { leaf: 2, fern: 1, super: 1, ultra: 0 },
      uniques: {}, collectionPrizes: [], xmas: {}, points: 0, pointsTotal: 0, avatar: null,
      team: [], partner: null,
      album: {},
      visits: 0, lastDay: null, visitDays: [],
      visit: null,
      eggs: [], codes: [], passportClaimed: [], medals: [],
      totals: { caps: 0, wins: 0, losses: 0, routes: 0, golden: 0, hardWins: 0, quiz: 0, throws: 0, encounters: 0,
        fichas: 0, specials: 0, crits: 0, perfect: 0, excellent: 0, flees: 0, variants: 0 },
      history: [],
      lastTick: Date.now()
    };
  }

  function load() {
    var raw = null;
    try { raw = window.localStorage.getItem(KEY); } catch (e) { raw = mem; }
    if (!raw) raw = mem;
    try { S = raw ? JSON.parse(raw) : fresh(); } catch (e) { S = fresh(); }
    var f = fresh();
    Object.keys(f).forEach(function (k) { if (S[k] === undefined) S[k] = f[k]; });
    Object.keys(f.totals).forEach(function (k) { if (S.totals[k] === undefined) S.totals[k] = 0; });
    Object.keys(f.settings).forEach(function (k) { if (S.settings[k] === undefined) S.settings[k] = f.settings[k]; });
    /* Migraciones: dificultad única y variantes */
    S.difficulty = 'normal';
    ['super', 'ultra', 'leaf', 'fern'].forEach(function (k) { if (S.items[k] === undefined) S.items[k] = 0; });
    S.team.forEach(function (d) { if (!d.variant) d.variant = d.golden ? 'oro' : 'normal'; });
    return S;
  }
  function saveNow() {
    var raw = JSON.stringify(S);
    mem = raw;
    try { window.localStorage.setItem(KEY, raw); } catch (e) { /* modo privado: queda en memoria */ }
  }
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 250);
  }

  /* ---------------- Dinosaurios del jugador ---------------- */
  function stats(inst) {
    var sp = DC.SP[inst.sp];
    var m = 1 + 0.085 * (inst.lvl - 1);
    var lk = DC.look(inst.variant || (inst.golden ? 'oro' : 'normal'));
    var g = lk ? lk.mult : (DC.XMAS_BY[inst.variant] ? 1.12 : 1);
    return {
      maxHp: Math.round(sp.base.hp * m * g),
      atk: Math.round(sp.base.atk * m * g),
      def: Math.round(sp.base.def * m * g),
      spd: Math.round(sp.base.spd * m * g)
    };
  }
  function makeInst(spId, lvl, variant) {
    if (variant === true) variant = 'oro';
    variant = variant || 'normal';
    var inst = { uid: uid(), sp: spId, lvl: Math.max(1, lvl | 0), xp: 0, hp: 0, variant: variant, golden: variant === 'oro', caughtAt: Date.now() };
    inst.hp = stats(inst).maxHp;
    return inst;
  }
  function addToTeam(inst) {
    S.team.push(inst);
    if (!S.partner) S.partner = inst.uid;
    save();
  }
  function partner() {
    var p = S.team.find(function (d) { return d.uid === S.partner; });
    return p || S.team[0] || null;
  }
  function healthyTeam() { return S.team.filter(function (d) { return d.hp > 0; }); }

  /* Recuperación pasiva: 1.5 % de vida por minuto real */
  function tickHeal() {
    var t = Date.now();
    var mins = (t - (S.lastTick || t)) / 60000;
    S.lastTick = t;
    if (mins <= 0) return;
    S.team.forEach(function (d) {
      var mx = stats(d).maxHp;
      d.hp = Math.min(mx, d.hp + Math.floor(mx * 0.015 * mins));
    });
  }

  /* ---------------- Álbum ---------------- */
  function albumEntry(id) {
    if (!S.album[id]) S.album[id] = { seen: 0, caught: 0, golden: 0, quiz: false, read: false, first: null };
    if (!S.album[id].variants) S.album[id].variants = {};
    return S.album[id];
  }
  function caughtCount() {
    return DC.SPECIES.filter(function (s) { return S.album[s.id] && S.album[s.id].caught > 0; }).length;
  }
  function caughtTypes() {
    var set = {};
    DC.SPECIES.forEach(function (s) { if (S.album[s.id] && S.album[s.id].caught > 0) set[s.type] = 1; });
    return Object.keys(set);
  }

  /* ---------------- Disponibilidad de especies ---------------- */
  function availability(sp) {
    var d = new Date(now());
    var day = d.getDay(), hour = d.getHours();
    if (sp.minVisits && S.visits < sp.minVisits) {
      return { ok: false, why: 'Aparece desde tu visita n.º ' + sp.minVisits, kind: 'visits' };
    }
    if (sp.days && sp.days.indexOf(day) < 0) {
      return { ok: false, why: 'Solo aparece: ' + sp.days.map(function (x) { return DC.DAYS[x]; }).join(', '), kind: 'day' };
    }
    if (sp.afterHour && hour < sp.afterHour) {
      return { ok: false, why: 'Sale a cazar desde las ' + (sp.afterHour > 12 ? (sp.afterHour - 12) + ' p. m.' : sp.afterHour + ' a. m.'), kind: 'hour' };
    }
    return { ok: true, why: 'Disponible hoy', kind: 'ok' };
  }

  function rollXmas(zoneId) {
    if (!DC.SEASON.xmas || !S.visit) return null;
    var left = DC.XMAS.filter(function (x) { return x.zone === zoneId && !S.xmas[x.id]; });
    var forced = DC.forceXmas ? DC.XMAS_BY[DC.forceXmas] : null;
    DC.forceXmas = null;
    if (forced) return forced;
    if (!left.length || (S.visit.xmasSeen || 0) >= DC.XMAS_PER_VISIT || Math.random() > DC.XMAS_CHANCE) return null;
    return left[Math.floor(Math.random() * left.length)];
  }
  function rollEncounter(zoneId) {
    var xm = rollXmas(zoneId);
    if (xm) {
      S.visit.xmasSeen = (S.visit.xmasSeen || 0) + 1; save();
      var p0 = partner();
      return { sp: DC.SP[xm.sp], lvl: Math.max(2, Math.round(Math.max(S.level, p0 ? p0.lvl : 1) + 2)), variant: xm.id, unique: null, xmas: xm };
    }
    var uq = DC.forceUnique ? DC.UNIQUE[DC.forceUnique] : rollUnique(zoneId);
    DC.forceUnique = null;
    if (uq) {
      var pr = partner();
      return { sp: DC.SP[uq.sp], lvl: Math.max(2, Math.round(Math.max(S.level, pr ? pr.lvl : 1) + 2)), variant: uq.id, unique: uq };
    }
    var pool = DC.SPECIES.filter(function (s) { return s.zone === zoneId && availability(s).ok; });
    if (!pool.length) pool = DC.SPECIES.filter(function (s) { return s.zone === zoneId && !s.minVisits; });
    var total = 0;
    var w = pool.map(function (s) {
      var x = DC.RARITY[s.rarity].weight;
      if (s.rarity === 'legendaria') x = 14;           /* en la Guarida el rey es raro, pero alcanzable */
      if (S.album[s.id] && S.album[s.id].caught === 0) x *= 1.2;
      total += x; return x;
    });
    var r = Math.random() * total, sp = pool[0];
    for (var i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) { sp = pool[i]; break; } }
    var diff = DC.DIFF;
    var p = partner();
    var baseLvl = Math.max(S.level, p ? p.lvl : 1);
    var lvl = Math.max(1, Math.round(baseLvl + diff.enemyLvl + rnd(-1, 1.4) + (sp.rarity === 'legendaria' ? 3 : sp.rarity === 'epica' ? 1 : 0)));
    return { sp: sp, lvl: lvl, variant: rollVariant(), unique: null };
  }


  /* ---------------- Variantes, únicos y colecciones ---------------- */
  function rollVariant(egg) {
    var h = new Date(now()).getHours(), r = Math.random(), acc = 0;
    for (var i = 0; i < DC.VARIANT_ORDER.length; i++) {
      var v = DC.VARIANTS[DC.VARIANT_ORDER[i]];
      var c = v.chance * (v.id === 'oro' && h >= 16 ? 1.8 : 1) * (egg ? 3 : 1); /* hora dorada al atardecer */
      acc += c;
      if (r < acc) return v.id;
    }
    return 'normal';
  }
  function uniquesLeft(zoneId) {
    return DC.UNIQUES.filter(function (u) {
      return u.zone === zoneId && !S.uniques[u.id] && availability(DC.SP[u.sp]).ok;
    });
  }
  function noteVariant(spId, variant) {
    var a = albumEntry(spId);
    if (!variant || variant === 'normal') return;
    a.variants[variant] = (a.variants[variant] || 0) + 1;
    if (variant === 'oro') { a.golden++; S.totals.golden++; }
    if (!DC.UNIQUE[variant] && !DC.XMAS_BY[variant]) S.totals.variants = (S.totals.variants || 0) + 1;
  }
  function addPrize(prizeId, source) {
    var pz = DC.PRIZES[prizeId];
    return addCode(pz ? pz.name : prizeId, source, prizeId);
  }
  function captureUnique(uId) {
    var u = DC.UNIQUE[uId];
    if (!u || S.uniques[uId]) return null;
    var c = addPrize('helado', 'Único: ' + u.name);
    S.uniques[uId] = { at: Date.now(), code: c.code };
    save();
    return c;
  }
  /* Premios por completar colecciones. Devuelve los códigos nuevos. */
  function captureXmas(id) {
    if (!DC.XMAS_BY[id] || S.xmas[id]) return 0;
    S.xmas[id] = { at: Date.now() };
    save();
    return addPoints(DC.POINTS.xmas, true);
  }
  /* Suma Dino-puntos respetando el límite diario (bypass para colecciones). Devuelve lo sumado. */
  function addPoints(n, bypass) {
    n = Math.round(n || 0); if (n <= 0) return 0;
    var v = S.visit;
    if (!bypass && v) { var room = Math.max(0, DC.POINTS.daily - (v.points || 0)); n = Math.min(n, room); }
    if (v && !bypass) v.points = (v.points || 0) + n;
    S.points += n; S.pointsTotal += n;
    save();
    return n;
  }
  function pointsToday() { return S.visit ? (S.visit.points || 0) : 0; }
  function checkCollections() {
    var out = [];
    if (DC.SEASON.xmas && DC.XMAS.every(function (x) { return S.xmas[x.id]; }) && S.collectionPrizes.indexOf('xmas') < 0) {
      S.collectionPrizes.push('xmas'); addPoints(DC.POINTS.xmasAll, true); out.push(addPrize('peluche', 'Colección Navidad Jurásica completa'));
    }
    if (caughtCount() >= DC.SPECIES.length && S.collectionPrizes.indexOf('album') < 0) {
      S.collectionPrizes.push('album'); out.push(addPrize('entrada', 'Álbum completo'));
    }
    if (Object.keys(S.uniques).length >= DC.UNIQUES.length && S.collectionPrizes.indexOf('uniques') < 0) {
      S.collectionPrizes.push('uniques'); addPoints(DC.POINTS.uniquesAll, true); out.push(addPrize('peluche_oro', 'Los 8 dinosaurios únicos'));
    }
    if (out.length) save();
    return out;
  }
  function rollUnique(zoneId) {
    var left = uniquesLeft(zoneId);
    if (!left.length || Math.random() > DC.UNIQUE_CHANCE * left.length) return null;
    return left[Math.floor(Math.random() * left.length)];
  }

  /* ---------------- Visitas, pasaporte y misiones ---------------- */
  function newMissions() {
    var pool = DC.MISSION_POOL.slice();
    var out = [];
    while (out.length < 3 && pool.length) {
      var m = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
      if (out.some(function (o) { return o.stat === m.stat; })) continue;
      out.push({ id: m.id, progress: 0, done: false, claimed: false });
    }
    return out;
  }
  function freshVisitStats() {
    return { wins: 0, caps: 0, cap_herb: 0, cap_carn: 0, cap_vol: 0, cap_agua: 0, quiz: 0, zones: 0, excellent: 0, perfect: 0,
      crits: 0, specials: 0, throws: 0, encounters: 0, fichas: 0, losses: 0 };
  }

  /* Llamar al abrir la app. Devuelve eventos para mostrar. */
  function checkVisit() {
    var today = dayKey(now());
    var ev = { newVisit: false, passport: [], hatched: [], visitNo: S.visits };
    if (S.lastDay === today && S.visit) return ev;
    /* Cierra la visita anterior en el historial */
    if (S.visit) archiveVisit();
    S.visits += 1;
    S.lastDay = today;
    S.visitDays.push(today);
    var bonus = Math.min(5, S.visits - 1);
    S.spheres = Math.max(S.spheres, 0) + DC.SPHERES_PER_VISIT + bonus;
    S.visit = { day: today, n: S.visits, zones: [], routeDone: false, missions: newMissions(), stats: freshVisitStats(),
      startedAt: Date.now(), bought: 0, allClaimed: false, points: 0, xmasSeen: 0, places: {}, replicas: {} };
    /* Curación completa al volver */
    S.team.forEach(function (d) { d.hp = stats(d).maxHp; });
    /* Huevos: eclosionan en una visita posterior a la que se obtuvieron */
    var keep = [];
    S.eggs.forEach(function (egg) {
      if (S.visits > egg.laidVisit) {
        var candidates = DC.SPECIES.filter(function (s) { return s.rarity !== 'legendaria' && (!s.minVisits || S.visits >= s.minVisits); });
        var weighted = [];
        candidates.forEach(function (s) {
          var w = s.rarity === 'comun' ? 5 : s.rarity === 'rara' ? 4 : 2;
          if (!(S.album[s.id] && S.album[s.id].caught)) w += 3; /* favorece especies que te faltan */
          for (var i = 0; i < w; i++) weighted.push(s);
        });
        var sp = pick(weighted);
        var inst = makeInst(sp.id, Math.max(3, S.level), Math.random() < 0.25 ? rollVariant(true) : 'normal');
        addToTeam(inst);
        var a = albumEntry(sp.id); a.seen++; a.caught++; noteVariant(sp.id, inst.variant);
        if (!a.first) a.first = Date.now();
        ev.hatched.push(inst);
      } else keep.push(egg);
    });
    S.eggs = keep;
    /* Pasaporte */
    DC.PASSPORT.forEach(function (p) {
      if (S.visits >= p.visit && S.passportClaimed.indexOf(p.visit) < 0) {
        S.passportClaimed.push(p.visit);
        if (p.items.spheres) S.spheres += p.items.spheres;
        if (p.items.coins) S.coins += p.items.coins;
        if (p.items.fern) S.items.fern = (S.items.fern || 0) + p.items.fern;
        if (p.items.super) S.items.super = (S.items.super || 0) + p.items.super;
        if (p.items.ultra) S.items.ultra = (S.items.ultra || 0) + p.items.ultra;
        if (p.prize) addPrize(p.prize, 'Pasaporte · visita ' + p.visit);
        if (p.items.egg) for (var i = 0; i < p.items.egg; i++) S.eggs.push({ id: uid(), laidVisit: S.visits });
        ev.passport.push(p);
      }
    });
    ev.newVisit = true;
    ev.visitNo = S.visits;
    saveNow();
    return ev;
  }

  function archiveVisit() {
    var v = S.visit; if (!v) return;
    S.history.push({
      day: v.day, n: v.n, zones: v.zones.slice(), route: v.routeDone,
      caps: v.stats.caps, wins: v.stats.wins, losses: v.stats.losses, throws: v.stats.throws,
      encounters: v.stats.encounters, fichas: v.stats.fichas, quiz: v.stats.quiz,
      minutes: Math.round(((v.lastAt || v.startedAt) - v.startedAt) / 60000)
    });
    if (S.history.length > 60) S.history.shift();
  }

  function missionDef(id) { return DC.MISSION_POOL.find(function (m) { return m.id === id; }); }

  /* Suma estadística de la visita y avanza misiones. Devuelve misiones completadas ahora. */
  function bump(stat, n) {
    n = n || 1;
    var v = S.visit; if (!v) return [];
    v.lastAt = Date.now();
    v.stats[stat] = (v.stats[stat] || 0) + n;
    var done = [];
    v.missions.forEach(function (m) {
      var d = missionDef(m.id);
      if (!d || m.done || d.stat !== stat) return;
      m.progress = Math.min(d.goal, v.stats[stat]);
      if (m.progress >= d.goal) { m.done = true; done.push(d); }
    });
    save();
    return done;
  }
  function claimMission(id) {
    var m = S.visit.missions.find(function (x) { return x.id === id; });
    if (!m || !m.done || m.claimed) return null;
    var d = missionDef(id);
    m.claimed = true;
    S.coins += d.coins;
    var lv = addXp(d.xp);
    var res = { coins: d.coins, xp: d.xp, levelUps: lv, bonus: false };
    if (!S.visit.allClaimed && S.visit.missions.every(function (x) { return x.claimed; })) {
      S.visit.allClaimed = true;
      S.spheres += 3;
      S.items.super = (S.items.super || 0) + 1;
      res.bonus = true;
    }
    save();
    return res;
  }

  /* XP del explorador. Devuelve niveles ganados. */
  function addXp(x) {
    S.xp += Math.round(x);
    var ups = [];
    while (S.xp >= DC.xpToNext(S.level)) {
      S.xp -= DC.xpToNext(S.level);
      S.level++;
      S.coins += 50;
      S.spheres += 2;
      S.items.super = (S.items.super || 0) + 1;
      ups.push(S.level);
    }
    save();
    return ups;
  }
  function addDinoXp(inst, x) {
    inst.xp += Math.round(x);
    var ups = 0;
    while (inst.lvl < 40 && inst.xp >= DC.dinoXpToNext(inst.lvl)) {
      var before = stats(inst).maxHp;
      inst.xp -= DC.dinoXpToNext(inst.lvl);
      inst.lvl++;
      inst.hp += stats(inst).maxHp - before;
      ups++;
    }
    save();
    return ups;
  }

  function markZone(zoneId) {
    var v = S.visit; if (!v) return { first: false, route: false };
    var first = v.zones.indexOf(zoneId) < 0;
    if (first) { v.zones.push(zoneId); bump('zones'); }
    var route = false;
    if (!v.routeDone && v.zones.length >= DC.ZONES.length) {
      v.routeDone = true; route = true;
      S.totals.routes++;
      S.coins += 150;
      addPrize('canchita', 'Ruta del tesoro · ' + v.day);
      addPoints(DC.POINTS.route);
    }
    save();
    return { first: first, route: route };
  }

  /* ---------------- Códigos canjeables ---------------- */
  var ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  function checksum(body) {
    var s = 7;
    for (var i = 0; i < body.length; i++) s = (s * 31 + ALPHA.indexOf(body[i]) + 1) % 997;
    return ALPHA[s % ALPHA.length];
  }
  function makeCode() {
    var b = '';
    for (var i = 0; i < 7; i++) b += ALPHA[Math.floor(Math.random() * ALPHA.length)];
    var c = b + checksum(b);
    return 'DC-' + c.slice(0, 4) + '-' + c.slice(4);
  }
  function validCode(code) {
    var c = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (c.indexOf('DC') === 0) c = c.slice(2);
    if (c.length !== 8) return false;
    return checksum(c.slice(0, 7)) === c[7];
  }
  function addCode(label, source, prize) {
    var c = { code: makeCode(), label: label, source: source, prize: prize || null, created: Date.now(), redeemed: false };
    S.codes.unshift(c);
    save();
    return c;
  }

  /* Medallas nuevas */
  function checkMedals() {
    var got = [];
    DC.MEDALS.forEach(function (m) {
      if (S.medals.indexOf(m.id) < 0 && m.test(S)) { S.medals.push(m.id); got.push(m); }
    });
    if (got.length) save();
    return got;
  }

  function reset() {
    S = fresh();
    saveNow();
  }

  DC.Store = {
    load: load, save: save, saveNow: saveNow, get: function () { return S; }, reset: reset,
    now: now, dayKey: dayKey, uid: uid,
    stats: stats, makeInst: makeInst, addToTeam: addToTeam, partner: partner, healthyTeam: healthyTeam, tickHeal: tickHeal,
    albumEntry: albumEntry, caughtCount: caughtCount, caughtTypes: caughtTypes,
    availability: availability, rollEncounter: rollEncounter,
    checkVisit: checkVisit, bump: bump, claimMission: claimMission, missionDef: missionDef,
    addXp: addXp, addDinoXp: addDinoXp, markZone: markZone,
    addCode: addCode, validCode: validCode, checkMedals: checkMedals,
    addPrize: addPrize, captureUnique: captureUnique, captureXmas: captureXmas, addPoints: addPoints, pointsToday: pointsToday, checkCollections: checkCollections, noteVariant: noteVariant,
    rollVariant: rollVariant, uniquesLeft: uniquesLeft
  };
})();
