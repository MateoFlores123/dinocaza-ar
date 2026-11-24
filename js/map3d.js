/* =====================================================================
   DinoCaza AR · map3d.js
   Mapa 3D del parque: isla con 5 hábitats, dinosaurios animados
   paseando, giro con el dedo y marcadores para elegir la zona.
   ===================================================================== */
(function () {
  var T = THREE;
  var M = { mounted: false };
  var renderer, scene, cam, layer, host, clock = new T.Clock();
  var yaw = 0.35, pitch = 0.82, dist = 21, targetYaw = null, lastInteract = 0;
  var habitats = [], walkers = [], smoke = [], water = null, orb = null;
  var built = false, raf = null;
  var RAD = 6.4;
  var DINOS = { 1: ['triceratops', 'parasaurolophus'], 2: ['velociraptor', 'ankylosaurus'], 3: ['spinosaurus'], 4: ['pteranodon'], 5: ['trex'] };

  function zonePos(i) {
    var a = -Math.PI / 2 + Math.PI + i * (Math.PI * 2 / 5);
    return new T.Vector3(Math.cos(a) * RAD, 0, Math.sin(a) * RAD);
  }
  function std(color, o) { o = o || {}; return new T.MeshStandardMaterial({ color: color, roughness: o.r === undefined ? 0.9 : o.r, metalness: 0, flatShading: !!o.flat, emissive: o.em || '#000000', emissiveIntensity: o.ei || 0 }); }
  function add(mesh, x, y, z, parent) { mesh.position.set(x || 0, y || 0, z || 0); mesh.castShadow = true; mesh.receiveShadow = true; (parent || scene).add(mesh); return mesh; }
  var seed = 3;
  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }

  function tree(g, x, z, s) {
    add(new T.Mesh(new T.CylinderGeometry(0.05 * s, 0.09 * s, 1.2 * s, 6), std('#6b4a32')), x, 0.6 * s, z, g);
    for (var i = 0; i < 3; i++) add(new T.Mesh(new T.ConeGeometry((0.55 - i * 0.13) * s, 0.55 * s, 7), std(i % 2 ? '#2f7a3f' : '#3d8f49', { flat: true })), x, (1.0 + i * 0.32) * s, z, g);
  }
  function fern(g, x, z, s, col) {
    for (var i = 0; i < 6; i++) {
      var f = new T.Mesh(new T.ConeGeometry(0.06 * s, 0.5 * s, 3), std(col || '#5fae4a', { flat: true }));
      var h = new T.Group(); h.position.set(x, 0, z); h.rotation.y = i / 6 * Math.PI * 2;
      f.position.set(0, 0.18 * s, 0.14 * s); f.rotation.x = 1.0; f.scale.z = 0.25; f.castShadow = true;
      h.add(f); g.add(h);
    }
  }
  function rock(g, x, z, s, col) {
    var r = add(new T.Mesh(new T.DodecahedronGeometry(0.3 * s, 0), std(col || '#b59f84', { flat: true })), x, 0.12 * s, z, g);
    r.scale.y = 0.6; r.rotation.set(rnd(), rnd(), rnd());
  }

  function build() {
    built = true;
    scene = new T.Scene();
    scene.fog = new T.Fog('#bfe6f5', 34, 70);
    cam = new T.PerspectiveCamera(46, 1, 0.1, 200);
    scene.add(new T.HemisphereLight('#ffffff', '#6b8f5a', 0.75));
    var sun = new T.DirectionalLight('#fff3dc', 1.0);
    sun.position.set(8, 16, 6); sun.castShadow = !DC.Store.get().settings.lite;
    sun.shadow.mapSize.set(1024, 1024);
    var sc = sun.shadow.camera; sc.left = -13; sc.right = 13; sc.top = 13; sc.bottom = -13; sc.far = 50;
    sun.shadow.bias = -0.0006;
    scene.add(sun);

    /* Agua y espuma */
    water = new T.Mesh(new T.CircleGeometry(60, 48), new T.MeshStandardMaterial({ color: '#46bfe6', roughness: 0.35, metalness: 0.1 }));
    water.rotation.x = -Math.PI / 2; water.position.y = -1.15; water.receiveShadow = true; scene.add(water);
    var foam = new T.Mesh(new T.TorusGeometry(11.3, 0.18, 6, 64), std('#e9fbff', { r: 0.5 }));
    foam.rotation.x = Math.PI / 2; foam.position.y = -1.1; scene.add(foam);
    /* Isla */
    var side = add(new T.Mesh(new T.CylinderGeometry(11, 9.6, 2.2, 40, 2), std('#a8845c', { flat: true })), 0, -1.1, 0);
    side.receiveShadow = true;
    var top = add(new T.Mesh(new T.CircleGeometry(11, 48), std('#86c35e')), 0, 0.005, 0);
    top.rotation.x = -Math.PI / 2;
    /* Plaza central de sillar con la Dinoesfera gigante */
    var plaza = add(new T.Mesh(new T.CylinderGeometry(1.7, 1.8, 0.12, 32), std('#f1e9d6')), 0, 0.06, 0);
    var ped = add(new T.Mesh(new T.CylinderGeometry(0.35, 0.45, 0.5, 16), std('#e2d6bd')), 0, 0.37, 0);
    orb = add(new T.Mesh(new T.SphereGeometry(0.42, 24, 16), new T.MeshStandardMaterial({ color: '#ffb23d', emissive: '#f08a12', emissiveIntensity: 0.45, roughness: 0.2 })), 0, 1.05, 0);
    add(new T.Mesh(new T.TorusGeometry(0.43, 0.05, 8, 32), std('#2a1a0f', { r: 0.4 })), 0, 1.05, 0).rotation.x = Math.PI / 2;

    DC.ZONES.forEach(function (z, i) {
      var p = zonePos(i);
      var g = new T.Group(); g.position.copy(p); scene.add(g);
      /* sendero desde la plaza */
      var len = p.length() - 1.7 - 1.9;
      var path = new T.Mesh(new T.BoxGeometry(0.62, 0.06, len), std('#f1e9d6'));
      var mid = p.clone().normalize().multiplyScalar(1.7 + len / 2);
      path.position.set(mid.x, 0.03, mid.z); path.lookAt(new T.Vector3(p.x, 0.03, p.z)); path.receiveShadow = true; scene.add(path);
      var patchCol = ['#b3dc72', '#3f8f4c', '#8fd3a0', '#c4a882', '#5a4a44'][i];
      var patch = add(new T.Mesh(new T.CylinderGeometry(2.3, 2.4, 0.1, 36), std(patchCol)), 0, 0.05, 0, g);
      patch.userData.zone = z.id;
      var hit = [patch];
      if (z.id === 1) {
        var cols = ['#ff7aa8', '#ffd84d', '#ffffff', '#b18cff', '#ff9a3d'];
        for (var f = 0; f < 22; f++) { var a = rnd() * 6.28, r = 0.4 + rnd() * 1.7; add(new T.Mesh(new T.SphereGeometry(0.06, 6, 4), std(cols[f % 5], { r: 0.6 })), Math.cos(a) * r, 0.16, Math.sin(a) * r, g); }
        rock(g, 1.4, -0.9, 1.3); rock(g, -1.5, 0.6, 1);
        fern(g, -0.6, -1.5, 1.2, '#7cc04f');
      } else if (z.id === 2) {
        for (var t = 0; t < 7; t++) { var a2 = t / 7 * 6.28 + rnd() * 0.4, r2 = 1.3 + rnd() * 0.8; tree(g, Math.cos(a2) * r2, Math.sin(a2) * r2, 0.9 + rnd() * 0.5); }
        fern(g, 0.3, 0.2, 1.3); fern(g, -0.6, -0.4, 1);
      } else if (z.id === 3) {
        var lake = add(new T.Mesh(new T.CylinderGeometry(1.65, 1.65, 0.06, 36), new T.MeshStandardMaterial({ color: '#3bb3d6', roughness: 0.15, metalness: 0.2 })), 0.2, 0.12, 0.1, g);
        hit.push(lake);
        for (var l = 0; l < 5; l++) { var a3 = rnd() * 6.28, r3 = 0.4 + rnd() * 1.0; var pad = add(new T.Mesh(new T.CircleGeometry(0.16, 10), std('#5fbf5a')), 0.2 + Math.cos(a3) * r3, 0.16, 0.1 + Math.sin(a3) * r3, g); pad.rotation.x = -Math.PI / 2; }
        for (var k = 0; k < 8; k++) { var a4 = k / 8 * 6.28; add(new T.Mesh(new T.CylinderGeometry(0.02, 0.02, 0.5, 4), std('#6a9c3c')), Math.cos(a4) * 2.0, 0.3, Math.sin(a4) * 2.0, g); }
        rock(g, -1.7, -0.8, 1.2, '#9fb3b8');
      } else if (z.id === 4) {
        var mesa = add(new T.Mesh(new T.CylinderGeometry(1.4, 1.9, 1.8, 9, 2), std('#b9946c', { flat: true })), 0, 0.95, 0, g);
        hit.push(mesa);
        add(new T.Mesh(new T.CylinderGeometry(1.42, 1.42, 0.1, 9), std('#8fbf5c', { flat: true })), 0, 1.88, 0, g);
        var nest = add(new T.Mesh(new T.TorusGeometry(0.3, 0.1, 6, 14), std('#8a6a44', { flat: true })), 0.3, 1.98, 0.2, g); nest.rotation.x = Math.PI / 2;
        for (var e = 0; e < 3; e++) add(new T.Mesh(new T.SphereGeometry(0.09, 10, 8), std('#f4ead2', { r: 0.5 })), 0.3 + (e - 1) * 0.11, 2.0, 0.2, g).scale.y = 1.3;
        rock(g, 1.8, 0.6, 1); rock(g, -1.6, -0.9, 1.3);
      } else {
        var vol = add(new T.Mesh(new T.CylinderGeometry(0.55, 2.2, 2.8, 14, 3), std('#6e5a52', { flat: true })), 0, 1.4, -0.3, g);
        hit.push(vol);
        add(new T.Mesh(new T.CylinderGeometry(0.42, 0.85, 0.7, 14), std('#f7f4ee', { flat: true })), 0, 2.5, -0.3, g);
        add(new T.Mesh(new T.CircleGeometry(0.4, 16), new T.MeshStandardMaterial({ color: '#ff7a2a', emissive: '#ff5a10', emissiveIntensity: 1.3 })), 0, 2.86, -0.3, g).rotation.x = -Math.PI / 2;
        for (var sm = 0; sm < 4; sm++) {
          var spr = DC.FX.sprite('soft', '#e9e2dc', 0.8, false); spr.material.opacity = 0.5; spr.material.fog = false;
          spr.position.set(0, 3 + sm * 0.4, -0.3); g.add(spr); smoke.push({ s: spr, t: sm / 4 });
        }
        rock(g, 1.6, 1.0, 1.2, '#4c3d38'); rock(g, -1.5, 1.1, 1, '#4c3d38');
      }
      habitats.push({ zone: z, group: g, pos: p, hit: hit, top: z.id === 4 ? 2.4 : z.id === 5 ? 3.4 : 1.4 });
    });
    spawnWalkers();
  }

  /* Dinosaurios paseando en su hábitat (usan el modelo .glb si ya cargó) */
  function spawnWalkers() {
    walkers.forEach(function (w) { scene.remove(w.a.root); w.a.dispose(); });
    walkers = [];
    habitats.forEach(function (h, i) {
      (DINOS[h.zone.id] || []).forEach(function (id, k) {
        var sp = DC.SP[id]; if (!sp) return;
        var a = new DC.Models.Actor(sp);
        var sc = sp.id === 'trex' ? 0.42 : sp.model.kind === 'ptero' ? 0.45 : 0.36;
        a.root.scale.setScalar(sc);
        a.walk = sp.model.kind === 'ptero' ? 0 : 1;
        scene.add(a.root);
        a.root.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
        walkers.push({ a: a, h: h, r: sp.model.kind === 'ptero' ? 2.2 : 0.9 + k * 0.5, sp: (k ? -1 : 1) * (0.25 + rnd() * 0.15), t: rnd() * 6.28,
          y: h.zone.id === 4 && sp.model.kind !== 'ptero' ? 1.9 : 0.1, fly: sp.model.kind === 'ptero', still: h.zone.id === 3 || h.zone.id === 5 });
      });
    });
  }

  /* ---------------- Marcadores ---------------- */
  function pinsHTML() {
    var s = DC.Store.get(), v = s.visit || { zones: [] };
    var next = DC.ZONES.find(function (z) { return v.zones.indexOf(z.id) < 0; });
    return DC.ZONES.map(function (z) {
      var sps = DC.SPECIES.filter(function (x) { return x.zone === z.id; });
      var got = sps.filter(function (x) { return s.album[x.id] && s.album[x.id].caught; }).length;
      var done = v.zones.indexOf(z.id) >= 0;
      var uq = DC.Store.uniquesLeft ? DC.Store.uniquesLeft(z.id).length : 0;
      return '<button class="pin' + (done ? ' done' : '') + (next && next.id === z.id ? ' next' : '') + '" data-act="zone" data-zone="' + z.id + '" style="--zc:' + z.color + '">' +
        '<span class="pin-dot">' + (done ? '✓' : z.id) + '</span><span class="pin-txt"><b>' + DC.UI.esc(z.short) + '</b><small class="num">' + got + '/' + sps.length + (uq ? ' · ★' : '') + '</small></span></button>';
    }).join('');
  }
  M.refresh = function () { if (layer) layer.innerHTML = pinsHTML(); };
  M.modelsChanged = function () { if (built) spawnWalkers(); };

  /* ---------------- Montaje y bucle ---------------- */
  M.mount = function (el) {
    host = el;
    if (!built) {
      renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DC.Store.get().settings.lite ? 1 : 1.75));
      renderer.shadowMap.enabled = !DC.Store.get().settings.lite;
      renderer.shadowMap.type = T.PCFSoftShadowMap;
      renderer.domElement.className = 'map3d-canvas';
      bind(renderer.domElement);
      build();
    }
    layer = document.createElement('div'); layer.className = 'pin-layer';
    el.appendChild(renderer.domElement);
    el.appendChild(layer);
    M.refresh();
    M.mounted = true;
    resize();
    if (!raf) loop();
  };
  M.unmount = function () { M.mounted = false; };
  function resize() {
    if (!host) return;
    var w = host.clientWidth || 360, h = host.clientHeight || 420;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%';
    cam.aspect = w / h;
    dist = w < h ? 29 : 23;
    cam.updateProjectionMatrix();
  }
  window.addEventListener('resize', function () { if (M.mounted) resize(); });

  M.focus = function (zoneId) {
    var i = DC.ZONES.findIndex(function (z) { return z.id === zoneId; });
    if (i < 0) return;
    var p = zonePos(i);
    targetYaw = Math.atan2(p.x, p.z);
    lastInteract = performance.now();
  };

  function bind(c) {
    var down = null, moved = 0;
    c.addEventListener('pointerdown', function (e) { down = { x: e.clientX, y: e.clientY, yaw: yaw, pitch: pitch }; moved = 0; targetYaw = null; c.setPointerCapture && c.setPointerCapture(e.pointerId); });
    c.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - down.x, dy = e.clientY - down.y;
      moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
      yaw = down.yaw - dx * 0.008;
      pitch = Math.max(0.45, Math.min(1.15, down.pitch + dy * 0.004));
      lastInteract = performance.now();
    });
    c.addEventListener('pointerup', function (e) {
      if (down && moved < 8) pick(e);
      down = null;
    });
    c.addEventListener('pointercancel', function () { down = null; });
  }
  var ray = new T.Raycaster();
  function pick(e) {
    var r = renderer.domElement.getBoundingClientRect();
    var v = new T.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(v, cam);
    var objs = []; habitats.forEach(function (h) { h.hit.forEach(function (m) { m.userData.zone = h.zone.id; objs.push(m); }); });
    var hit = ray.intersectObjects(objs, false)[0];
    if (hit) { DC.Audio.play('tap'); M.focus(hit.object.userData.zone); DC.UI.zoneSheet(hit.object.userData.zone); }
  }

  var tmp = new T.Vector3();
  function loop() {
    raf = requestAnimationFrame(loop);
    var dt = Math.min(0.05, clock.getDelta());
    if (!M.mounted || !host || !host.isConnected || document.hidden || !renderer.domElement.offsetParent) return;
    var t = clock.elapsedTime;
    if (targetYaw !== null) {
      var d = targetYaw - yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      yaw += d * Math.min(1, dt * 3);
      if (Math.abs(d) < 0.002) targetYaw = null;
    } else if (performance.now() - lastInteract > 5000) yaw += dt * 0.06;
    cam.position.set(Math.sin(yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist, Math.cos(yaw) * Math.cos(pitch) * dist);
    cam.lookAt(0, 0.4, 0);
    walkers.forEach(function (w) {
      w.t += dt * w.sp;
      var c = w.h.pos, a = w.a;
      if (w.still) { a.walk = 0; a.root.position.set(c.x + 0.4, w.y, c.z + 0.6); a.root.rotation.y = Math.sin(t * 0.3) * 0.6 + yaw; }
      else {
        var x = c.x + Math.cos(w.t) * w.r, z = c.z + Math.sin(w.t) * w.r;
        a.root.position.set(x, w.fly ? 2.6 + Math.sin(t * 1.5) * 0.3 : w.y, z);
        a.root.rotation.y = Math.atan2(-Math.sin(w.t) * Math.sign(w.sp), Math.cos(w.t) * Math.sign(w.sp));
      }
      a.update(dt);
    });
    smoke.forEach(function (s) { s.t = (s.t + dt * 0.15) % 1; s.s.position.y = 3 + s.t * 2.2; s.s.scale.setScalar(0.6 + s.t * 1.4); s.s.material.opacity = 0.5 * (1 - s.t); });
    if (orb) { orb.position.y = 1.05 + Math.sin(t * 2) * 0.06; orb.rotation.y += dt; }
    water.material.color.setHSL(0.54, 0.7, 0.58 + Math.sin(t * 0.8) * 0.02);
    renderer.render(scene, cam);
    /* marcadores encima de cada hábitat */
    if (layer) {
      var w0 = host.clientWidth, h0 = host.clientHeight, pins = layer.children;
      habitats.forEach(function (h, i) {
        var el = pins[i]; if (!el) return;
        tmp.set(h.pos.x, h.top + 1.1, h.pos.z).project(cam);
        el.style.transform = 'translate(' + ((tmp.x + 1) / 2 * w0) + 'px,' + ((1 - tmp.y) / 2 * h0) + 'px) translate(-50%,-100%)';
        el.style.zIndex = String(Math.round((1 - tmp.z) * 1000));
      });
    }
  }

  DC.Map3D = M;
})();
