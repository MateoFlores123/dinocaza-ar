/* =====================================================================
   DinoCaza AR · walk.js
   Modo paseo (estilo Pokémon GO): tu avatar camina por el parque 3D
   (con el GPS del celular o con joystick/teclado), aparecen dinosaurios
   salvajes alrededor, los puestos y atracciones del parque, y las
   réplicas reales que se desafían escaneándolas con la cámara.
   ===================================================================== */
(function () {
  var T = THREE;
  var W = { open: false };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var S = function () { return DC.Store.get(); };
  var renderer, scene, cam, root, clock = new T.Clock(), raf = null, built = false;
  var avatar, av = { x: 0, z: 47, dir: Math.PI, speed: 0, phase: 0, tx: null, tz: null };
  var camYaw = 0, camPitch = 0.62, camDist = 21;
  var keys = {}, joy = { x: 0, y: 0, on: false };
  var dinos = [], places3d = [], replicas3d = [], spawnT = 0.3, labelEls = [];
  var gps = { on: false, watch: null, origin: null, last: null, err: null };
  var near = null, nearKey = '';
  var seed = 9;
  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  function std(c, o) { o = o || {}; return new T.MeshStandardMaterial({ color: c, roughness: o.r === undefined ? 0.85 : o.r, metalness: o.m || 0, flatShading: !!o.flat, emissive: o.em || '#000000', emissiveIntensity: o.ei || 0, transparent: !!o.op, opacity: o.op || 1 }); }
  function add(m, x, y, z, p) { m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; m.receiveShadow = true; (p || scene).add(m); return m; }
  function box(w, h, d, c, o) { return new T.Mesh(new T.BoxGeometry(w, h, d), std(c, o)); }
  function cyl(rt, rb, h, c, seg, o) { return new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg || 16), std(c, o)); }

  /* ---------------- Letreros con texto ---------------- */
  function signTex(text, bg, fg) {
    var c = document.createElement('canvas'); c.width = 512; c.height = 128;
    var g = c.getContext('2d');
    g.fillStyle = bg; if (g.roundRect) { g.beginPath(); g.roundRect(6, 6, 500, 116, 30); g.fill(); } else g.fillRect(6, 6, 500, 116);
    g.fillStyle = fg || '#ffffff';
    g.font = '64px "Lilita One", "Arial Rounded MT Bold", Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    var size = 64; while (g.measureText(text).width > 460 && size > 30) { size -= 4; g.font = size + 'px "Lilita One", Arial, sans-serif'; }
    g.fillText(text, 256, 68);
    var t = new T.CanvasTexture(c); return t;
  }
  function sign(text, bg, x, y, z, w, parent, rotY) {
    var m = new T.Mesh(new T.PlaneGeometry(w, w / 4), new T.MeshBasicMaterial({ map: signTex(text, bg), transparent: true, side: T.DoubleSide }));
    m.position.set(x, y, z); if (rotY) m.rotation.y = rotY; (parent || scene).add(m); return m;
  }

  /* ---------------- Avatar ---------------- */
  function buildAvatar() {
    var s = S(), a = s.avatar || {};
    var skin = a.skin || DC.AVATAR_COLORS.skin[0], shirt = a.shirt || DC.AVATAR_COLORS.shirt[0];
    var g = new T.Group();
    var body = new T.Group(); g.add(body);
    var legs = [];
    [-1, 1].forEach(function (sd) {
      var hip = new T.Group(); hip.position.set(sd * 0.18, 0.95, 0); body.add(hip);
      add(cyl(0.12, 0.1, 0.8, '#3b4a5a', 10), 0, -0.4, 0, hip);
      add(box(0.24, 0.14, 0.38, '#5a3b22'), 0, -0.82, 0.07, hip);
      legs.push(hip);
    });
    var torso = add(cyl(0.3, 0.34, 0.75, shirt, 16), 0, 1.35, 0, body);
    add(new T.Mesh(new T.SphereGeometry(0.3, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), std(shirt)), 0, 1.72, 0, body);
    add(box(0.5, 0.55, 0.22, '#f0a53a', { r: 0.6 }), 0, 1.4, -0.32, body); /* mochila */
    add(box(0.42, 0.16, 0.1, '#c97f1c'), 0, 1.25, -0.45, body);
    var arms = [];
    [-1, 1].forEach(function (sd) {
      var sh = new T.Group(); sh.position.set(sd * 0.4, 1.62, 0); body.add(sh);
      add(cyl(0.09, 0.08, 0.6, shirt, 8), 0, -0.28, 0, sh);
      add(new T.Mesh(new T.SphereGeometry(0.09, 10, 8), std(skin)), 0, -0.62, 0, sh);
      arms.push(sh);
    });
    var head = add(new T.Mesh(new T.SphereGeometry(0.3, 20, 16), std(skin, { r: 0.6 })), 0, 2.05, 0, body);
    [-1, 1].forEach(function (sd) { add(new T.Mesh(new T.SphereGeometry(0.045, 8, 6), std('#1b2a33', { r: 0.2 })), sd * 0.11, 2.08, 0.27, body); });
    add(new T.Mesh(new T.TorusGeometry(0.08, 0.02, 6, 12, Math.PI), std('#7a2a2a')), 0, 1.97, 0.27, body).rotation.z = Math.PI;
    if (a.hat !== false) {
      add(cyl(0.48, 0.48, 0.04, '#d8b66a', 24), 0, 2.27, 0, body);
      add(cyl(0.25, 0.3, 0.24, '#d8b66a', 20), 0, 2.4, 0, body);
      add(cyl(0.305, 0.305, 0.06, '#7a4e22', 20), 0, 2.32, 0, body);
    }
    /* sombra suave y anillo de alcance */
    var sh = new T.Mesh(new T.CircleGeometry(0.6, 24), new T.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.25, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.03; g.add(sh);
    var ring = new T.Mesh(new T.RingGeometry(5.6, 5.9, 64), new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, depthWrite: false, side: T.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; g.add(ring);
    var pulse = new T.Mesh(new T.RingGeometry(0.9, 1.1, 48), new T.MeshBasicMaterial({ color: '#ffc93c', transparent: true, opacity: 0.6, depthWrite: false, side: T.DoubleSide }));
    pulse.rotation.x = -Math.PI / 2; pulse.position.y = 0.06; g.add(pulse);
    g.userData = { body: body, legs: legs, arms: arms, head: head, pulse: pulse };
    g.scale.setScalar(1);
    return g;
  }
  W.rebuildAvatar = function () {
    if (!built) return;
    var p = avatar.position.clone(), r = avatar.rotation.y;
    scene.remove(avatar); avatar = buildAvatar(); avatar.position.copy(p); avatar.rotation.y = r; scene.add(avatar);
  };

  /* ---------------- Lugares del parque ---------------- */
  function propFor(kind, g) {
    if (kind === 'popcorn') {
      add(cyl(0.55, 0.4, 1.0, '#ffffff', 12), 0, 3.9, 0, g);
      for (var i = 0; i < 6; i++) add(box(0.12, 1.0, 0.02, '#ff5a4e'), Math.cos(i / 6 * 6.28) * 0.47, 3.9, Math.sin(i / 6 * 6.28) * 0.47, g).rotation.y = -i / 6 * 6.28;
      for (var k = 0; k < 9; k++) add(new T.Mesh(new T.SphereGeometry(0.2, 8, 6), std('#fff4c8')), (rnd() - 0.5) * 0.7, 4.5 + rnd() * 0.25, (rnd() - 0.5) * 0.7, g);
    } else if (kind === 'icecream') {
      var c = add(new T.Mesh(new T.ConeGeometry(0.42, 1.2, 12), std('#e3a35a')), 0, 3.9, 0, g); c.rotation.x = Math.PI;
      add(new T.Mesh(new T.SphereGeometry(0.42, 14, 10), std('#ff8fb1')), 0, 4.6, 0, g);
      add(new T.Mesh(new T.SphereGeometry(0.34, 14, 10), std('#9fe3c8')), 0, 5.05, 0, g);
      add(new T.Mesh(new T.SphereGeometry(0.1, 8, 6), std('#ff3b4e')), 0, 5.45, 0, g);
    } else if (kind === 'burger') {
      add(cyl(0.6, 0.6, 0.25, '#e0a050', 16), 0, 3.6, 0, g); add(cyl(0.62, 0.62, 0.12, '#5a2e14', 16), 0, 3.8, 0, g);
      add(cyl(0.64, 0.64, 0.06, '#5cbf3a', 16), 0, 3.9, 0, g);
      add(new T.Mesh(new T.SphereGeometry(0.6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), std('#e7a64e')), 0, 3.95, 0, g);
    } else if (kind === 'juice') {
      add(cyl(0.38, 0.3, 1.1, '#ffb23d', 14, { op: 0.9 }), 0, 3.95, 0, g);
      add(cyl(0.04, 0.04, 0.9, '#ff4f5e', 6), 0.12, 4.7, 0, g).rotation.z = 0.3;
      add(new T.Mesh(new T.SphereGeometry(0.2, 10, 8), std('#9be15d')), -0.25, 4.55, 0, g);
    } else if (kind === 'plush') {
      add(new T.Mesh(new T.SphereGeometry(0.5, 14, 10), std('#7fc95a')), 0, 3.8, 0, g);
      add(new T.Mesh(new T.SphereGeometry(0.38, 14, 10), std('#7fc95a')), 0, 4.55, 0.15, g);
      [-1, 1].forEach(function (s) { add(new T.Mesh(new T.SphereGeometry(0.06, 8, 6), std('#1b2a33')), s * 0.14, 4.62, 0.48, g); });
    } else if (kind === 'camera') {
      add(box(1.1, 0.75, 0.5, '#39b6ff'), 0, 3.9, 0, g);
      add(cyl(0.25, 0.25, 0.35, '#1b2a33', 16), 0, 3.9, 0.35, g).rotation.x = Math.PI / 2;
    }
  }
  function buildStand(p) {
    var g = new T.Group(); g.position.set(p.x, 0, p.z);
    var face = p.x < 0 ? Math.PI / 2 : -Math.PI / 2; /* mira hacia la avenida */
    g.rotation.y = face;
    add(box(3.2, 1.1, 1.6, '#f4ece0'), 0, 0.55, 0, g);
    add(box(3.3, 0.12, 1.8, p.color), 0, 1.15, 0, g);
    [-1.4, 1.4].forEach(function (x) { add(cyl(0.07, 0.07, 1.9, '#ffffff', 8), x, 2.1, 0.7, g); add(cyl(0.07, 0.07, 1.9, '#ffffff', 8), x, 2.1, -0.7, g); });
    for (var i = 0; i < 6; i++) { var st = add(box(0.55, 0.12, 2.1, i % 2 ? '#ffffff' : p.color), -1.375 + i * 0.55, 3.1, 0.1, g); st.rotation.x = -0.18; }
    add(box(0.6, 1.2, 0.3, '#ffffff'), -1.0, 1.75, -0.2, g);
    propFor(p.prop, g);
    sign(p.name, p.color, 0, 2.55, 0.92, 2.9, g);
    scene.add(g);
    return g;
  }
  function buildGate(p) {
    var g = new T.Group(); g.position.set(p.x, 0, p.z);
    [-5, 5].forEach(function (x) { add(box(1.4, 6, 1.4, '#efe6d2', { flat: true }), x, 3, 0, g); add(new T.Mesh(new T.ConeGeometry(1.1, 1.2, 4), std('#2fb36b', { flat: true })), x, 6.6, 0, g).rotation.y = Math.PI / 4; });
    add(box(11.4, 1.4, 1.2, '#2fb36b'), 0, 5.5, 0, g);
    sign('DINO PARK', '#ffc93c', 0, 5.5, 0.65, 7, g);
    add(box(2.2, 1.6, 1.4, '#efe6d2'), 7.6, 0.8, 0, g);
    sign('Boletería', '#16302a', 7.6, 1.9, 0.75, 2.2, g);
    scene.add(g); return g;
  }
  function buildPlayground(p) {
    var g = new T.Group(); g.position.set(p.x, 0, p.z);
    var base = add(cyl(6, 6, 0.08, '#ffd98a', 32), 0, 0.04, 0, g);
    add(box(2, 2.4, 2, '#ff6b57'), -2, 1.2, 0, g);
    add(new T.Mesh(new T.ConeGeometry(1.6, 1.4, 4), std('#ffc93c', { flat: true })), -2, 3.1, 0, g).rotation.y = Math.PI / 4;
    var slide = add(box(1, 0.15, 4, '#39b6ff'), -2, 1.2, 2.6, g); slide.rotation.x = 0.55;
    var fr = new T.Group(); fr.position.set(2.5, 0, 0); g.add(fr);
    [-1.6, 1.6].forEach(function (x) { var l = add(cyl(0.1, 0.1, 3.2, '#8a63ff', 8), x, 1.5, 0, fr); l.rotation.z = x > 0 ? 0.15 : -0.15; });
    add(cyl(0.1, 0.1, 3.4, '#8a63ff', 8), 0, 3.05, 0, fr).rotation.z = Math.PI / 2;
    [-0.7, 0.7].forEach(function (x) { add(cyl(0.02, 0.02, 2, '#cccccc', 4), x, 2, 0, fr); add(box(0.6, 0.08, 0.35, '#ff7fb0'), x, 1, 0, fr); });
    sign(p.name, '#ff6b57', 0, 4.4, 0, 5, g);
    scene.add(g); return g;
  }
  function buildBBQ(p) {
    var g = new T.Group(); g.position.set(p.x, 0, p.z);
    add(box(9, 0.1, 6, '#c9a77a'), 0, 0.05, 0, g);
    [[-4, -2.6], [4, -2.6], [-4, 2.6], [4, 2.6]].forEach(function (q) { add(box(0.3, 3, 0.3, '#7a4e22'), q[0], 1.5, q[1], g); });
    add(box(9.4, 0.25, 6.4, '#a8432e'), 0, 3.1, 0, g);
    [-2, 2].forEach(function (x) {
      add(box(2.4, 0.15, 1.1, '#9a6a3a'), x, 0.8, 0.5, g);
      add(box(2.4, 0.1, 0.35, '#7a4e22'), x, 0.45, 1.3, g); add(box(2.4, 0.1, 0.35, '#7a4e22'), x, 0.45, -0.3, g);
    });
    add(box(1.4, 0.9, 0.8, '#2b2b2b', { m: 0.5, r: 0.4 }), 0, 0.45, -2.3, g);
    add(box(1.3, 0.05, 0.7, '#ff5a10', { em: '#ff4a10', ei: 1.2 }), 0, 0.92, -2.3, g);
    for (var i = 0; i < 3; i++) { var sp = DC.FX.sprite('soft', '#e8e1da', 1.2, false); sp.material.opacity = 0.4; sp.position.set(0, 1.6 + i * 0.8, -2.3); g.add(sp); smoke.push({ s: sp, t: i / 3, y0: 1.4 }); }
    sign(p.name, '#a8432e', 0, 3.9, 0, 5, g);
    scene.add(g); return g;
  }
  var smoke = [], vrRing = null;
  function buildVR(p) {
    var g = new T.Group(); g.position.set(p.x, 0, p.z);
    add(cyl(3.6, 3.8, 0.3, '#2b2f4a', 32), 0, 0.15, 0, g);
    var dome = add(new T.Mesh(new T.SphereGeometry(3.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), std('#4a3f8f', { r: 0.3, m: 0.3 })), 0, 0.3, 0, g);
    add(box(1.8, 2.2, 0.6, '#16182a'), 0, 1.4, 3.0, g);
    vrRing = add(new T.Mesh(new T.TorusGeometry(3.4, 0.08, 8, 64), new T.MeshBasicMaterial({ color: '#39f0ff' })), 0, 1.2, 0, g);
    vrRing.rotation.x = Math.PI / 2;
    var gog = new T.Group(); gog.position.set(0, 4.6, 0); g.add(gog);
    add(box(1.6, 0.7, 0.5, '#ffffff'), 0, 0, 0, gog);
    add(box(1.5, 0.55, 0.1, '#39f0ff', { em: '#39f0ff', ei: 0.8 }), 0, 0, 0.27, gog);
    add(box(1.9, 0.12, 0.12, '#8a63ff'), 0, 0, -0.3, gog);
    g.userData.gog = gog;
    sign(p.name, '#8a63ff', 0, 3.9, 3.35, 4.8, g);
    scene.add(g); return g;
  }

  /* ---------------- Escenario ---------------- */
  function tree(x, z, s) {
    var g = new T.Group(); g.position.set(x, 0, z); scene.add(g);
    add(cyl(0.18 * s, 0.3 * s, 3 * s, '#6b4a32', 6), 0, 1.5 * s, 0, g);
    for (var i = 0; i < 3; i++) add(new T.Mesh(new T.ConeGeometry((1.6 - i * 0.38) * s, 1.4 * s, 7), std(i % 2 ? '#2f7a3f' : '#3d8f49', { flat: true })), 0, (2.6 + i * 0.8) * s, 0, g);
  }
  function build() {
    built = true;
    renderer = new T.WebGLRenderer({ antialias: !S().settings.lite });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, S().settings.lite ? 1 : 1.75));
    renderer.shadowMap.enabled = !S().settings.lite;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.domElement.className = 'walk-canvas';
    scene = new T.Scene();
    scene.background = new T.Color('#9fdcff');
    scene.fog = new T.Fog('#bfe8ff', 60, 150);
    cam = new T.PerspectiveCamera(55, 1, 0.1, 400);
    scene.add(new T.HemisphereLight('#ffffff', '#7a9a5a', 0.8));
    var sun = new T.DirectionalLight('#fff2d8', 0.95);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    var sc = sun.shadow.camera; sc.left = -40; sc.right = 40; sc.top = 40; sc.bottom = -40; sc.far = 120;
    sun.shadow.bias = -0.0005;
    scene.add(sun); scene.add(sun.target);
    W.sun = sun;
    var P = DC.PARK;
    var grass = new T.Mesh(new T.CircleGeometry(220, 64), std('#86c35e', { r: 1 }));
    grass.rotation.x = -Math.PI / 2; grass.receiveShadow = true; scene.add(grass);
    /* volcanes al fondo */
    [[40, -150, 60, 48, true], [-70, -140, 70, 36, true], [110, -120, 55, 28, false]].forEach(function (v) {
      add(new T.Mesh(new T.ConeGeometry(v[2], v[3], 32), std('#8a7663', { flat: true })), v[0], v[3] / 2 - 1, v[1]);
      if (v[4]) add(new T.Mesh(new T.ConeGeometry(v[2] * 0.25, v[3] * 0.25, 32), std('#f7f4ee', { flat: true })), v[0], v[3] - v[3] * 0.125 - 0.6, v[1]);
    });
    /* caminos de sillar: anillo + avenida + rayos a cada hábitat */
    var pathM = std('#efe6d2', { r: 0.95 });
    var ring = new T.Mesh(new T.RingGeometry(30, 34, 96), pathM); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; ring.receiveShadow = true; scene.add(ring);
    var ave = new T.Mesh(new T.PlaneGeometry(8, 70), pathM); ave.rotation.x = -Math.PI / 2; ave.position.set(0, 0.025, 40); ave.receiveShadow = true; scene.add(ave);
    var plaza = add(cyl(9, 9, 0.06, '#f4ecdc', 48), 0, 0.03, 0);
    add(cyl(1.4, 1.8, 2, '#e2d6bd', 20), 0, 1, 0);
    W.orb = add(new T.Mesh(new T.SphereGeometry(1.4, 32, 20), new T.MeshStandardMaterial({ color: '#ffb23d', emissive: '#f08a12', emissiveIntensity: 0.45, roughness: 0.2 })), 0, 3.4, 0);
    add(new T.Mesh(new T.TorusGeometry(1.42, 0.14, 10, 40), std('#2a1a0f', { r: 0.4 })), 0, 3.4, 0).rotation.x = Math.PI / 2;
    Object.keys(P.zones).forEach(function (id) {
      var z = P.zones[id], zone = DC.ZONES[id - 1];
      var len = Math.hypot(z.x, z.z);
      var path = new T.Mesh(new T.PlaneGeometry(5, len - 9 - z.r + 2), pathM);
      path.rotation.x = -Math.PI / 2; path.rotation.z = -Math.atan2(z.x, z.z) + Math.PI;
      var mid = (9 + len - z.r) / 2 / len;
      path.position.set(z.x * mid, 0.022, z.z * mid); path.receiveShadow = true; scene.add(path);
      var col = ['#b3dc72', '#3f8f4c', '#8fd3a0', '#c4a882', '#6a5a52'][id - 1];
      add(cyl(z.r, z.r + 0.5, 0.08, col, 40), z.x, 0.04, z.z);
      sign(zone.short, zone.color, z.x, 6.5, z.z, 6).userData.billboard = true;
      if (+id === 1) for (var f = 0; f < 50; f++) { var a = rnd() * 6.28, r = rnd() * z.r * 0.9; add(new T.Mesh(new T.SphereGeometry(0.15, 6, 4), std(['#ff7aa8', '#ffd84d', '#ffffff', '#b18cff'][f % 4])), z.x + Math.cos(a) * r, 0.2, z.z + Math.sin(a) * r); }
      if (+id === 2) for (var t = 0; t < 14; t++) { var a2 = rnd() * 6.28, r2 = 3 + rnd() * (z.r - 3); tree(z.x + Math.cos(a2) * r2, z.z + Math.sin(a2) * r2, 0.9 + rnd() * 0.6); }
      if (+id === 3) { var lk = add(cyl(z.r - 3, z.r - 3, 0.1, '#3bb3d6', 40, { r: 0.15, m: 0.2 }), z.x + 2, 0.09, z.z - 1); lk.receiveShadow = true; }
      if (+id === 4) { add(cyl(z.r * 0.55, z.r * 0.75, 5, '#b9946c', 9, { flat: true }), z.x - 3, 2.5, z.z - 3); add(cyl(z.r * 0.56, z.r * 0.56, 0.2, '#8fbf5c', 9, { flat: true }), z.x - 3, 5.05, z.z - 3); }
      if (+id === 5) { add(new T.Mesh(new T.ConeGeometry(z.r * 0.8, 12, 16, 3), std('#5d4c46', { flat: true })), z.x + 6, 6, z.z - 8); add(cyl(1.6, 1.6, 0.2, '#ff6a20', 16, { em: '#ff4a10', ei: 1.4 }), z.x + 6, 11.95, z.z - 8); }
    });
    for (var i = 0; i < 90; i++) {
      var a3 = rnd() * 6.28, d = 20 + rnd() * 55, x = Math.cos(a3) * d, zz = Math.sin(a3) * d;
      var clear = Math.abs(x) < 9 && zz > 0 || (d > 28 && d < 36) || DC.PLACES.concat(DC.REPLICAS).some(function (p) { return Math.hypot(p.x - x, p.z - zz) < 8; }) || Object.keys(P.zones).some(function (k) { var q = P.zones[k]; return Math.hypot(q.x - x, q.z - zz) < q.r + 1; });
      if (!clear) tree(x, zz, 0.8 + rnd() * 0.8);
    }
    /* faroles y bancas a lo largo de la avenida y el anillo */
    function lamp(x, z) {
      var g = new T.Group(); g.position.set(x, 0, z); scene.add(g);
      add(cyl(0.08, 0.12, 3.4, '#2f3b36', 8), 0, 1.7, 0, g);
      add(new T.Mesh(new T.SphereGeometry(0.3, 12, 8), std('#fff4c8', { em: '#ffd27a', ei: 0.6 })), 0, 3.5, 0, g);
    }
    function bench(x, z, ry) {
      var g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
      add(box(1.8, 0.12, 0.5, '#b07a4f'), 0, 0.5, 0, g); add(box(1.8, 0.5, 0.1, '#b07a4f'), 0, 0.8, -0.22, g);
      add(box(0.1, 0.5, 0.45, '#2f3b36'), -0.8, 0.25, 0, g); add(box(0.1, 0.5, 0.45, '#2f3b36'), 0.8, 0.25, 0, g);
    }
    for (var la = 14; la < 66; la += 9) { lamp(-4.6, la); lamp(4.6, la + 4.5); }
    for (var lr = 0; lr < 20; lr++) { var aa = lr / 20 * Math.PI * 2; if (Math.abs(Math.sin(aa)) < 0.2 && Math.cos(aa) > 0) continue; lamp(Math.sin(aa) * 35, Math.cos(aa) * 35); if (lr % 3 === 0) bench(Math.sin(aa + 0.08) * 29, Math.cos(aa + 0.08) * 29, aa + Math.PI); }
    for (var fb = 0; fb < 40; fb++) { var fx = (fb % 2 ? 5.4 : -5.4) + (rnd() - 0.5) * 0.6, fz = 12 + rnd() * 52; add(new T.Mesh(new T.SphereGeometry(0.22, 6, 4), std(['#ff7aa8', '#ffd84d', '#ffffff', '#b18cff', '#ff6b57'][fb % 5])), fx, 0.22, fz); }
    /* lugares */
    DC.PLACES.forEach(function (p) {
      var g = p.kind === 'gate' ? buildGate(p) : p.kind === 'stand' ? buildStand(p) : p.kind === 'playground' ? buildPlayground(p) : p.kind === 'bbq' ? buildBBQ(p) : buildVR(p);
      places3d.push({ p: p, g: g });
    });
    /* réplicas reales sobre pedestal */
    DC.REPLICAS.forEach(function (r) {
      var g = new T.Group(); g.position.set(r.x, 0, r.z); scene.add(g);
      add(cyl(3, 3.4, 0.9, '#e9dfc7', 24), 0, 0.45, 0, g);
      var beam = new T.Mesh(new T.CylinderGeometry(2.6, 2.6, 24, 24, 1, true), new T.MeshBasicMaterial({ color: '#ffc93c', transparent: true, opacity: 0.16, side: T.DoubleSide, depthWrite: false }));
      beam.position.y = 12; g.add(beam);
      var halo = new T.Mesh(new T.TorusGeometry(3.2, 0.12, 8, 48), new T.MeshBasicMaterial({ color: '#ffc93c' })); halo.rotation.x = Math.PI / 2; halo.position.y = 1; g.add(halo);
      replicas3d.push({ r: r, g: g, halo: halo, actor: null });
    });
    avatar = buildAvatar();
    scene.add(avatar);
    placeReplicaActors();
    bindInput();
  }
  function placeReplicaActors() {
    replicas3d.forEach(function (o) {
      if (o.actor) { o.g.remove(o.actor.root); o.actor.dispose(); }
      var sp = DC.SP[o.r.sp];
      var a = new DC.Models.Actor(sp);
      a.root.scale.setScalar(sp.id === 'trex' ? 2.4 : sp.id === 'spinosaurus' ? 2.2 : sp.model.kind === 'ptero' ? 2 : 2);
      a.root.position.y = 0.9;
      a.root.rotation.y = Math.atan2(-o.r.x, -o.r.z) + Math.PI * 2;
      a.root.traverse(function (m) { if (m.isMesh) m.castShadow = true; });
      o.g.add(a.root); o.actor = a;
    });
  }
  W.modelsChanged = function () { if (built) { placeReplicaActors(); dinos.forEach(function (d) { d.dead = true; }); } };

  /* ---------------- Dinosaurios salvajes ---------------- */
  function zoneAt(x, z) {
    var best = null, bd = 1e9;
    Object.keys(DC.PARK.zones).forEach(function (k) { var q = DC.PARK.zones[k], d = Math.hypot(q.x - x, q.z - z); if (d < bd) { bd = d; best = +k; } });
    return { id: best, d: bd, inside: bd < DC.PARK.zones[best].r + 6 };
  }
  function spawnDino() {
    if (dinos.length >= 6) return;
    var a = Math.atan2(-Math.cos(camYaw), -Math.sin(camYaw)) + (rnd() - 0.5) * 1.1, d = 8 + rnd() * 14;
    var x = av.x + Math.cos(a) * d, z = av.z + Math.sin(a) * d;
    if (Math.hypot(x, z) > DC.PARK.radius - 4) return;
    var zn = zoneAt(x, z);
    if (!zn.inside && rnd() < 0.3) return;
    var roll = DC.Store.rollEncounter(zn.id);
    var actor = new DC.Models.Actor(roll.sp, { variant: roll.variant });
    actor.root.scale.setScalar(roll.sp.id === 'brachiosaurus' ? 1.1 : 1.35);
    actor.root.position.set(x, 0, z);
    actor.root.traverse(function (m) { if (m.isMesh) m.castShadow = true; });
    scene.add(actor.root);
    var lk = DC.look(roll.variant);
    var mark = new T.Mesh(new T.RingGeometry(1.6, 2.0, 32), new T.MeshBasicMaterial({ color: lk ? lk.chip : DC.RARITY[roll.sp.rarity].color, transparent: true, opacity: 0.85, side: T.DoubleSide, depthWrite: false }));
    mark.rotation.x = -Math.PI / 2; mark.position.set(x, 0.07, z); scene.add(mark);
    var hit = new T.Mesh(new T.SphereGeometry(2.4, 8, 6), new T.MeshBasicMaterial({ visible: false })); hit.position.set(x, 1.2, z); scene.add(hit);
    var dn = { actor: actor, mark: mark, hit: hit, roll: roll, zone: zn.id, born: clock.elapsedTime, wander: rnd() * 6.28, look: lk };
    hit.userData.dino = dn;
    actor.play('spawn');
    DC.FX.burst(new T.Vector3(x, 0.5, z), { color: lk ? lk.aura : '#c9a77a', count: 18, speed: 2, up: true, size: 0.35, additive: !!lk, gravity: -3 });
    dinos.push(dn);
  }
  function removeDino(dn) {
    scene.remove(dn.actor.root); scene.remove(dn.mark); scene.remove(dn.hit);
    dn.actor.dispose(); dn.mark.geometry.dispose(); dn.mark.material.dispose();
    dinos = dinos.filter(function (x) { return x !== dn; });
  }

  /* ---------------- Entrada: joystick, teclado, tocar el suelo, girar ---------------- */
  var ray = new T.Raycaster();
  function bindInput() {
    var c = renderer.domElement, down = null;
    c.addEventListener('pointerdown', function (e) { down = { x: e.clientX, y: e.clientY, yaw: camYaw, pitch: camPitch, moved: 0 }; c.setPointerCapture && c.setPointerCapture(e.pointerId); });
    c.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - down.x, dy = e.clientY - down.y; down.moved = Math.max(down.moved, Math.abs(dx) + Math.abs(dy));
      if (down.moved > 6) { camYaw = down.yaw - dx * 0.006; camPitch = Math.max(0.45, Math.min(1.25, down.pitch + dy * 0.004)); }
    });
    c.addEventListener('pointerup', function (e) { if (down && down.moved < 8) tap(e); down = null; });
    c.addEventListener('wheel', function (e) { e.preventDefault(); camDist = Math.max(9, Math.min(34, camDist + e.deltaY * 0.02)); }, { passive: false });
    window.addEventListener('keydown', function (e) { if (W.open) keys[e.key.toLowerCase()] = true; });
    window.addEventListener('keyup', function (e) { keys[e.key.toLowerCase()] = false; });
  }
  function tap(e) {
    var r = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(new T.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1), cam);
    var hits = ray.intersectObjects(dinos.map(function (d) { return d.hit; }), false);
    if (hits.length) { var dn = hits[0].object.userData.dino; DC.Audio.play('tap'); if (Math.hypot(dn.actor.root.position.x - av.x, dn.actor.root.position.z - av.z) < 16) { engageDino(dn); return; } av.tx = dn.actor.root.position.x; av.tz = dn.actor.root.position.z; return; }
    var rh = ray.intersectObjects(replicas3d.map(function (o) { return o.g; }), true);
    if (rh.length) { var ro = replicas3d.find(function (o) { var p = rh[0].object; while (p) { if (p === o.g) return true; p = p.parent; } return false; }); if (ro) { av.tx = ro.r.x; av.tz = ro.r.z + 4; return; } }
    var pt = ray.ray.intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), 0), new T.Vector3());
    if (pt && !gps.on) { av.tx = pt.x; av.tz = pt.z; DC.FX.ring(new T.Vector3(pt.x, 0.05, pt.z), { color: '#ffc93c', from: 0.3, to: 1.6, life: 0.5 }); }
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
  W._engageFirst = function () { if (dinos[0]) engageDino(dinos[0]); };
  W._state = function () { return { av: av, dinos: dinos.length, near: nearKey, list: dinos.map(function (d) { var p = d.actor.root.position; return [d.roll.sp.id, +p.x.toFixed(1), +p.z.toFixed(1), d.actor.root.scale.x, d.actor.root.visible]; }) }; };

  /* ---------------- HUD ---------------- */
  function hud() {
    var el = $('#walk');
    el.innerHTML = '<div class="walk-host"></div><div class="walk-labels passthru"></div>' +
      '<div class="walk-top"><button class="icon-btn" data-w="exit" aria-label="Volver al menú">' + DC.UI.icon('back') + '</button>' +
      '<div class="where" id="where"></div>' +
      '<div class="walk-side"><button class="icon-btn" data-w="gps" id="gpsbtn" aria-label="Usar GPS">' + DC.UI.icon('map') + '</button>' +
      '<button class="icon-btn" data-w="north" aria-label="Orientar al norte">' + DC.UI.icon('target') + '</button></div></div>' +
      '<div class="walk-res" id="walkres"></div>' +
      '<div class="near-card" id="nearcard" hidden></div>' +
      '<div class="joy" id="joy"><div class="joy-knob"></div></div>' +
      '<div class="walk-help" id="walkhelp">Mueve el joystick o toca el suelo para caminar · arrastra para girar la cámara</div>';
    el.querySelector('.walk-host').appendChild(renderer.domElement);
    bindJoystick($('#joy'));
    hudMode(); hudRes();
  }
  function hudMode() {
    var b = $('#gpsbtn'), j = $('#joy');
    if (b) { b.classList.toggle('on', gps.on); }
    if (j) j.hidden = gps.on;
    var h = $('#walkhelp'); if (h) h.textContent = gps.on ? 'GPS activo: camina por el parque y tu avatar te sigue' : 'Mueve el joystick o toca el suelo para caminar · arrastra para girar la cámara';
  }
  function hudRes() {
    var s = S(), el = $('#walkres'); if (!el) return;
    el.innerHTML = '<span class="cur"><i class="coin-ico"></i><b class="num">' + s.coins + '</b></span><span class="cur"><i class="ball-ico dino"></i><b class="num">' + ((s.spheres || 0) + (s.items.super || 0) + (s.items.ultra || 0)) + '</b></span>';
  }
  W.hudRes = hudRes;
  function placeName() {
    var zn = zoneAt(av.x, av.z);
    if (zn.d < DC.PARK.zones[zn.id].r + 2) return DC.ZONES[zn.id - 1].name;
    if (Math.abs(av.x) < 10 && av.z > 20) return 'Calle de puestos';
    if (Math.hypot(av.x, av.z) < 10) return 'Plaza de la Dinoesfera';
    var pl = DC.PLACES.find(function (p) { return Math.hypot(p.x - av.x, p.z - av.z) < 9; });
    return pl ? pl.name : 'Senderos de Dino Park';
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
      var r = best.o.roll, lk = DC.look(r.variant), nm = r.unique ? r.unique.name : r.sp.name;
      card.className = 'near-card dino';
      card.innerHTML = '<div class="nc-img">' + U.img(r.sp.id, '', nm, r.variant) + '</div><div class="nc-body"><div class="eyebrow">' + (r.unique ? '¡Dinosaurio único!' : lk ? 'Variante ' + U.esc(lk.name) : '¡Un dinosaurio salvaje!') + '</div><b>' + U.esc(nm) + '</b><small>' + U.typeChip(r.sp.type) + ' Nv. ' + r.lvl + ' ' + U.stars(r.sp.rarity) + '</small></div>' +
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
    if (w === 'exit') { W.close(); DC.UI.render(); }
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

  /* ---------------- Bucle ---------------- */
  var tmp = new T.Vector3();
  function loop() {
    raf = requestAnimationFrame(loop);
    var dt = Math.min(0.05, clock.getDelta());
    if (!W.open || W.paused) return;
    var t = clock.elapsedTime;
    /* movimiento */
    var mx = 0, mz = 0;
    if (!gps.on) {
      var kx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
      var kz = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
      var ix = joy.on ? joy.x : kx, iz = joy.on ? joy.y : kz;
      if (ix || iz) { av.tx = null; var cs = Math.cos(camYaw), sn = Math.sin(camYaw); mx = ix * cs + iz * sn; mz = -ix * sn + iz * cs; var l = Math.hypot(mx, mz); if (l > 1) { mx /= l; mz /= l; } }
    }
    if (av.tx !== null) {
      var dx = av.tx - av.x, dz = av.tz - av.z, dd = Math.hypot(dx, dz);
      if (dd > 0.3) { mx = dx / dd * Math.min(1, dd / 2); mz = dz / dd * Math.min(1, dd / 2); } else { av.tx = null; }
    }
    var speed = 9 * Math.hypot(mx, mz);
    if (speed > 0.05) {
      av.x += mx * 9 * dt; av.z += mz * 9 * dt;
      var rr = Math.hypot(av.x, av.z); if (rr > DC.PARK.radius) { av.x *= DC.PARK.radius / rr; av.z *= DC.PARK.radius / rr; }
      var target = Math.atan2(mx, mz), d = target - av.dir;
      while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      av.dir += d * Math.min(1, dt * 10);
      av.phase += dt * 11 * Math.min(1, speed / 6);
    }
    var walking = speed > 0.3, ud = avatar.userData, sw = walking ? Math.sin(av.phase) : 0;
    avatar.position.set(av.x, 0, av.z); avatar.rotation.y = av.dir;
    ud.legs[0].rotation.x = sw * 0.7; ud.legs[1].rotation.x = -sw * 0.7;
    ud.arms[0].rotation.x = -sw * 0.6; ud.arms[1].rotation.x = sw * 0.6;
    ud.body.position.y = walking ? Math.abs(Math.cos(av.phase)) * 0.08 : Math.sin(t * 2) * 0.02;
    ud.pulse.scale.setScalar(1 + (t * 0.8 % 1) * 4); ud.pulse.material.opacity = 0.6 * (1 - (t * 0.8 % 1));
    /* cámara */
    var cx = av.x + Math.sin(camYaw) * Math.cos(camPitch) * camDist, cz = av.z + Math.cos(camYaw) * Math.cos(camPitch) * camDist;
    cam.position.lerp(tmp.set(cx, Math.sin(camPitch) * camDist + 1, cz), Math.min(1, dt * 6));
    cam.lookAt(av.x - Math.sin(camYaw) * 4, 1.6, av.z - Math.cos(camYaw) * 4);
    W.sun.position.set(av.x + 20, 40, av.z + 15); W.sun.target.position.set(av.x, 0, av.z);
    /* dinosaurios */
    spawnT -= dt;
    if (spawnT <= 0) { spawnT = (dinos.length < 3 ? 0.8 : 2) + rnd() * 2; spawnDino(); }
    dinos.slice().forEach(function (dn) {
      var p = dn.actor.root.position, far = Math.hypot(p.x - av.x, p.z - av.z);
      if (dn.dead || far > 45 || t - dn.born > 120) { removeDino(dn); return; }
      dn.wander += dt * 0.4;
      var moving = Math.sin(t * 0.5 + dn.born) > 0.2 && !dn.actor.action;
      dn.actor.walk = moving ? 1 : 0;
      if (moving) { p.x += Math.cos(dn.wander) * dt * 1.2; p.z += Math.sin(dn.wander) * dt * 1.2; dn.actor.root.rotation.y = Math.atan2(Math.cos(dn.wander), Math.sin(dn.wander)); }
      dn.mark.position.set(p.x, 0.07, p.z); dn.hit.position.set(p.x, 1.2, p.z);
      dn.mark.rotation.z += dt;
      if (dn.look && Math.random() < dt * 4) DC.FX.burst(new T.Vector3(p.x + (Math.random() - 0.5) * 2, 0.5 + Math.random() * 2, p.z + (Math.random() - 0.5) * 2), { tex: 'star', color: dn.look.aura, count: 1, speed: 0.3, size: 0.25, gravity: 0.5, life: 0.8 });
      dn.actor.update(dt);
    });
    replicas3d.forEach(function (o) { o.halo.rotation.z += dt * 0.8; o.halo.position.y = 1 + Math.sin(t * 2) * 0.15; if (o.actor) o.actor.update(dt); });
    places3d.forEach(function (o) { if (o.g.userData.gog) { o.g.userData.gog.rotation.y += dt; o.g.userData.gog.position.y = 4.6 + Math.sin(t * 2) * 0.25; } });
    if (vrRing) vrRing.material.color.setHSL((t * 0.1) % 1, 0.9, 0.6);
    smoke.forEach(function (s) { s.t = (s.t + dt * 0.3) % 1; s.s.position.y = s.y0 + s.t * 3; s.s.material.opacity = 0.45 * (1 - s.t); s.s.scale.setScalar(1 + s.t * 1.5); });
    scene.traverse(function () {});
    if (W.orb) W.orb.rotation.y += dt * 0.6;
    DC.FX.update(dt);
    renderer.render(scene, cam);
    /* interfaz */
    W.whereT = (W.whereT || 0) - dt;
    if (W.whereT <= 0) { W.whereT = 0.4; var wh = $('#where'); if (wh) wh.textContent = placeName(); updateNear(); }
    var host = $('#walk'); if (!host) return;
    var w0 = host.clientWidth, h0 = host.clientHeight;
    labelEls.forEach(function (L) {
      var dist = Math.hypot(L.x - av.x, L.z - av.z);
      tmp.set(L.x, L.y, L.z).project(cam);
      var vis = tmp.z < 1 && dist < 60 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1;
      L.el.hidden = !vis;
      if (vis) L.el.style.transform = 'translate(' + ((tmp.x + 1) / 2 * w0) + 'px,' + ((1 - tmp.y) / 2 * h0) + 'px) translate(-50%,-100%)';
    });
  }

  function resize() {
    var host = $('#walk'); if (!host || !renderer) return;
    var w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false); renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%';
    cam.aspect = w / h; cam.fov = w < h ? 68 : 52; cam.updateProjectionMatrix();
  }
  window.addEventListener('resize', function () { if (W.open) resize(); });

  W.openWalk = function () {
    if (!built) {
      build();
      /* la Dinoesfera y los efectos se dibujan también en esta escena */
      DC.FXWalkScene = scene;
    }
    DC.FX.init(scene);
    if (DC.Map3D) DC.Map3D.unmount();
    $('#screens').hidden = true;
    var el = $('#walk'); el.hidden = false;
    if (!el.dataset.bound) { el.addEventListener('click', onHud); el.dataset.bound = '1'; }
    hud(); buildLabels();
    W.open = true; W.paused = false;
    resize();
    if (!raf) loop();
    if (!S().walkTutorial) {
      S().walkTutorial = true; DC.Store.save();
      DC.UI.modal('<div class="stack center-text"><div class="eyebrow">Modo paseo</div><h2>¡Camina por Dino Park!</h2><p class="muted">En el parque, activa el GPS (botón del mapa arriba a la derecha) y tu avatar caminará contigo. Los dinosaurios aparecen a tu alrededor: acércate o tócalos para atraparlos. Busca las réplicas reales con el haz dorado: son los jefes del parque.</p><button class="btn block sun" data-act="close">¡Vamos!</button></div>', { center: true });
    }
  };
  W.close = function () {
    W.open = false;
    stopGPS();
    $('#walk').hidden = true;
    $('#screens').hidden = false;
    DC.FX.init(DC.AR.scene);
  };
  W.pause = function () { W.paused = true; $('#walk').hidden = true; DC.FX.init(DC.AR.scene); };
  W.resume = function () {
    DC.FX.init(scene);
    $('#screens').hidden = true;
    $('#walk').hidden = false; W.paused = false; W.open = true; nearKey = ''; hudRes(); resize();
  };

  DC.Walk = W;
})();
