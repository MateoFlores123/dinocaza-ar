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
  function buildAvatar(a, preview) {
    a = a || S().avatar || {};
    var C = DC.AVATAR_COLORS;
    var skin = a.skin || C.skin[0], shirt = a.shirt || C.shirt[0], pants = a.pants || C.pants[0], hair = a.hair || C.hair[0], hat = a.hat || 'navidad';
    var g = new T.Group();
    var body = new T.Group(); g.add(body);
    var legs = [];
    [-1, 1].forEach(function (sd) {
      var hip = new T.Group(); hip.position.set(sd * 0.18, 0.95, 0); body.add(hip);
      add(cyl(0.12, 0.1, 0.8, pants, 10), 0, -0.4, 0, hip);
      add(box(0.24, 0.14, 0.38, '#3a2a1f'), 0, -0.82, 0.07, hip);
      legs.push(hip);
    });
    add(cyl(0.3, 0.34, 0.75, shirt, 16), 0, 1.35, 0, body);
    add(new T.Mesh(new T.SphereGeometry(0.3, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), std(shirt)), 0, 1.72, 0, body);
    add(box(0.5, 0.55, 0.22, '#f0a53a', { r: 0.6 }), 0, 1.4, -0.32, body); /* mochila */
    add(box(0.42, 0.16, 0.1, '#c97f1c'), 0, 1.25, -0.45, body);
    if (hat === 'navidad' || hat === 'lana') { var sc = add(new T.Mesh(new T.TorusGeometry(0.26, 0.08, 8, 20), std(hat === 'navidad' ? '#d62839' : '#3a7bd5')), 0, 1.76, 0, body); sc.rotation.x = Math.PI / 2; }
    var arms = [];
    [-1, 1].forEach(function (sd) {
      var sh = new T.Group(); sh.position.set(sd * 0.4, 1.62, 0); body.add(sh);
      add(cyl(0.09, 0.08, 0.6, shirt, 8), 0, -0.28, 0, sh);
      add(new T.Mesh(new T.SphereGeometry(0.09, 10, 8), std(skin)), 0, -0.62, 0, sh);
      arms.push(sh);
    });
    var head = add(new T.Mesh(new T.SphereGeometry(0.3, 20, 16), std(skin, { r: 0.6 })), 0, 2.05, 0, body);
    add(new T.Mesh(new T.SphereGeometry(0.315, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.45), std(hair, { r: 0.9 })), 0, 2.07, -0.02, body).rotation.x = -0.35;
    [-1, 1].forEach(function (sd) { add(new T.Mesh(new T.SphereGeometry(0.045, 8, 6), std('#1b2a33', { r: 0.2 })), sd * 0.11, 2.08, 0.27, body); });
    add(new T.Mesh(new T.TorusGeometry(0.08, 0.02, 6, 12, Math.PI), std('#7a2a2a')), 0, 1.97, 0.27, body).rotation.z = Math.PI;
    if (hat === 'safari') {
      add(cyl(0.48, 0.48, 0.04, '#d8b66a', 24), 0, 2.27, 0, body);
      add(cyl(0.25, 0.3, 0.24, '#d8b66a', 20), 0, 2.4, 0, body);
      add(cyl(0.305, 0.305, 0.06, '#7a4e22', 20), 0, 2.32, 0, body);
    } else if (hat === 'navidad') {
      add(cyl(0.33, 0.34, 0.12, '#ffffff', 20), 0, 2.27, 0, body);
      var cn = add(new T.Mesh(new T.ConeGeometry(0.3, 0.6, 18), std('#d62839')), 0, 2.6, -0.06, body); cn.rotation.x = -0.5;
      add(new T.Mesh(new T.SphereGeometry(0.09, 10, 8), std('#ffffff')), 0, 2.82, -0.26, body);
    } else if (hat === 'lana') {
      add(new T.Mesh(new T.SphereGeometry(0.33, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), std('#3a7bd5', { r: 0.95 })), 0, 2.16, 0, body);
      add(cyl(0.34, 0.34, 0.1, '#ffffff', 20), 0, 2.19, 0, body);
      add(new T.Mesh(new T.SphereGeometry(0.1, 10, 8), std('#ffffff')), 0, 2.53, 0, body);
    } else if (hat === 'gorra') {
      add(new T.Mesh(new T.SphereGeometry(0.32, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), std(shirt)), 0, 2.15, 0, body);
      var vis = add(cyl(0.2, 0.2, 0.03, shirt, 16), 0, 2.16, 0.28, body); vis.scale.z = 1.3;
    }
    if (preview) { g.userData = { body: body, legs: legs, arms: arms, head: head }; return g; }
    /* sombra suave, anillo de alcance y flecha guía */
    var sh = new T.Mesh(new T.CircleGeometry(0.6, 24), new T.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.25, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.03; g.add(sh);
    var ring = new T.Mesh(new T.RingGeometry(5.6, 5.85, 64), new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.3, depthWrite: false, side: T.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; g.add(ring);
    var pulse = new T.Mesh(new T.RingGeometry(0.9, 1.1, 48), new T.MeshBasicMaterial({ color: '#ffc93c', transparent: true, opacity: 0.6, depthWrite: false, side: T.DoubleSide }));
    pulse.rotation.x = -Math.PI / 2; pulse.position.y = 0.06; g.add(pulse);
    g.userData = { body: body, legs: legs, arms: arms, head: head, pulse: pulse };
    return g;
  }
  W.buildAvatar = buildAvatar;
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
    sign('¡Feliz Navidad!', '#d62839', 0, 4.3, 0.7, 5, g);
    [-5, 5].forEach(function (x) { var wr = add(new T.Mesh(new T.TorusGeometry(0.6, 0.18, 8, 20), std('#2f7a3f')), x, 4.6, 0.75, g); add(new T.Mesh(new T.SphereGeometry(0.16, 8, 6), std('#d62839')), x, 4.05, 0.85, g); });
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
  var smoke = [], vrRing = null, guide = null;
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
  var BULBS = ['#ff4d4d', '#ffd23f', '#4dc3ff', '#ff7fd0', '#7dff8a'];
  var bulbMats = BULBS.map(function (c) { return new T.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.9, roughness: 0.3 }); });
  function tree(x, z, s, xmas) {
    var g = new T.Group(); g.position.set(x, 0, z); scene.add(g);
    add(cyl(0.18 * s, 0.3 * s, 3 * s, '#6b4a32', 6), 0, 1.5 * s, 0, g);
    for (var i = 0; i < 3; i++) {
      add(new T.Mesh(new T.ConeGeometry((1.6 - i * 0.38) * s, 1.4 * s, 7), std(i % 2 ? '#2f7a3f' : '#3d8f49', { flat: true })), 0, (2.6 + i * 0.8) * s, 0, g);
      add(new T.Mesh(new T.ConeGeometry((0.9 - i * 0.2) * s, 0.4 * s, 7), std('#ffffff', { flat: true })), 0, (3.05 + i * 0.8) * s, 0, g).castShadow = false;
    }
    if (xmas) {
      for (var b = 0; b < 14; b++) {
        var lv = rnd(), y = (2.1 + lv * 2.2) * s, rr = (1.5 - lv * 1.1) * s, an = rnd() * 6.28;
        var m = new T.Mesh(new T.SphereGeometry(0.11 * s, 6, 5), bulbMats[b % bulbMats.length]); m.position.set(Math.cos(an) * rr, y, Math.sin(an) * rr); g.add(m);
        twinkle.push(m);
      }
      add(starMesh(0.35 * s), 0, 4.75 * s, 0, g);
    }
    return g;
  }
  var twinkle = [];
  function starMesh(r) {
    var sh = new T.Shape();
    for (var i = 0; i < 10; i++) { var rr = i % 2 ? r * 0.45 : r, an = i / 10 * Math.PI * 2 + Math.PI / 2; if (i) sh.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); else sh.moveTo(Math.cos(an) * rr, Math.sin(an) * rr); }
    var m = new T.Mesh(new T.ExtrudeGeometry(sh, { depth: r * 0.3, bevelEnabled: false }), std('#ffd23f', { m: 0.4, r: 0.3, em: '#ffb300', ei: 0.8 }));
    m.userData.star = true; stars.push(m); return m;
  }
  var stars = [];
  function gift(x, z, s, c, ry) {
    var g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry || 0; scene.add(g);
    add(box(s, s * 0.8, s, c, { r: 0.6 }), 0, s * 0.4, 0, g);
    add(box(s * 1.02, s * 0.82, s * 0.18, '#ffd23f', { r: 0.4 }), 0, s * 0.4, 0, g);
    add(box(s * 0.18, s * 0.82, s * 1.02, '#ffd23f', { r: 0.4 }), 0, s * 0.4, 0, g);
    add(new T.Mesh(new T.TorusGeometry(s * 0.16, s * 0.05, 6, 12), std('#ffd23f')), -s * 0.12, s * 0.86, 0, g).rotation.y = 0.6;
    add(new T.Mesh(new T.TorusGeometry(s * 0.16, s * 0.05, 6, 12), std('#ffd23f')), s * 0.12, s * 0.86, 0, g).rotation.y = -0.6;
  }
  /* Nieve que cae alrededor de la cámara */
  var snow = null;
  function buildSnow() {
    var n = S().settings.lite ? 350 : 900, pos = new Float32Array(n * 3), sp = new Float32Array(n);
    for (var i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 70; pos[i * 3 + 1] = Math.random() * 30; pos[i * 3 + 2] = (Math.random() - 0.5) * 70; sp[i] = 1.2 + Math.random() * 1.6; }
    var geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    var c = document.createElement('canvas'); c.width = c.height = 32; var g = c.getContext('2d');
    var gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
    var mat = new T.PointsMaterial({ size: 0.35, map: new T.CanvasTexture(c), transparent: true, depthWrite: false, opacity: 0.9 });
    snow = new T.Points(geo, mat); snow.userData.sp = sp; snow.frustumCulled = false; scene.add(snow);
  }
  function updateSnow(dt, t) {
    if (!snow) return;
    var p = snow.geometry.attributes.position.array, sp = snow.userData.sp;
    for (var i = 0; i < sp.length; i++) {
      p[i * 3 + 1] -= sp[i] * dt; p[i * 3] += Math.sin(t + i) * dt * 0.3;
      if (p[i * 3 + 1] < 0) p[i * 3 + 1] += 30;
    }
    snow.geometry.attributes.position.needsUpdate = true;
    snow.position.set(av.x, 0, av.z);
  }
  function build() {
    built = true;
    renderer = new T.WebGLRenderer({ antialias: !S().settings.lite });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, S().settings.lite ? 1 : 1.75));
    renderer.shadowMap.enabled = !S().settings.lite;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.domElement.className = 'walk-canvas';
    scene = new T.Scene();
    scene.background = new T.Color('#bcdcf2');
    scene.fog = new T.Fog('#d7e9f5', 55, 150);
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
    /* Gran árbol de Navidad con la Dinoesfera en la punta */
    tree(0, 0, 3.0, true);
    W.orb = add(new T.Mesh(new T.SphereGeometry(0.9, 32, 20), new T.MeshStandardMaterial({ color: '#ffb23d', emissive: '#f08a12', emissiveIntensity: 0.6, roughness: 0.2 })), 0, 15.6, 0);
    add(new T.Mesh(new T.TorusGeometry(0.92, 0.1, 10, 40), std('#2a1a0f', { r: 0.4 })), 0, 15.6, 0).rotation.x = Math.PI / 2;
    for (var gi = 0; gi < 9; gi++) { var ga = gi / 9 * Math.PI * 2 + 0.3; gift(Math.cos(ga) * (5 + (gi % 2)), Math.sin(ga) * (5 + (gi % 2)), 0.8 + (gi % 3) * 0.25, ['#d62839', '#2a9d5c', '#3a7bd5', '#8a63ff', '#ff7fb0'][gi % 5], ga); }
    /* manchas de nieve */
    var snowM = new T.MeshStandardMaterial({ color: '#ffffff', roughness: 1, transparent: true, opacity: 0.85 });
    for (var sn = 0; sn < 70; sn++) { var sa = rnd() * 6.28, sd = 12 + rnd() * 66, pt = new T.Mesh(new T.CircleGeometry(1 + rnd() * 2.6, 12), snowM); pt.rotation.x = -Math.PI / 2; pt.position.set(Math.cos(sa) * sd, 0.015, Math.sin(sa) * sd); pt.receiveShadow = true; scene.add(pt); }
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
      if (!clear) tree(x, zz, 0.8 + rnd() * 0.8, rnd() < 0.3);
    }
    /* faroles y bancas a lo largo de la avenida y el anillo */
    function lamp(x, z) {
      var g = new T.Group(); g.position.set(x, 0, z); scene.add(g);
      for (var k = 0; k < 6; k++) add(cyl(0.1, 0.1, 0.56, k % 2 ? '#ffffff' : '#d62839', 8), 0, 0.28 + k * 0.56, 0, g);
      add(new T.Mesh(new T.SphereGeometry(0.3, 12, 8), std('#fff4c8', { em: '#ffd27a', ei: 0.6 })), 0, 3.6, 0, g);
      var wr = add(new T.Mesh(new T.TorusGeometry(0.34, 0.11, 8, 16), std('#2f7a3f')), 0, 2.6, 0.12, g);
      add(new T.Mesh(new T.SphereGeometry(0.1, 8, 6), std('#d62839')), 0, 2.28, 0.2, g);
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
    buildSnow();
    /* flecha que guía hacia el próximo hábitat */
    var ash = new T.Shape(); ash.moveTo(0, 1.2); ash.lineTo(0.7, 0.2); ash.lineTo(0.25, 0.2); ash.lineTo(0.25, -0.6); ash.lineTo(-0.25, -0.6); ash.lineTo(-0.25, 0.2); ash.lineTo(-0.7, 0.2); ash.closePath();
    guide = new T.Mesh(new T.ShapeGeometry(ash), new T.MeshBasicMaterial({ color: '#ffc93c', transparent: true, opacity: 0.9, depthWrite: false, side: T.DoubleSide }));
    guide.rotation.order = 'YXZ'; scene.add(guide);
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
  W.modelsChanged = function () { if (built) { placeReplicaActors(); dinos.forEach(function (d) { if (!d.xmas) d.dead = true; }); } };

  /* ---------------- Dinosaurios salvajes ---------------- */
  function zoneAt(x, z) {
    var best = null, bd = 1e9;
    Object.keys(DC.PARK.zones).forEach(function (k) { var q = DC.PARK.zones[k], d = Math.hypot(q.x - x, q.z - z); if (d < bd) { bd = d; best = +k; } });
    return { id: best, d: bd, inside: bd < DC.PARK.zones[best].r + 6 };
  }
  function spawnDino() {
    var zn = zoneAt(av.x, av.z), Z = DC.PARK.zones[zn.id];
    if (zn.d > Z.r + 12) return;                      /* fuera de los hábitats no aparecen */
    if (dinos.filter(function (d) { return d.zone === zn.id; }).length >= 4) return;
    var x, z, ok = false;
    for (var tr = 0; tr < 8 && !ok; tr++) {
      var a = rnd() * 6.28, r = Math.sqrt(rnd()) * Z.r * 0.92;
      x = Z.x + Math.cos(a) * r; z = Z.z + Math.sin(a) * r;
      ok = Math.hypot(x - av.x, z - av.z) > 5 && !DC.REPLICAS.some(function (r) { return Math.hypot(r.x - x, r.z - z) < 7; });
    }
    if (!ok) return;
    var roll = DC.Store.rollEncounter(zn.id);
    var actor = new DC.Models.Actor(roll.sp, { variant: roll.variant });
    actor.root.scale.setScalar(roll.sp.id === 'brachiosaurus' ? 1.1 : 1.35);
    actor.root.position.set(x, 0, z);
    actor.root.traverse(function (m) { if (m.isMesh) m.castShadow = true; });
    scene.add(actor.root);
    var lk = DC.look(roll.variant), xm = roll.xmas || null;
    var mark = new T.Mesh(new T.RingGeometry(1.6, 2.0, 32), new T.MeshBasicMaterial({ color: xm ? '#d62839' : lk ? lk.chip : DC.RARITY[roll.sp.rarity].color, transparent: true, opacity: 0.85, side: T.DoubleSide, depthWrite: false }));
    mark.rotation.x = -Math.PI / 2; mark.position.set(x, 0.07, z); scene.add(mark);
    var hit = new T.Mesh(new T.SphereGeometry(2.4, 8, 6), new T.MeshBasicMaterial({ visible: false })); hit.position.set(x, 1.2, z); scene.add(hit);
    var dn = { actor: actor, mark: mark, hit: hit, roll: roll, zone: zn.id, born: clock.elapsedTime, wander: rnd() * 6.28, look: lk, xmas: xm };
    hit.userData.dino = dn;
    actor.play('spawn');
    DC.FX.burst(new T.Vector3(x, 0.5, z), { color: xm ? '#ffffff' : lk ? lk.aura : '#c9a77a', count: 18, speed: 2, up: true, size: 0.35, additive: !!(lk || xm), gravity: -3 });
    if (xm) DC.UI.toast('¡Un especial navideño apareció en ' + DC.UI.esc(DC.ZONES[zn.id - 1].short) + '!', 'star');
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
  W.walkTo = function (zoneId) { var q = DC.PARK.zones[zoneId]; if (q && !gps.on) { av.tx = q.x; av.tz = q.z; } };
  W.forceSpawn = function (xmasId) { DC.forceXmas = xmasId || null; var zn = zoneAt(av.x, av.z); spawnDino(); };
  W._engageFirst = function () { if (dinos[0]) engageDino(dinos[0]); };
  W._state = function () { return { av: av, dinos: dinos.length, near: nearKey, list: dinos.map(function (d) { var p = d.actor.root.position; return [d.roll.sp.id, +p.x.toFixed(1), +p.z.toFixed(1), d.actor.root.scale.x, d.actor.root.visible]; }) }; };

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
      if (bn) { bn.innerHTML = '<small>Hábitat ' + z.id + ' de 5</small>' + DC.UI.esc(z.name); bn.classList.remove('show'); void bn.offsetWidth; bn.classList.add('show'); }
      DC.Audio.play('appear');
      if (s.visit && s.visit.zones.indexOf(zn.id) < 0) {
        var res = DC.Store.markZone(zn.id);
        if (res.route) setTimeout(function () { DC.UI.toast('¡Recorriste los 5 hábitats! Canchita gratis en Premios', 'gift'); hudRes(); }, 1800);
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
      if (dn.dead || (!dn.xmas && (far > 45 || t - dn.born > 150))) { removeDino(dn); return; }
      dn.wander += dt * 0.4;
      var moving = Math.sin(t * 0.5 + dn.born) > 0.2 && !dn.actor.action;
      dn.actor.walk = moving ? 1 : 0;
      if (moving) { p.x += Math.cos(dn.wander) * dt * 1.2; p.z += Math.sin(dn.wander) * dt * 1.2; dn.actor.root.rotation.y = Math.atan2(Math.cos(dn.wander), Math.sin(dn.wander)); }
      dn.mark.position.set(p.x, 0.07, p.z); dn.hit.position.set(p.x, 1.2, p.z);
      dn.mark.rotation.z += dt;
      if ((dn.look || dn.xmas) && Math.random() < dt * 4) DC.FX.burst(new T.Vector3(p.x + (Math.random() - 0.5) * 2, 0.5 + Math.random() * 2, p.z + (Math.random() - 0.5) * 2), { tex: 'star', color: dn.xmas ? '#ffffff' : dn.look.aura, count: 1, speed: 0.3, size: 0.25, gravity: 0.5, life: 0.8 });
      dn.actor.update(dt);
    });
    replicas3d.forEach(function (o) { o.halo.rotation.z += dt * 0.8; o.halo.position.y = 1 + Math.sin(t * 2) * 0.15; if (o.actor) o.actor.update(dt); });
    places3d.forEach(function (o) { if (o.g.userData.gog) { o.g.userData.gog.rotation.y += dt; o.g.userData.gog.position.y = 4.6 + Math.sin(t * 2) * 0.25; } });
    if (vrRing) vrRing.material.color.setHSL((t * 0.1) % 1, 0.9, 0.6);
    smoke.forEach(function (s) { s.t = (s.t + dt * 0.3) % 1; s.s.position.y = s.y0 + s.t * 3; s.s.material.opacity = 0.45 * (1 - s.t); s.s.scale.setScalar(1 + s.t * 1.5); });
    if (W.orb) W.orb.rotation.y += dt * 0.6;
    updateSnow(dt, t);
    if (Math.random() < dt * 3 && twinkle.length) { var tw = twinkle[Math.floor(Math.random() * twinkle.length)]; tw.visible = !tw.visible; }
    stars.forEach(function (st) { st.rotation.y += dt; });
    if (guide) {
      var gt = W._guide && DC.PARK.zones[W._guide.id];
      guide.visible = !!gt;
      if (gt) { var ang = Math.atan2(gt.x - av.x, gt.z - av.z); guide.position.set(av.x + Math.sin(ang) * 2.6, 0.09, av.z + Math.cos(ang) * 2.6); guide.rotation.set(-Math.PI / 2, 0, 0); guide.rotation.y = ang + Math.PI; guide.rotation.x = -Math.PI / 2; guide.material.opacity = 0.6 + Math.sin(t * 5) * 0.3; }
    }
    DC.FX.update(dt);
    renderer.render(scene, cam);
    /* interfaz */
    W.whereT = (W.whereT || 0) - dt;
    if (W.whereT <= 0) { W.whereT = 0.35; updateWhere(); updateNear(); }
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
      var showTutRef = function showTut() {
        if (document.querySelector('#overlay .modal-back, #overlay .onb')) { setTimeout(showTut, 500); return; }
        DC.UI.modal('<div class="stack center-text tut"><div class="eyebrow">Cómo se juega</div><h2>Camina hasta los hábitats</h2>' +
          '<ul class="tut-list"><li><b>1</b>Usa el joystick (o el GPS en el parque) para caminar.</li><li><b>2</b>Sigue la flecha dorada: los dinosaurios solo aparecen dentro de los 5 hábitats.</li><li><b>3</b>Acércate y toca <i>Atrapar</i>. Gana Dino-puntos y cámbialos por premios.</li><li><b>4</b>Los especiales navideños salen 1 por visita: ¡vuelve varios días!</li></ul>' +
          '<button class="btn block sun" data-act="close">¡A caminar!</button></div>', { center: true });
      };
      setTimeout(showTutRef, 700);
    }
  };
  W.close = function () {
    W.open = false;
    stopGPS();
    $('#walk').hidden = true;
    $('#screens').hidden = false;
    DC.FX.init(DC.AR.scene);
  };
  W.pause = function () { W.paused = true; keys = {}; joy.on = false; $('#walk').hidden = true; DC.FX.init(DC.AR.scene); };
  W.resume = function () {
    DC.FX.init(scene);
    $('#screens').hidden = true;
    W.menu = false;
    $('#walk').hidden = false; W.paused = false; W.open = true; nearKey = ''; hudRes(); resize();
    if (!raf) loop();
  };

  DC.Walk = W;
})();
