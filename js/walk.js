/* =====================================================================
   DinoCaza AR · walk.js
   Pantalla principal: tu avatar camina por el parque (GPS en el parque,
   joystick/teclado en la PC). Los dinosaurios salvajes viven dentro de
   los hábitats: pastan, caminan, se dan vuelta y rugen si te acercas.
   También dibuja el mapa del menú con la misma escena vista desde arriba.
   ===================================================================== */
(function () {
  var T = THREE;
  var W = { open: false };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var S = function () { return DC.Store.get(); };
  var renderer, scene, cam, mapCam, composer = null, renderPass = null, bloom = null, clock = new T.Clock(), raf = null, built = false;
  var avatar, av = { x: 0, z: 104, dir: Math.PI, speed: 0, tx: null, tz: null };
  var camYaw = 0, camPitch = 0.56, camDist = 17;
  var keys = {}, joy = { x: 0, y: 0, on: false, mag: 0 };
  var dinos = [], replicas3d = [], spawnT = 0.3, labelEls = [];
  var gps = { on: false, watch: null, origin: null, last: null, err: null };
  var near = null, nearKey = '', world = null, guide = null, snow = null, blobTex = null;
  var WALK = 7.5, RUN = 13;
  function rnd() { return Math.random(); }

  /* ---------------- Sombra suave para dinosaurios y avatar ---------------- */
  function blob(r) {
    if (!blobTex) {
      var c = document.createElement('canvas'); c.width = c.height = 64; var g = c.getContext('2d');
      var gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,0.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      blobTex = new T.CanvasTexture(c);
    }
    var m = new T.Mesh(new T.PlaneGeometry(r * 2, r * 2), new T.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.06; m.renderOrder = 1; return m;
  }

  /* ---------------- Avatar ---------------- */
  function buildAvatar() {
    var g = new T.Group();
    var body = DC.Avatar.build(S().avatar || {});
    body.traverse(function (m) { if (m.isMesh && !m.userData.outline) m.castShadow = true; });
    g.add(body);
    g.add(blob(0.9));
    var ring = new T.Mesh(new T.RingGeometry(5.6, 5.85, 64), new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.28, depthWrite: false, side: T.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.07; g.add(ring);
    var pulse = new T.Mesh(new T.RingGeometry(0.9, 1.1, 48), new T.MeshBasicMaterial({ color: '#ffc93c', transparent: true, opacity: 0.6, depthWrite: false, side: T.DoubleSide }));
    pulse.rotation.x = -Math.PI / 2; pulse.position.y = 0.08; g.add(pulse);
    g.userData = { body: body, pulse: pulse };
    return g;
  }
  W.buildAvatar = function (a, preview) { return DC.Avatar.build(a, preview); };
  W.rebuildAvatar = function () {
    if (!built) return;
    var p = avatar.position.clone(), r = avatar.rotation.y;
    scene.remove(avatar); avatar = buildAvatar(); avatar.position.copy(p); avatar.rotation.y = r; scene.add(avatar);
  };

  /* ---------------- Nieve alrededor de la cámara ---------------- */
  function buildSnow() {
    var n = S().settings.lite ? 350 : 900, pos = new Float32Array(n * 3), sp = new Float32Array(n);
    for (var i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 70; pos[i * 3 + 1] = Math.random() * 30; pos[i * 3 + 2] = (Math.random() - 0.5) * 70; sp[i] = 1.2 + Math.random() * 1.6; }
    var geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    var c = document.createElement('canvas'); c.width = c.height = 32; var g = c.getContext('2d');
    var gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
    snow = new T.Points(geo, new T.PointsMaterial({ size: 0.3, map: new T.CanvasTexture(c), transparent: true, depthWrite: false, opacity: 0.85 }));
    snow.userData.sp = sp; snow.frustumCulled = false; scene.add(snow);
  }
  function updateSnow(dt, t) {
    if (!snow) return;
    var p = snow.geometry.attributes.position.array, sp = snow.userData.sp;
    for (var i = 0; i < sp.length; i++) { p[i * 3 + 1] -= sp[i] * dt; p[i * 3] += Math.sin(t + i) * dt * 0.3; if (p[i * 3 + 1] < 0) p[i * 3 + 1] += 30; }
    snow.geometry.attributes.position.needsUpdate = true;
    snow.position.set(av.x, 0, av.z);
  }

  /* ---------------- Escena ---------------- */
  function build() {
    built = true;
    var lite = !!S().settings.lite;
    renderer = new T.WebGLRenderer({ antialias: !lite, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lite ? 1 : 1.75));
    renderer.shadowMap.enabled = !lite;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.domElement.className = 'walk-canvas';
    scene = new T.Scene();
    scene.background = new T.Color('#d6ebf8');
    scene.fog = new T.Fog('#d6ebf8', 90, 420);
    cam = new T.PerspectiveCamera(60, 1, 0.1, 1400);
    mapCam = new T.PerspectiveCamera(40, 1, 1, 2000);
    scene.add(new T.HemisphereLight('#eaf5ff', '#6f8f50', 0.78));
    var sun = new T.DirectionalLight('#fff0d4', 1.0);
    sun.castShadow = true; sun.shadow.mapSize.set(lite ? 1024 : 2048, lite ? 1024 : 2048);
    var sc = sun.shadow.camera; sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45; sc.near = 1; sc.far = 160;
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
    scene.add(sun); scene.add(sun.target); W.sun = sun;
    var fill = new T.DirectionalLight('#b9d4ff', 0.28); fill.position.set(-40, 30, -30); scene.add(fill);
    world = DC.World.build(scene, { lite: lite });
    W.sunDir = world.sun;
    /* pedestales de las réplicas */
    DC.REPLICAS.forEach(function (r) {
      var g = new T.Group(); g.position.set(r.x, 0, r.z); scene.add(g);
      var ped = new T.Mesh(new T.CylinderGeometry(3, 3.4, 1, 10), new T.MeshStandardMaterial({ color: '#e9dfc7', roughness: 0.9, flatShading: true })); ped.position.y = 0.5; ped.castShadow = ped.receiveShadow = true; g.add(ped);
      var plq = new T.Mesh(new T.BoxGeometry(2, 0.6, 0.1), new T.MeshStandardMaterial({ color: '#b08a3a', metalness: 0.6, roughness: 0.35 })); plq.position.set(0, 0.55, 3.25); plq.rotation.x = -0.2; g.add(plq);
      var beam = new T.Mesh(new T.CylinderGeometry(2.6, 2.6, 30, 24, 1, true), new T.MeshBasicMaterial({ color: '#ffd45a', transparent: true, opacity: 0.12, side: T.DoubleSide, depthWrite: false }));
      beam.position.y = 15; g.add(beam);
      var halo = new T.Mesh(new T.TorusGeometry(3.3, 0.12, 8, 48), new T.MeshBasicMaterial({ color: '#ffc93c' })); halo.rotation.x = Math.PI / 2; halo.position.y = 1.1; g.add(halo);
      replicas3d.push({ r: r, g: g, halo: halo, actor: null });
    });
    avatar = buildAvatar(); scene.add(avatar);
    buildSnow();
    var ash = new T.Shape(); ash.moveTo(0, 1.2); ash.lineTo(0.7, 0.2); ash.lineTo(0.25, 0.2); ash.lineTo(0.25, -0.6); ash.lineTo(-0.25, -0.6); ash.lineTo(-0.25, 0.2); ash.lineTo(-0.7, 0.2); ash.closePath();
    guide = new T.Mesh(new T.ShapeGeometry(ash), new T.MeshBasicMaterial({ color: '#ffc93c', transparent: true, opacity: 0.9, depthWrite: false, side: T.DoubleSide }));
    guide.rotation.order = 'YXZ'; scene.add(guide);
    placeReplicaActors();
    bindInput();
    /* Brillo (bloom) para luces navideñas, lava y faroles */
    if (false && !lite && T.EffectComposer && T.UnrealBloomPass) { /* desactivado: el sol sobre la nieve se ve lavado */
      try {
        composer = new T.EffectComposer(renderer);
        renderPass = new T.RenderPass(scene, cam); composer.addPass(renderPass);
        bloom = new T.UnrealBloomPass(new T.Vector2(256, 256), 0.55, 0.45, 0.86); composer.addPass(bloom);
      } catch (e) { composer = null; }
    }
  }
  /* Réplicas: estatuas de piedra pulida sobre pedestal */
  function statue(a) {
    var stone = new T.Color('#b9ad99');
    a.root.traverse(function (m) {
      if (!m.isMesh || m.userData.outline) return;
      var list = Array.isArray(m.material) ? m.material : [m.material];
      list.forEach(function (mt) { if (mt.color) mt.color.lerp(stone, 0.82); if (mt.map) mt.map = null; mt.roughness = 0.95; mt.metalness = 0.0; if (mt.emissive) mt.emissive.set('#000000'); mt.needsUpdate = true; });
      m.castShadow = true;
    });
  }
  function placeReplicaActors() {
    replicas3d.forEach(function (o) {
      if (o.actor) { o.g.remove(o.actor.root); o.actor.dispose(); }
      var sp = DC.SP[o.r.sp];
      var a = new DC.Models.Actor(sp);
      a.root.scale.setScalar(sp.id === 'trex' ? 2.5 : sp.id === 'spinosaurus' ? 2.3 : 2.1);
      a.root.position.y = 1.0;
      a.root.rotation.y = Math.atan2(-o.r.x, -o.r.z);
      for (var i = 0; i < 6; i++) a.update(0.12);
      statue(a);
      o.g.add(a.root); o.actor = a;
    });
  }
  W.modelsChanged = function () { if (built) { placeReplicaActors(); dinos.forEach(function (d) { if (!d.xmas) d.dead = true; }); } };

  /* ---------------- Dinosaurios salvajes con comportamiento ---------------- */
  function zoneAt(x, z) {
    var best = null, bd = 1e9;
    Object.keys(DC.PARK.zones).forEach(function (k) { var q = DC.PARK.zones[k], d = Math.hypot(q.x - x, q.z - z); if (d < bd) { bd = d; best = +k; } });
    return { id: best, d: bd, inside: bd < DC.PARK.zones[best].r + 6 };
  }
  function inLake(x, z, pad) { return DC.World.lakes().some(function (l) { return Math.hypot(l.x - x, l.z - z) < l.r + (pad || 1.5); }); }
  function freeSpot(x, z) { return !inLake(x, z) && !DC.REPLICAS.some(function (r) { return Math.hypot(r.x - x, r.z - z) < 7; }); }
  function pickTarget(dn) {
    var Z = DC.PARK.zones[dn.zone];
    for (var i = 0; i < 10; i++) {
      var a = rnd() * 6.28, r = Math.sqrt(rnd()) * Z.r * 0.85, x = Z.x + Math.cos(a) * r, z = Z.z + Math.sin(a) * r;
      if (freeSpot(x, z)) { dn.tx = x; dn.tz = z; return; }
    }
    dn.tx = Z.x; dn.tz = Z.z;
  }
  function spawnDino() {
    var zn = zoneAt(av.x, av.z), Z = DC.PARK.zones[zn.id];
    if (zn.d > Z.r + 14) return;
    if (dinos.filter(function (d) { return d.zone === zn.id; }).length >= 4) return;
    var x, z, ok = false;
    for (var tr = 0; tr < 10 && !ok; tr++) {
      var a = rnd() * 6.28, r = Math.sqrt(rnd()) * Z.r * 0.9;
      x = Z.x + Math.cos(a) * r; z = Z.z + Math.sin(a) * r;
      ok = Math.hypot(x - av.x, z - av.z) > 6 && freeSpot(x, z);
    }
    if (!ok) return;
    var roll = DC.Store.rollEncounter(zn.id);
    var actor = new DC.Models.Actor(roll.sp, { variant: roll.variant });
    var sc = roll.sp.id === 'brachiosaurus' ? 1.25 : roll.sp.rarity === 'legendaria' ? 1.7 : 1.4;
    actor.root.scale.setScalar(sc);
    actor.root.position.set(x, 0, z);
    actor.root.rotation.y = rnd() * 6.28;
    actor.root.traverse(function (m) { if (m.isMesh) m.castShadow = true; });
    scene.add(actor.root);
    var lk = DC.look(roll.variant), xm = roll.xmas || null;
    var mark = new T.Mesh(new T.RingGeometry(1.7, 2.05, 40), new T.MeshBasicMaterial({ color: xm ? '#d62839' : lk ? lk.chip : DC.RARITY[roll.sp.rarity].color, transparent: true, opacity: 0.8, side: T.DoubleSide, depthWrite: false }));
    mark.rotation.x = -Math.PI / 2; mark.position.set(x, 0.08, z); scene.add(mark);
    var sh = blob(Math.max(1.4, actor.radius * sc * 1.1)); sh.position.set(x, 0.06, z); scene.add(sh);
    var hit = new T.Mesh(new T.SphereGeometry(2.6, 8, 6), new T.MeshBasicMaterial({ visible: false })); hit.position.set(x, 1.3, z); scene.add(hit);
    var dn = { actor: actor, mark: mark, sh: sh, hit: hit, roll: roll, zone: zn.id, born: clock.elapsedTime, look: lk, xmas: xm,
      mode: 'idle', timer: 1 + rnd() * 2, tx: x, tz: z, dust: 0, alertCd: 0 };
    hit.userData.dino = dn;
    actor.play('spawn');
    DC.FX.burst(new T.Vector3(x, 0.5, z), { color: xm ? '#ffffff' : lk ? lk.aura : '#c9a77a', count: 22, speed: 2.4, up: true, size: 0.4, additive: !!(lk || xm), gravity: -3 });
    if (xm) DC.UI.toast('¡Un especial navideño apareció en ' + DC.UI.esc(DC.ZONES[zn.id - 1].short) + '!', 'star');
    dinos.push(dn);
  }
  function removeDino(dn) {
    [dn.actor.root, dn.mark, dn.hit, dn.sh].forEach(function (o) { scene.remove(o); });
    dn.actor.dispose(); dn.mark.geometry.dispose(); dn.mark.material.dispose();
    dinos = dinos.filter(function (x) { return x !== dn; });
  }
  function turnTo(a, target, dt, rate) {
    var d = target - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    return a + d * Math.min(1, dt * rate);
  }
  function updateDino(dn, dt, t) {
    var A = dn.actor, p = A.root.position, far = Math.hypot(p.x - av.x, p.z - av.z);
    dn.timer -= dt; dn.alertCd -= dt;
    /* Se fija en ti y ruge cuando te acercas */
    if (far < 10 && dn.alertCd <= 0 && dn.mode !== 'alert' && !A.action) { dn.mode = 'alert'; dn.timer = 2.4; dn.alertCd = 25; dn.roared = false; }
    if (dn.mode === 'alert') {
      A.walk = 0;
      A.root.rotation.y = turnTo(A.root.rotation.y, Math.atan2(av.x - p.x, av.z - p.z), dt, 4);
      if (!dn.roared && dn.timer < 1.9) { dn.roared = true; A.play('roar'); if (far < 14) { DC.Audio.play('roar'); } }
      if (dn.timer <= 0) { dn.mode = 'idle'; dn.timer = 2 + rnd() * 3; }
    } else if (dn.mode === 'idle') {
      A.walk = 0;
      if (dn.timer <= 0) { pickTarget(dn); dn.mode = 'walk'; dn.timer = 12; }
    } else if (dn.mode === 'walk') {
      var dx = dn.tx - p.x, dz = dn.tz - p.z, dd = Math.hypot(dx, dz);
      var want = Math.atan2(dx, dz);
      A.root.rotation.y = turnTo(A.root.rotation.y, want, dt, 2.2);
      var facing = Math.cos(A.root.rotation.y - want);
      var sp = 1.7 * Math.max(0, facing);
      A.walk = facing > 0.3 ? 1 : 0.4;
      p.x += Math.sin(A.root.rotation.y) * sp * dt; p.z += Math.cos(A.root.rotation.y) * sp * dt;
      dn.dust -= dt;
      if (dn.dust <= 0) { dn.dust = 0.45; DC.FX.burst(new T.Vector3(p.x, 0.15, p.z), { color: '#d9c7a2', count: 3, speed: 0.6, up: true, size: 0.35, gravity: -0.5, life: 0.7 }); }
      if (dd < 0.8 || dn.timer <= 0) { dn.mode = 'idle'; dn.timer = 2 + rnd() * 4; }
    }
    dn.mark.position.set(p.x, 0.08, p.z); dn.sh.position.set(p.x, 0.06, p.z); dn.hit.position.set(p.x, 1.3, p.z);
    dn.mark.rotation.z += dt * 0.8;
    dn.mark.material.opacity = 0.55 + Math.sin(t * 3 + dn.born) * 0.25;
    if ((dn.look || dn.xmas) && Math.random() < dt * 4) DC.FX.burst(new T.Vector3(p.x + (Math.random() - 0.5) * 2, 0.5 + Math.random() * 2, p.z + (Math.random() - 0.5) * 2), { tex: 'star', color: dn.xmas ? '#ffffff' : dn.look.aura, count: 1, speed: 0.3, size: 0.25, gravity: 0.5, life: 0.8 });
    A.update(dt);
  }

  /* ---------------- Entrada: arrastrar para girar, rueda/pellizco para zoom, tocar para caminar ---------------- */
  var ray = new T.Raycaster();
  function bindInput() {
    var c = renderer.domElement, down = null, pts = {}, pinch = null;
    c.addEventListener('pointerdown', function (e) {
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(pts);
      if (ids.length === 2) { var a = pts[ids[0]], b = pts[ids[1]]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), dist: mapS.on ? mapS.tdist : camDist }; down = null; return; }
      down = { x: e.clientX, y: e.clientY, yaw: mapS.on ? mapS.yaw : camYaw, pitch: camPitch, moved: 0, cx: mapS.tcx, cz: mapS.tcz };
      c.setPointerCapture && c.setPointerCapture(e.pointerId);
    });
    c.addEventListener('pointermove', function (e) {
      if (pts[e.pointerId]) pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (pinch) { var ids = Object.keys(pts); if (ids.length === 2) { var a = pts[ids[0]], b = pts[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y); var nd = pinch.dist * pinch.d / Math.max(20, d); if (mapS.on) mapS.tdist = Math.max(60, Math.min(340, nd)); else camDist = Math.max(10, Math.min(34, nd)); } return; }
      if (!down) return;
      var dx = e.clientX - down.x, dy = e.clientY - down.y; down.moved = Math.max(down.moved, Math.abs(dx) + Math.abs(dy));
      if (down.moved > 6) {
        if (mapS.on) {
          /* en el mapa: arrastrar = desplazar */
          var k = mapS.dist / 420, cs = Math.cos(mapS.yaw), sn = Math.sin(mapS.yaw);
          mapS.tcx = down.cx - (dx * cs + dy * sn) * k; mapS.tcz = down.cz - (-dx * sn + dy * cs) * k;
          var rr0 = Math.hypot(mapS.tcx, mapS.tcz); if (rr0 > 130) { mapS.tcx *= 130 / rr0; mapS.tcz *= 130 / rr0; }
        } else { camYaw = down.yaw - dx * 0.006; camPitch = Math.max(0.32, Math.min(1.2, down.pitch + dy * 0.004)); }
      }
    });
    function up(e) { delete pts[e.pointerId]; if (Object.keys(pts).length < 2) pinch = null; if (down && down.moved < 8 && !mapS.on) tap(e); down = null; }
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
    c.addEventListener('wheel', function (e) { e.preventDefault(); if (mapS.on) mapS.tdist = Math.max(60, Math.min(340, mapS.tdist + e.deltaY * 0.25)); else camDist = Math.max(10, Math.min(34, camDist + e.deltaY * 0.02)); }, { passive: false });
    window.addEventListener('keydown', function (e) { if (W.open && !W.paused) keys[e.key.toLowerCase()] = true; });
    window.addEventListener('keyup', function (e) { keys[e.key.toLowerCase()] = false; });
  }
  function tap(e) {
    var r = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(new T.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1), cam);
    var hits = ray.intersectObjects(dinos.map(function (d) { return d.hit; }), false);
    if (hits.length) { var dn = hits[0].object.userData.dino; DC.Audio.play('tap'); if (Math.hypot(dn.actor.root.position.x - av.x, dn.actor.root.position.z - av.z) < 16) { engageDino(dn); return; } av.tx = dn.actor.root.position.x; av.tz = dn.actor.root.position.z; return; }
    var pt = ray.ray.intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), 0), new T.Vector3());
    if (pt && !gps.on && Math.hypot(pt.x, pt.z) < DC.PARK.radius) { av.tx = pt.x; av.tz = pt.z; DC.FX.ring(new T.Vector3(pt.x, 0.1, pt.z), { color: '#ffc93c', from: 0.3, to: 1.6, life: 0.5 }); }
  }
  function bindJoystick(el) {
    var knob = el.querySelector('.joy-knob'), base = null;
    function set(e) {
      var r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width / 2 - 18;
      var dx = e.clientX - cx, dy = e.clientY - cy, d = Math.hypot(dx, dy);
      if (d > R) { dx *= R / d; dy *= R / d; }
      knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      joy.x = dx / R; joy.y = dy / R; joy.on = true; av.tx = null;
    }
    el.addEventListener('pointerdown', function (e) { el.setPointerCapture(e.pointerId); set(e); base = true; });
    el.addEventListener('pointermove', function (e) { if (base) set(e); });
    function end() { base = null; joy.on = false; joy.x = joy.y = 0; knob.style.transform = ''; }
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  }

  /* ---------------- GPS ---------------- */
  function toWorld(lat, lon) {
    var o = gps.origin, mx = (lon - o.lon) * Math.cos(o.lat * Math.PI / 180) * 111320, mz = -(lat - o.lat) * 110540;
    return { x: DC.PARK.entrance.x + mx / DC.PARK.unit, z: DC.PARK.entrance.z + mz / DC.PARK.unit };
  }
  function startGPS() {
    if (!navigator.geolocation) { DC.UI.toast('Este dispositivo no tiene GPS disponible', 'map'); return; }
    gps.watch = navigator.geolocation.watchPosition(function (p) {
      var c = p.coords;
      if (!gps.origin) { gps.origin = { lat: c.latitude, lon: c.longitude }; try { localStorage.setItem('dinocaza_gps_origin', JSON.stringify(gps.origin)); } catch (e) {} DC.UI.toast('GPS calibrado: estás en la entrada del parque', 'map'); }
      var w = toWorld(c.latitude, c.longitude);
      av.tx = w.x; av.tz = w.z; gps.last = c; gps.on = true; hudMode();
    }, function (err) { gps.err = err.message; gps.on = false; hudMode(); DC.UI.toast('No se pudo usar el GPS. Camina con el joystick.', 'map'); },
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 });
  }
  function stopGPS() { if (gps.watch !== null && navigator.geolocation) navigator.geolocation.clearWatch(gps.watch); gps.watch = null; gps.on = false; hudMode(); }
  W.calibrate = function () { gps.origin = null; try { localStorage.removeItem('dinocaza_gps_origin'); } catch (e) {} if (!gps.watch) startGPS(); };
  W._tp = function (x, z) { av.x = x; av.z = z; av.tx = null; };
  W.walkTo = function (zoneId) { var q = DC.PARK.zones[zoneId]; if (q && !gps.on) { av.tx = q.x; av.tz = q.z; } };
  W.forceSpawn = function (xmasId) { DC.forceXmas = xmasId || null; spawnDino(); };
  W._engageFirst = function () { if (dinos[0]) engageDino(dinos[0]); };
  W._state = function () { return { av: av, dinos: dinos.length, near: nearKey, list: dinos.map(function (d) { var p = d.actor.root.position; return [d.roll.sp.id, +p.x.toFixed(1), +p.z.toFixed(1), d.mode]; }) }; };
  W.camera = function (yaw, pitch, dist) { camYaw = yaw; camPitch = pitch; camDist = dist; };

  /* ---------------- HUD ---------------- */
  function hud() {
    var el = $('#walk'), I = DC.UI.icon;
    el.innerHTML = '<div class="walk-host"></div><div class="walk-labels"></div>' +
      '<div class="w-top"><button class="w-prof" data-w="menu" data-tab="team" id="wprof" aria-label="Mi perfil"></button>' +
      '<div class="w-stats" id="walkres"></div></div>' +
      '<div class="where" id="where"></div>' +
      '<div class="zbanner" id="zbanner" aria-live="polite"></div>' +
      '<div class="near-card" id="nearcard" hidden></div>' +
      '<div class="joy" id="joy"><div class="joy-knob"></div></div>' +
      '<div class="w-acts"><button class="w-btn" data-w="gps" id="gpsbtn" aria-label="Caminar con GPS">' + I('pin') + '</button>' +
      '<button class="w-btn" data-w="map" aria-label="Ver mapa">' + I('map') + '</button>' +
      '<button class="w-btn main" data-w="menu" aria-label="Menú">' + I('grid') + '</button></div>';
    el.querySelector('.walk-host').appendChild(renderer.domElement);
    bindJoystick($('#joy'));
    hudMode(); hudRes();
  }
  function hudMode() {
    var b = $('#gpsbtn'), j = $('#joy');
    if (b) b.classList.toggle('on', gps.on);
    if (j) j.hidden = gps.on;
  }
  function hudRes() {
    var s = S(), el = $('#walkres'), pf = $('#wprof'); if (!el) return;
    var need = DC.xpToNext(s.level);
    if (pf) pf.innerHTML = '<span class="w-av" style="--sh:' + ((s.avatar && s.avatar.shirt) || '#2fb36b') + '">' + DC.UI.esc((s.name || 'E')[0].toUpperCase()) + '<b class="num">' + s.level + '</b></span><span class="w-name"><b>' + DC.UI.esc(s.name || 'Explorador') + '</b><i><u style="width:' + DC.UI.pct(s.xp, need) + '%"></u></i></span>';
    el.innerHTML = '<span class="w-pill" title="Dino-puntos"><i class="pt-ico">★</i><b class="num">' + s.points + '</b></span>' +
      '<span class="w-pill" title="Esferas"><i class="ball-ico dino"></i><b class="num">' + ((s.spheres || 0) + (s.items.super || 0) + (s.items.ultra || 0)) + '</b></span>';
  }
  W.hudRes = hudRes;
  /* Próximo hábitat sin visitar hoy (o el más cercano) */
  function nextTarget() {
    var v = S().visit || { zones: [] }, best = null, bd = 1e9;
    Object.keys(DC.PARK.zones).forEach(function (k) {
      if (v.zones.indexOf(+k) >= 0) return;
      var q = DC.PARK.zones[k], d = Math.hypot(q.x - av.x, q.z - av.z);
      if (d < bd) { bd = d; best = +k; }
    });
    return best ? { id: best, d: bd } : null;
  }
  var lastZone = null;
  function updateWhere() {
    var wh = $('#where'); if (!wh) return;
    var zn = zoneAt(av.x, av.z), Z = DC.PARK.zones[zn.id], inside = zn.d < Z.r + 1;
    var s = S();
    if (inside && lastZone !== zn.id) {
      lastZone = zn.id;
      var z = DC.ZONES[zn.id - 1];
      var bn = $('#zbanner');
      if (bn) { bn.innerHTML = '<small>Hábitat ' + z.id + ' de ' + DC.ZONES.length + '</small>' + DC.UI.esc(z.name); bn.classList.remove('show'); void bn.offsetWidth; bn.classList.add('show'); }
      DC.Audio.play('appear');
      if (s.visit && s.visit.zones.indexOf(zn.id) < 0) {
        var res = DC.Store.markZone(zn.id);
        if (res.route) setTimeout(function () { DC.UI.toast('¡Recorriste todos los hábitats! Canchita gratis en Premios', 'gift'); hudRes(); }, 1800);
      }
    } else if (!inside && zn.d > Z.r + 4) lastZone = null;
    var nt = nextTarget();
    if (inside) wh.innerHTML = '<b>' + DC.UI.esc(DC.ZONES[zn.id - 1].short) + '</b><span>Busca dinosaurios aquí</span>';
    else if (nt) wh.innerHTML = '<span>Siguiente hábitat</span><b>' + DC.UI.esc(DC.ZONES[nt.id - 1].short) + ' · ' + Math.round(nt.d * DC.PARK.unit) + ' m</b>';
    else wh.innerHTML = '<b>Ruta completa</b><span>Sigue explorando los hábitats</span>';
    W._guide = inside ? null : nt;
  }

  /* Tarjeta de lo más cercano: dinosaurio, réplica o lugar */
  function updateNear() {
    var best = null, bd = 1e9;
    dinos.forEach(function (d) { var x = Math.hypot(d.actor.root.position.x - av.x, d.actor.root.position.z - av.z); if (x < 6 && x < bd) { bd = x; best = { t: 'dino', o: d }; } });
    if (!best) replicas3d.forEach(function (o) { var x = Math.hypot(o.r.x - av.x, o.r.z - av.z); if (x < 8 && x < bd) { bd = x; best = { t: 'rep', o: o }; } });
    if (!best) DC.PLACES.forEach(function (p) { var x = Math.hypot(p.x - av.x, p.z - av.z); if (x < (p.kind === 'stand' ? 5 : 8) && x < bd) { bd = x; best = { t: 'place', o: p }; } });
    var key = best ? best.t + (best.o.p ? best.o.p.id : best.o.id || best.o.r && best.o.r.id || '') + (best.t === 'dino' ? dinos.indexOf(best.o) + best.o.roll.sp.id : '') : '';
    if (key === nearKey) return;
    nearKey = key; near = best;
    var card = $('#nearcard'); if (!card) return;
    if (!best) { card.hidden = true; return; }
    card.hidden = false;
    var s = S(), U = DC.UI;
    if (best.t === 'dino') {
      var r = best.o.roll, lk = DC.look(r.variant), xm = r.xmas, nm = xm ? xm.name : r.unique ? r.unique.name : r.sp.name;
      card.className = 'near-card dino' + (xm ? ' xmas' : '');
      card.innerHTML = '<div class="nc-img">' + U.img(r.sp.id, '', nm, r.variant) + '</div><div class="nc-body"><div class="eyebrow">' + (xm ? '¡Especial navideño!' : r.unique ? '¡Dinosaurio único!' : lk ? 'Variante ' + U.esc(lk.name) : 'Dinosaurio salvaje') + '</div><b>' + U.esc(nm) + '</b><small>' + U.typeChip(r.sp.type) + ' Nv. ' + r.lvl + ' ' + U.stars(r.sp.rarity) + '</small></div>' +
        '<button class="btn sun" data-w="engage">' + U.icon('camera') + 'Atrapar</button>';
      DC.Audio.play('warn'); DC.Audio.vibe(40);
    } else if (best.t === 'rep') {
      var R = best.o.r, beaten = s.visit && s.visit.replicas && s.visit.replicas[R.id];
      card.className = 'near-card rep';
      card.innerHTML = '<div class="nc-img">' + U.img(R.sp, '', R.name) + '</div><div class="nc-body"><div class="eyebrow">Réplica real · Jefe del parque</div><b>' + U.esc(R.name) + '</b><small>' + U.esc(beaten ? 'Ya lo venciste en esta visita. Vuelve otro día.' : R.desc + ' Escanéala con la cámara para desafiarla.') + '</small></div>' +
        (beaten ? '' : '<button class="btn sun" data-w="scanrep">' + U.icon('target') + 'Escanear</button>');
    } else {
      var p = best.o, code = p.prize ? s.codes.find(function (c) { return c.prize === p.prize && !c.redeemed; }) : null;
      var visited = s.visit && s.visit.places && s.visit.places[p.id];
      card.className = 'near-card place';
      card.innerHTML = '<div class="nc-art">' + U.prizeArt(p.prize || ({ comida: 'canchita', juguera: 'helado', parrillas: 'canchita', vr: 'juego' }[p.id]) || 'sticker') + '</div><div class="nc-body"><div class="eyebrow">' + (visited ? 'Lugar del parque' : 'Nuevo lugar · +15 monedas') + '</div><b>' + U.esc(p.name) + '</b><small>' + U.esc(p.desc) + '</small></div>' +
        (code ? '<button class="btn pink" data-w="code" data-code="' + code.code + '">' + U.icon('qr') + 'Canjear aquí</button>' : '');
      if (!visited && s.visit) {
        s.visit.places = s.visit.places || {}; s.visit.places[p.id] = 1; s.coins += 15; DC.Store.save(); hudRes();
        DC.Audio.play('coin');
      }
    }
    DC.UI.fillPortraits(card);
  }

  /* Etiquetas flotantes de lugares y réplicas */
  function buildLabels() {
    var host = $('.walk-labels'); if (!host) return;
    host.innerHTML = '';
    labelEls = [];
    DC.REPLICAS.forEach(function (r) { var e = document.createElement('div'); e.className = 'wlabel rep'; e.innerHTML = '★ ' + DC.UI.esc(r.name); host.appendChild(e); labelEls.push({ el: e, x: r.x, z: r.z, y: 9 }); });
  }

  /* ---------------- Interacciones ---------------- */
  function engageDino(dn) {
    var roll = dn.roll, zone = dn.zone;
    removeDino(dn); nearKey = '';
    W.pause();
    DC.Encounter.start(zone, { roll: roll, returnTo: 'walk' });
  }
  function onHud(e) {
    var b = e.target.closest('[data-w]'); if (!b) return;
    DC.Audio.unlock();
    var w = b.dataset.w;
    if (w === 'menu') DC.UI.openMenu(b.dataset.tab || 'album');
    else if (w === 'map') DC.UI.openMenu('map');
    else if (w === 'gps') { if (gps.on || gps.watch !== null) stopGPS(); else startGPS(); }
    else if (w === 'north') { camYaw = 0; }
    else if (w === 'engage' && near && near.t === 'dino') engageDino(near.o);
    else if (w === 'scanrep' && near && near.t === 'rep') {
      var R = near.o.r;
      W.pause();
      DC.Vision.scanReplica(R, function (ok) {
        if (!ok) { W.resume(); return; }
        var s = S(), pr = DC.Store.partner();
        var lvl = Math.max(S().level, pr ? pr.lvl : 1) + 3;
        DC.Encounter.start(R.zone, { roll: { sp: DC.SP[R.sp], lvl: lvl, variant: 'normal', unique: null }, boss: R, returnTo: 'walk' });
      });
    } else if (w === 'code') { var c = S().codes.find(function (x) { return x.code === b.dataset.code; }); DC.UI.prizeModal(c, null, 'Muestra este código aquí'); }
  }

  /* ---------------- Mapa del menú: la misma escena vista desde arriba ---------------- */
  var mapS = { on: false, el: null, pins: null, yaw: 0, tyaw: 0, dist: 300, tdist: 300, cx: 0, cz: 10, tcx: 0, tcz: 10 };
  W.mapMount = function (el) {
    if (!el) return;
    if (!built) build();
    mapS.on = true; mapS.el = el;
    el.appendChild(renderer.domElement);
    var pins = document.createElement('div'); pins.className = 'map-pins'; el.appendChild(pins); mapS.pins = pins;
    var s = S(), v = s.visit || { zones: [] }, html = '';
    DC.ZONES.forEach(function (z) {
      var done = v.zones.indexOf(z.id) >= 0;
      html += '<button class="mpin" data-act="zone" data-zone="' + z.id + '" data-k="z' + z.id + '" style="--zc:' + z.color + '"><i class="num">' + (done ? '✓' : z.id) + '</i>' + DC.UI.esc(z.short) + '</button>';
    });
    html += '<span class="mpin me" data-k="me"><i></i>Tú</span>';
    pins.innerHTML = html;
    mapS.pinEls = Array.prototype.slice.call(pins.children);
    mapS.dist = mapS.tdist = 300; mapS.cx = mapS.tcx = 0; mapS.cz = mapS.tcz = 10;
    if (snow) snow.visible = false;
    scene.fog.near = 500; scene.fog.far = 1600;
    resizeTo(el);
    if (!raf) loop();
  };
  W.mapUnmount = function () {
    if (!mapS.on) return;
    mapS.on = false;
    if (mapS.pins) mapS.pins.remove();
    var host = $('#walk .walk-host'); if (host && renderer) host.appendChild(renderer.domElement);
    if (snow) snow.visible = true;
    scene.fog.near = 90; scene.fog.far = 420;
  };
  W.mapFocus = function (zid) { var q = DC.PARK.zones[zid]; if (!q) return; mapS.tcx = q.x; mapS.tcz = q.z + 10; mapS.tdist = 120; };
  function renderMap(dt) {
    var k = Math.min(1, dt * 5);
    mapS.dist += (mapS.tdist - mapS.dist) * k; mapS.cx += (mapS.tcx - mapS.cx) * k; mapS.cz += (mapS.tcz - mapS.cz) * k;
    var pitch = 0.95;
    mapCam.position.set(mapS.cx + Math.sin(mapS.yaw) * Math.cos(pitch) * mapS.dist, Math.sin(pitch) * mapS.dist, mapS.cz + Math.cos(mapS.yaw) * Math.cos(pitch) * mapS.dist);
    mapCam.lookAt(mapS.cx, 0, mapS.cz);
    W.sun.position.set(mapS.cx + 60, 120, mapS.cz + 45); W.sun.target.position.set(mapS.cx, 0, mapS.cz);
    var sc = W.sun.shadow.camera; if (sc.right !== 160) { sc.left = -160; sc.right = 160; sc.top = 160; sc.bottom = -160; sc.far = 400; sc.updateProjectionMatrix(); }
    draw(mapCam);
    var el = mapS.el, w0 = el.clientWidth, h0 = el.clientHeight, v3 = new T.Vector3();
    (mapS.pinEls || []).forEach(function (p) {
      var key = p.dataset.k, x, z, y = 6;
      if (key === 'me') { x = av.x; z = av.z; y = 3; } else { var q = DC.PARK.zones[key.slice(1)]; x = q.x; z = q.z; y = 10; }
      v3.set(x, y, z).project(mapCam);
      var vis = v3.z < 1 && Math.abs(v3.x) < 1.05 && Math.abs(v3.y) < 1.05;
      p.style.display = vis ? '' : 'none';
      if (vis) p.style.transform = 'translate(' + ((v3.x + 1) / 2 * w0) + 'px,' + ((1 - v3.y) / 2 * h0) + 'px) translate(-50%,-100%)';
    });
  }
  function draw(camera) {
    if (composer) { renderPass.camera = camera; composer.render(); }
    else renderer.render(scene, camera);
  }

  /* ---------------- Bucle ---------------- */
  var tmp = new T.Vector3();
  function loop() {
    raf = requestAnimationFrame(loop);
    var dt = Math.min(0.05, clock.getDelta());
    var t = clock.elapsedTime;
    if (mapS.on) { DC.World.update(dt, t); avatar.position.set(av.x, 0, av.z); renderMap(dt); return; }
    if (!W.open || W.paused) return;
    /* movimiento */
    var mx = 0, mz = 0, running = false;
    if (!gps.on) {
      var kx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
      var kz = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
      var ix = joy.on ? joy.x : kx, iz = joy.on ? joy.y : kz;
      if (ix || iz) {
        av.tx = null; var cs = Math.cos(camYaw), sn = Math.sin(camYaw); mx = ix * cs + iz * sn; mz = -ix * sn + iz * cs;
        var l = Math.hypot(mx, mz); if (l > 1) { mx /= l; mz /= l; }
        running = keys.shift || (joy.on && Math.hypot(joy.x, joy.y) > 0.92);
      }
    }
    if (av.tx !== null) {
      var dx = av.tx - av.x, dz = av.tz - av.z, dd = Math.hypot(dx, dz);
      if (dd > 0.3) { mx = dx / dd * Math.min(1, dd / 2); mz = dz / dd * Math.min(1, dd / 2); running = dd > 25; } else { av.tx = null; }
    }
    var mag = Math.hypot(mx, mz), vel = mag * (running ? RUN : WALK);
    if (vel > 0.05) {
      av.x += mx / Math.max(mag, 1e-3) * vel * dt; av.z += mz / Math.max(mag, 1e-3) * vel * dt;
      var rr0 = Math.hypot(av.x, av.z); if (rr0 > DC.PARK.radius - 2) { av.x *= (DC.PARK.radius - 2) / rr0; av.z *= (DC.PARK.radius - 2) / rr0; }
      /* no caminar sobre el agua */
      DC.World.lakes().forEach(function (L) { var ld = Math.hypot(av.x - L.x, av.z - L.z); if (ld < L.r + 0.5) { av.x = L.x + (av.x - L.x) / ld * (L.r + 0.5); av.z = L.z + (av.z - L.z) / ld * (L.r + 0.5); } });
      av.dir = turnTo(av.dir, Math.atan2(mx, mz), dt, 10);
      if (running && Math.random() < dt * 8) DC.FX.burst(new T.Vector3(av.x, 0.1, av.z), { color: '#e8dcc4', count: 2, speed: 0.6, up: true, size: 0.3, gravity: -0.5, life: 0.5 });
    }
    av.speed += (vel / WALK - av.speed) * Math.min(1, dt * 10);
    avatar.position.set(av.x, 0, av.z); avatar.rotation.y = av.dir;
    DC.Avatar.animate(avatar.userData.body, av.speed, dt, t);
    var pu = avatar.userData.pulse; pu.scale.setScalar(1 + (t * 0.8 % 1) * 4); pu.material.opacity = 0.6 * (1 - (t * 0.8 % 1));
    /* cámara */
    var cx = av.x + Math.sin(camYaw) * Math.cos(camPitch) * camDist, cz = av.z + Math.cos(camYaw) * Math.cos(camPitch) * camDist;
    cam.position.lerp(tmp.set(cx, Math.sin(camPitch) * camDist + 1.2, cz), Math.min(1, dt * 6));
    cam.lookAt(av.x - Math.sin(camYaw) * 4, 1.8, av.z - Math.cos(camYaw) * 4);
    var sd = W.sunDir; W.sun.position.set(av.x + sd.x * 70, sd.y * 70, av.z + sd.z * 70); W.sun.target.position.set(av.x, 0, av.z);
    var shc = W.sun.shadow.camera; if (shc.right !== 45) { shc.left = -45; shc.right = 45; shc.top = 45; shc.bottom = -45; shc.far = 160; shc.updateProjectionMatrix(); }
    /* dinosaurios */
    spawnT -= dt;
    if (spawnT <= 0) { spawnT = (dinos.length < 3 ? 0.8 : 2) + rnd() * 2; spawnDino(); }
    dinos.slice().forEach(function (dn) {
      var p = dn.actor.root.position, far = Math.hypot(p.x - av.x, p.z - av.z);
      if (dn.dead || (!dn.xmas && (far > 55 || t - dn.born > 180))) { removeDino(dn); return; }
      updateDino(dn, dt, t);
    });
    replicas3d.forEach(function (o) { o.halo.rotation.z += dt * 0.8; o.halo.position.y = 1.1 + Math.sin(t * 2) * 0.15; });
    DC.World.update(dt, t);
    updateSnow(dt, t);
    if (guide) {
      var gt = W._guide && DC.PARK.zones[W._guide.id];
      guide.visible = !!gt;
      if (gt) { var ang = Math.atan2(gt.x - av.x, gt.z - av.z); guide.position.set(av.x + Math.sin(ang) * 2.6, 0.12, av.z + Math.cos(ang) * 2.6); guide.rotation.set(-Math.PI / 2, ang + Math.PI, 0); guide.material.opacity = 0.6 + Math.sin(t * 5) * 0.3; }
    }
    DC.FX.update(dt);
    draw(cam);
    /* interfaz */
    W.whereT = (W.whereT || 0) - dt;
    if (W.whereT <= 0) { W.whereT = 0.35; updateWhere(); updateNear(); }
    var host = $('#walk'); if (!host) return;
    var w0 = host.clientWidth, h0 = host.clientHeight;
    labelEls.forEach(function (L) {
      var dist = Math.hypot(L.x - av.x, L.z - av.z);
      tmp.set(L.x, L.y, L.z).project(cam);
      var vis = tmp.z < 1 && dist < 70 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1;
      L.el.hidden = !vis;
      if (vis) L.el.style.transform = 'translate(' + ((tmp.x + 1) / 2 * w0) + 'px,' + ((1 - tmp.y) / 2 * h0) + 'px) translate(-50%,-100%)';
    });
  }

  function resizeTo(el) {
    if (!renderer || !el) return;
    var w = el.clientWidth || 300, h = el.clientHeight || 300;
    renderer.setSize(w, h, false); renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%';
    cam.aspect = w / h; cam.fov = w < h ? 64 : 50; cam.updateProjectionMatrix();
    mapCam.aspect = w / h; mapCam.fov = w < h ? 50 : 38; mapCam.updateProjectionMatrix();
    if (composer) { composer.setPixelRatio ? composer.setPixelRatio(renderer.getPixelRatio()) : 0; composer.setSize(w, h); if (bloom) bloom.resolution.set(w / 2, h / 2); }
  }
  function resize() { resizeTo($('#walk')); }
  window.addEventListener('resize', function () { if (mapS.on) resizeTo(mapS.el); else if (W.open) resize(); });

  W.openWalk = function () {
    if (!built) build();
    DC.FX.init(scene);
    $('#screens').hidden = true;
    var el = $('#walk'); el.hidden = false;
    if (!el.dataset.bound) { el.addEventListener('click', onHud); el.dataset.bound = '1'; }
    hud(); buildLabels();
    W.open = true; W.paused = false;
    resize();
    if (!raf) loop();
    if (!S().walkTutorial) {
      S().walkTutorial = true; DC.Store.save();
      var showTutRef = function showTut() {
        if (W.paused || document.querySelector('#overlay .modal-back, #overlay .onb')) { setTimeout(showTut, 500); return; }
        DC.UI.modal('<div class="stack center-text tut"><div class="eyebrow">Cómo se juega</div><h2>Camina hasta los hábitats</h2>' +
          '<ul class="tut-list"><li><b>1</b>Usa el joystick (o el GPS en el parque) para caminar. Empújalo hasta el borde para correr.</li><li><b>2</b>Sigue la flecha dorada: los dinosaurios solo viven dentro de los ' + DC.ZONES.length + ' hábitats.</li><li><b>3</b>Acércate y toca <i>Atrapar</i>. Gana Dino-puntos y cámbialos por premios.</li><li><b>4</b>Los especiales navideños salen 1 por visita: ¡vuelve varios días!</li></ul>' +
          '<button class="btn block sun" data-act="close">¡A caminar!</button></div>', { center: true });
      };
      setTimeout(showTutRef, 700);
    }
  };
  W.close = function () { W.open = false; stopGPS(); $('#walk').hidden = true; $('#screens').hidden = false; DC.FX.init(DC.AR.scene); };
  W.pause = function () { W.paused = true; keys = {}; joy.on = false; $('#walk').hidden = true; DC.FX.init(DC.AR.scene); };
  W.resume = function () {
    W.mapUnmount();
    DC.FX.init(scene);
    $('#screens').hidden = true;
    W.menu = false;
    $('#walk').hidden = false; W.paused = false; W.open = true; nearKey = ''; hudRes(); resize();
    if (!raf) loop();
  };

  DC.Walk = W;
})();
