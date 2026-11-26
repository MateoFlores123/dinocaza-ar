/* =====================================================================
   DinoCaza AR · world.js
   El parque completo en 3D: cielo con degradado y sol, terreno pintado
   por bioma, caminos de piedra, siete hábitats muy distintos (pradera,
   bosque, laguna con agua animada, cumbre de mesetas, volcán con lava,
   desierto de fósiles y glaciar navideño), vegetación instanciada que se
   mece con el viento, puestos y atracciones, y decoración de Navidad.
   ===================================================================== */
(function () {
  var T = THREE;
  var W = {};
  var scene, U = { time: { value: 0 } }, lite = false;
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  function rr(a, b) { return a + rnd() * (b - a); }
  function std(c, o) { o = o || {}; return new T.MeshStandardMaterial({ color: c, roughness: o.r === undefined ? 0.85 : o.r, metalness: o.m || 0, flatShading: !!o.flat, emissive: o.em || '#000000', emissiveIntensity: o.ei || 0, transparent: !!o.op, opacity: o.op || 1, side: o.ds ? T.DoubleSide : T.FrontSide }); }
  function add(m, x, y, z, p) { m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; m.receiveShadow = true; (p || scene).add(m); return m; }
  function box(w, h, d, c, o) { return new T.Mesh(new T.BoxGeometry(w, h, d), std(c, o)); }
  function cyl(rt, rb, h, c, seg, o) { return new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg || 16), std(c, o)); }
  function grp(x, z, ry, p) { var g = new T.Group(); g.position.set(x || 0, 0, z || 0); g.rotation.y = ry || 0; (p || scene).add(g); return g; }

  /* ---------------- Utilidades de geometría ---------------- */
  var _o = new T.Object3D();
  function mtx(x, y, z, rx, ry, rz, sx, sy, sz) {
    _o.position.set(x || 0, y || 0, z || 0); _o.rotation.set(rx || 0, ry || 0, rz || 0);
    _o.scale.set(sx || 1, sy === undefined ? (sx || 1) : sy, sz === undefined ? (sx || 1) : sz); _o.updateMatrix(); return _o.matrix.clone();
  }
  function part(geo, hex, m) {
    var g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (m) g.applyMatrix4(m);
    var n = g.attributes.position.count, c = new T.Color(hex), a = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    g.setAttribute('color', new T.BufferAttribute(a, 3));
    return g;
  }
  function merge(list) {
    var total = 0; list.forEach(function (g) { total += g.attributes.position.count; });
    var P = new Float32Array(total * 3), C = new Float32Array(total * 3), o = 0;
    list.forEach(function (g) { P.set(g.attributes.position.array, o * 3); C.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; });
    var out = new T.BufferGeometry();
    out.setAttribute('position', new T.BufferAttribute(P, 3)); out.setAttribute('color', new T.BufferAttribute(C, 3));
    out.computeVertexNormals();
    return out;
  }
  /* Viento: dobla la parte alta de cada instancia según el tiempo */
  function windy(mat, amp) {
    mat.onBeforeCompile = function (sh) {
      sh.uniforms.uTime = U.time;
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\n#ifdef USE_INSTANCING\n vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);\n#else\n vec3 ip = vec3(0.0);\n#endif\n' +
        ' float wv = sin(uTime * 1.7 + ip.x * 0.31 + ip.z * 0.23) + 0.35 * sin(uTime * 3.1 + ip.x * 0.7);\n' +
        ' float hh = max(0.0, position.y);\n transformed.x += wv * ' + amp.toFixed(3) + ' * hh * hh; transformed.z += wv * ' + (amp * 0.6).toFixed(3) + ' * hh * hh;');
    };
    return mat;
  }
  var vcMat = {};
  function vmat(key, wind, o) {
    if (vcMat[key]) return vcMat[key];
    o = o || {};
    var m = new T.MeshStandardMaterial({ vertexColors: true, roughness: o.r || 0.85, flatShading: o.flat !== false, metalness: 0, transparent: !!o.op, opacity: o.op || 1, emissive: o.em || '#000000', emissiveIntensity: o.ei || 0 });
    if (wind) windy(m, wind);
    vcMat[key] = m; return m;
  }
  function inst(geo, mat, items, shadow) {
    if (!items.length) return null;
    var im = new T.InstancedMesh(geo, mat, items.length);
    items.forEach(function (it, i) { im.setMatrixAt(i, mtx(it.x, it.y || 0, it.z, it.rx || 0, it.ry || 0, it.rz || 0, it.s || 1, it.sy, it.sz)); if (it.c && im.setColorAt) im.setColorAt(i, new T.Color(it.c)); });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = shadow !== false; im.receiveShadow = true;
    scene.add(im); return im;
  }

  /* ---------------- Formas reutilizables ---------------- */
  var G = {};
  function shapes() {
    G.pine = merge([part(new T.CylinderGeometry(0.22, 0.32, 1.6, 6), '#6b4a32', mtx(0, 0.8, 0)),
      part(new T.ConeGeometry(1.9, 2.2, 7), '#2f7a3f', mtx(0, 2.3, 0)), part(new T.ConeGeometry(1.45, 1.9, 7), '#3a8a48', mtx(0, 3.4, 0)),
      part(new T.ConeGeometry(1.0, 1.6, 7), '#45984f', mtx(0, 4.4, 0)), part(new T.ConeGeometry(0.55, 0.5, 7), '#ffffff', mtx(0, 4.95, 0)),
      part(new T.ConeGeometry(1.0, 0.35, 7), '#f4f8fb', mtx(0, 3.05, 0)), part(new T.ConeGeometry(1.35, 0.35, 7), '#f4f8fb', mtx(0, 1.95, 0))]);
    G.round = merge([part(new T.CylinderGeometry(0.2, 0.32, 2.2, 6), '#7a5236', mtx(0, 1.1, 0)),
      part(new T.IcosahedronGeometry(1.5, 1), '#5aa548', mtx(0, 3.0, 0)), part(new T.IcosahedronGeometry(1.1, 1), '#6db552', mtx(0.9, 2.6, 0.4)),
      part(new T.IcosahedronGeometry(1.0, 1), '#4f9a40', mtx(-0.8, 2.7, -0.3)), part(new T.IcosahedronGeometry(0.9, 1), '#78c05a', mtx(0.1, 3.9, 0.2))]);
    G.jungle = merge([part(new T.CylinderGeometry(0.25, 0.45, 5.5, 7), '#5d4330', mtx(0, 2.75, 0)),
      part(new T.IcosahedronGeometry(2.2, 1), '#2f6f35', mtx(0, 6.2, 0, 0, 0, 0, 1.2, 0.75, 1.2)), part(new T.IcosahedronGeometry(1.6, 1), '#3c8040', mtx(1.4, 5.6, 0.6, 0, 0, 0, 1, 0.7, 1)),
      part(new T.IcosahedronGeometry(1.5, 1), '#285f2d', mtx(-1.3, 5.8, -0.6, 0, 0, 0, 1, 0.7, 1))]);
    var fronds = [];
    for (var i = 0; i < 7; i++) fronds.push(part(new T.ConeGeometry(0.22, 1.7, 4), i % 2 ? '#3f9a4a' : '#4fae55', mtx(Math.cos(i / 7 * 6.28) * 0.55, 0.55, Math.sin(i / 7 * 6.28) * 0.55, Math.cos(i / 7 * 6.28 + 1.57) * 0 + 0, -i / 7 * 6.28, 1.0, 1, 1, 0.35)));
    G.fern = merge(fronds);
    G.grass = merge([part(new T.ConeGeometry(0.07, 0.6, 3), '#7cc05a', mtx(0, 0.3, 0, 0, 0, 0.15)), part(new T.ConeGeometry(0.07, 0.5, 3), '#8ccc63', mtx(0.1, 0.25, 0.05, 0, 0, -0.25)), part(new T.ConeGeometry(0.06, 0.45, 3), '#6db14e', mtx(-0.08, 0.22, -0.06, 0.2, 0, 0))]);
    G.rock = merge([part(new T.DodecahedronGeometry(1, 0), '#9a958c', mtx(0, 0.3, 0, 0, 0, 0, 1, 0.65, 1))]);
    G.dark = merge([part(new T.DodecahedronGeometry(1, 0), '#3a302d', mtx(0, 0.3, 0, 0, 0, 0, 1, 0.7, 1))]);
    G.sandrock = merge([part(new T.DodecahedronGeometry(1, 0), '#c99a63', mtx(0, 0.3, 0, 0, 0, 0, 1, 0.6, 1))]);
    G.mushroom = merge([part(new T.CylinderGeometry(0.18, 0.25, 0.9, 8), '#f4ead6', mtx(0, 0.45, 0)), part(new T.SphereGeometry(0.6, 10, 6, 0, 6.29, 0, 1.6), '#d63a2f', mtx(0, 0.85, 0)),
      part(new T.SphereGeometry(0.09, 5, 4), '#ffffff', mtx(0.3, 1.25, 0.1)), part(new T.SphereGeometry(0.08, 5, 4), '#ffffff', mtx(-0.25, 1.2, 0.25)), part(new T.SphereGeometry(0.07, 5, 4), '#ffffff', mtx(0, 1.4, -0.25))]);
    var reeds = [];
    for (var r = 0; r < 6; r++) { var a = r / 6 * 6.28, h = 1.2 + (r % 3) * 0.3; reeds.push(part(new T.CylinderGeometry(0.03, 0.04, h, 4), '#6f9a3a', mtx(Math.cos(a) * 0.2, h / 2, Math.sin(a) * 0.2, 0, 0, (r - 3) * 0.06))); if (r % 2) reeds.push(part(new T.CylinderGeometry(0.07, 0.07, 0.3, 6), '#6b3f22', mtx(Math.cos(a) * 0.2, h - 0.1, Math.sin(a) * 0.2))); }
    G.reeds = merge(reeds);
    G.cactus = merge([part(new T.CylinderGeometry(0.35, 0.4, 3, 8), '#4c9a4f', mtx(0, 1.5, 0)), part(new T.SphereGeometry(0.35, 8, 6), '#4c9a4f', mtx(0, 3, 0)),
      part(new T.CylinderGeometry(0.22, 0.22, 1.1, 8), '#55a858', mtx(0.7, 1.9, 0)), part(new T.CylinderGeometry(0.2, 0.2, 0.6, 8), '#55a858', mtx(0.45, 1.4, 0, 0, 0, 1.57)), part(new T.SphereGeometry(0.22, 8, 6), '#55a858', mtx(0.7, 2.45, 0)),
      part(new T.CylinderGeometry(0.2, 0.2, 0.9, 8), '#55a858', mtx(-0.6, 1.6, 0)), part(new T.CylinderGeometry(0.18, 0.18, 0.5, 8), '#55a858', mtx(-0.4, 1.2, 0, 0, 0, 1.57)), part(new T.SphereGeometry(0.2, 8, 6), '#ff7aa8', mtx(0, 3.32, 0))]);
    G.deadtree = merge([part(new T.CylinderGeometry(0.15, 0.35, 3.5, 6), '#2b2220', mtx(0, 1.75, 0)), part(new T.CylinderGeometry(0.06, 0.12, 1.6, 5), '#2b2220', mtx(0.5, 2.9, 0, 0, 0, -0.8)), part(new T.CylinderGeometry(0.05, 0.1, 1.3, 5), '#2b2220', mtx(-0.45, 2.6, 0.1, 0, 0, 0.9))]);
    G.ice = merge([part(new T.OctahedronGeometry(0.7, 0), '#bfe9ff', mtx(0, 1.2, 0, 0, 0, 0, 0.6, 1.9, 0.6)), part(new T.OctahedronGeometry(0.5, 0), '#a8ddff', mtx(0.6, 0.8, 0.2, 0, 0, -0.4, 0.5, 1.5, 0.5)), part(new T.OctahedronGeometry(0.45, 0), '#d8f3ff', mtx(-0.5, 0.7, -0.2, 0.2, 0, 0.5, 0.5, 1.4, 0.5))]);
    G.post = merge([part(new T.BoxGeometry(0.22, 1.4, 0.22), '#8a6240', mtx(0, 0.7, 0)), part(new T.BoxGeometry(3.1, 0.14, 0.1), '#9b7048', mtx(1.5, 1.05, 0)), part(new T.BoxGeometry(3.1, 0.14, 0.1), '#9b7048', mtx(1.5, 0.55, 0))]);
    G.dune = merge([part(new T.SphereGeometry(1, 14, 8, 0, 6.29, 0, 1.57), '#e6c487', mtx(0, 0, 0, 0, 0, 0, 1, 0.3, 1.6))]);
    G.snowmound = merge([part(new T.SphereGeometry(1, 14, 8, 0, 6.29, 0, 1.57), '#ffffff', mtx(0, 0, 0, 0, 0, 0, 1, 0.35, 1.3))]);
  }

  /* ---------------- Texturas pintadas a mano (canvas) ---------------- */
  function canvasTex(w, h, draw, rep) {
    var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    var t = new T.CanvasTexture(c); if (rep) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } t.anisotropy = 4; return t;
  }
  function cobble(base, stone, edge) {
    return function (g, w, h) {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      var rows = 6, cols = 5, sw = w / cols, sh = h / rows;
      for (var y = 0; y < rows; y++) for (var x = 0; x < cols + 1; x++) {
        var ox = (y % 2) * sw / 2, px = x * sw - ox + 3, py = y * sh + 3;
        var l = 0.9 + Math.random() * 0.2;
        g.fillStyle = stone; g.globalAlpha = l * 0.9;
        if (g.roundRect) { g.beginPath(); g.roundRect(px, py, sw - 6, sh - 6, 10); g.fill(); } else g.fillRect(px, py, sw - 6, sh - 6);
      }
      g.globalAlpha = 1;
      if (edge) { var gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, edge); gr.addColorStop(0.07, 'rgba(0,0,0,0)'); gr.addColorStop(0.93, 'rgba(0,0,0,0)'); gr.addColorStop(1, edge); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
    };
  }
  function signTex(text, bg, fg) {
    return canvasTex(512, 128, function (g) {
      g.fillStyle = bg; if (g.roundRect) { g.beginPath(); g.roundRect(6, 6, 500, 116, 30); g.fill(); } else g.fillRect(6, 6, 500, 116);
      g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 5; if (g.roundRect) { g.beginPath(); g.roundRect(14, 14, 484, 100, 24); g.stroke(); }
      g.fillStyle = fg || '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      var size = 64; g.font = size + 'px "Lilita One", "Arial Rounded MT Bold", Arial, sans-serif';
      while (g.measureText(text).width > 450 && size > 28) { size -= 4; g.font = size + 'px "Lilita One", Arial, sans-serif'; }
      g.fillText(text, 256, 68);
    });
  }
  function sign(text, bg, x, y, z, w, parent, rotY) {
    var m = new T.Mesh(new T.PlaneGeometry(w, w / 4), new T.MeshBasicMaterial({ map: signTex(text, bg), transparent: true, side: T.DoubleSide }));
    m.position.set(x, y, z); if (rotY) m.rotation.y = rotY; (parent || scene).add(m); return m;
  }
  W.sign = sign;
  var softTex = null;
  function soft() {
    if (softTex) return softTex;
    softTex = canvasTex(64, 64, function (g) { var gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
    return softTex;
  }

  /* ---------------- Cielo, luces, nubes y montañas ---------------- */
  var clouds = [];
  function sky() {
    var sunDir = new T.Vector3(0.45, 0.55, 0.35).normalize();
    var m = new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false, uniforms: { sun: { value: sunDir } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 sun; varying vec3 vP; void main(){ float h = vP.y; vec3 top = vec3(0.28,0.56,0.9); vec3 hor = vec3(0.84,0.93,0.99); vec3 low = vec3(0.78,0.88,0.95);' +
        ' vec3 c = h > 0.0 ? mix(hor, top, smoothstep(0.0, 0.6, h)) : mix(hor, low, smoothstep(0.0, -0.2, h));' +
        ' float s = max(0.0, dot(vP, sun)); c += vec3(1.0,0.92,0.75) * pow(s, 220.0) * 1.2 + vec3(1.0,0.85,0.6) * pow(s, 8.0) * 0.18; gl_FragColor = vec4(c, 1.0); }'
    });
    var s = new T.Mesh(new T.SphereGeometry(900, 32, 16), m); s.renderOrder = -1; scene.add(s);
    var ct = soft();
    for (var i = 0; i < 16; i++) {
      var g = new T.Group(), a = rnd() * 6.28, d = rr(380, 620);
      g.position.set(Math.cos(a) * d, rr(110, 190), Math.sin(a) * d);
      for (var k = 0; k < 5; k++) { var sp = new T.Sprite(new T.SpriteMaterial({ map: ct, color: '#ffffff', transparent: true, opacity: 0.85, depthWrite: false, fog: false })); sp.scale.set(rr(70, 120), rr(35, 55), 1); sp.position.set(rr(-60, 60), rr(-8, 12), rr(-20, 20)); g.add(sp); }
      scene.add(g); clouds.push({ g: g, a: a, d: d, sp: rr(0.002, 0.005) });
    }
    /* Volcanes de Arequipa al fondo: Misti, Chachani y Pichu Pichu */
    [[120, -420, 170, 150, true], [-200, -400, 200, 120, true], [330, -300, 150, 85, false], [-420, -120, 140, 70, false], [430, 120, 120, 60, false]].forEach(function (v) {
      add(new T.Mesh(new T.ConeGeometry(v[2], v[3], 40, 4), std('#8f7d6c', { flat: true })), v[0], v[3] / 2 - 2, v[1]).castShadow = false;
      if (v[4]) add(new T.Mesh(new T.ConeGeometry(v[2] * 0.32, v[3] * 0.32, 40), std('#f7f6f2', { flat: true })), v[0], v[3] - v[3] * 0.16 - 1, v[1]).castShadow = false;
    });
    return sunDir;
  }

  /* ---------------- Terreno pintado por bioma ---------------- */
  var BIOME = { 1: '#a9d46a', 2: '#4c8a3a', 3: '#cfc48c', 4: '#b39674', 5: '#4a3c37', 6: '#e8c88c', 7: '#f2f7fb' };
  function noise(x, z) { return Math.sin(x * 0.11 + Math.sin(z * 0.07) * 2) * 0.5 + Math.sin(z * 0.13 + x * 0.05) * 0.35 + Math.sin((x + z) * 0.31) * 0.15; }
  function sstep(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function terrain() {
    var P = DC.PARK, size = 760, seg = lite ? 150 : 230;
    var geo = new T.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2);
    var pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
    var g1 = new T.Color('#8cc461'), g2 = new T.Color('#74b04f'), snowC = new T.Color('#f4f8fb'), tmp = new T.Color(), bc = {};
    Object.keys(BIOME).forEach(function (k) { bc[k] = new T.Color(BIOME[k]); });
    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i), z = pos.getZ(i), r = Math.hypot(x, z), n = noise(x, z);
      var h = sstep(P.radius + 6, P.radius + 70, r) * (6 + (n + 1) * 10) + sstep(220, 360, r) * 40;
      pos.setY(i, h);
      tmp.copy(g1).lerp(g2, (n + 1) / 2);
      Object.keys(P.zones).forEach(function (k) {
        var q = P.zones[k], d = Math.hypot(x - q.x, z - q.z);
        var w = 1 - sstep(q.r * 0.9, q.r * 1.55, d + n * 3);
        if (w > 0) tmp.lerp(bc[k], w);
      });
      if (n > 0.55 && r < P.radius) tmp.lerp(snowC, 0.45);           /* nieve navideña */
      if (r > P.radius + 20) tmp.lerp(snowC, sstep(200, 300, r) * 0.8);
      col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    var m = new T.Mesh(geo, new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
    m.receiveShadow = true; scene.add(m);
  }

  /* ---------------- Caminos ---------------- */
  var SPOKE_IN = 47, RING = 44;
  function pathDist(x, z) {
    var best = 1e9, r = Math.hypot(x, z);
    best = Math.min(best, Math.abs(r - RING) - 3);
    if (z > 10 && z < 118) best = Math.min(best, Math.abs(x) - 4.5);
    if (r < 16) best = -1;
    Object.keys(DC.PARK.zones).forEach(function (k) {
      var q = DC.PARK.zones[k], L = Math.hypot(q.x, q.z), ux = q.x / L, uz = q.z / L;
      var t = x * ux + z * uz;
      if (t > SPOKE_IN - 2 && t < L) best = Math.min(best, Math.abs(-x * uz + z * ux) - 3);
    });
    return best;
  }
  W.pathDist = pathDist;
  function paths() {
    var tex = canvasTex(256, 256, cobble('#d9ccb0', '#efe6d2', 'rgba(120,96,64,0.55)'), [1, 12]);
    var am = new T.MeshStandardMaterial({ map: tex, roughness: 0.95 });
    var ave = new T.Mesh(new T.PlaneGeometry(9, 104), am); ave.rotation.x = -Math.PI / 2; ave.position.set(0, 0.04, 64); ave.receiveShadow = true; scene.add(ave);
    var rtex = canvasTex(256, 256, cobble('#d9ccb0', '#efe6d2'), [18, 18]);
    var ring = new T.Mesh(new T.RingGeometry(RING - 3.2, RING + 3.2, 160, 1), new T.MeshStandardMaterial({ map: rtex, roughness: 0.95 }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.035; ring.receiveShadow = true; scene.add(ring);
    [RING - 3.2, RING + 3.2].forEach(function (rr0) { var e = new T.Mesh(new T.RingGeometry(rr0 - 0.25, rr0 + 0.25, 160, 1), std('#9c8a6a')); e.rotation.x = -Math.PI / 2; e.position.y = 0.045; scene.add(e); });
    Object.keys(DC.PARK.zones).forEach(function (k) {
      var q = DC.PARK.zones[k], L = Math.hypot(q.x, q.z), len = L - SPOKE_IN;
      var t2 = canvasTex(256, 256, cobble('#d9ccb0', '#efe6d2', 'rgba(120,96,64,0.55)'), [1, Math.round(len / 8)]);
      var p = new T.Mesh(new T.PlaneGeometry(6, len), new T.MeshStandardMaterial({ map: t2, roughness: 0.95 }));
      p.rotation.x = -Math.PI / 2; p.rotation.z = Math.atan2(q.x, q.z) + Math.PI;
      var mid = (SPOKE_IN + L) / 2 / L; p.position.set(q.x * mid, 0.03, q.z * mid); p.receiveShadow = true; scene.add(p);
    });
    /* Plaza central con mosaico radial */
    var pt = canvasTex(512, 512, function (g, w) {
      g.fillStyle = '#efe4cc'; g.fillRect(0, 0, w, w);
      for (var ring2 = 1; ring2 < 9; ring2++) { g.strokeStyle = ring2 % 2 ? '#d6c7a6' : '#e2b86a'; g.lineWidth = ring2 % 2 ? 6 : 10; g.beginPath(); g.arc(w / 2, w / 2, ring2 * 30, 0, 6.29); g.stroke(); }
      for (var a = 0; a < 16; a++) { g.strokeStyle = '#d6c7a6'; g.lineWidth = 4; g.beginPath(); g.moveTo(w / 2, w / 2); g.lineTo(w / 2 + Math.cos(a / 16 * 6.28) * 250, w / 2 + Math.sin(a / 16 * 6.28) * 250); g.stroke(); }
    });
    var plaza = new T.Mesh(new T.CircleGeometry(16, 64), new T.MeshStandardMaterial({ map: pt, roughness: 0.9 }));
    plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.05; plaza.receiveShadow = true; scene.add(plaza);
    var curb = new T.Mesh(new T.TorusGeometry(16, 0.35, 6, 80), std('#bfae8c')); curb.rotation.x = Math.PI / 2; curb.position.y = 0.08; scene.add(curb);
  }

  /* ---------------- Navidad: árboles con luces, regalos, faroles ---------------- */
  var BULBS = ['#ff4d4d', '#ffd23f', '#4dc3ff', '#ff7fd0', '#7dff8a'];
  var bulbMats = null, twinkle = [], stars = [];
  function starMesh(r) {
    var sh = new T.Shape();
    for (var i = 0; i < 10; i++) { var rr0 = i % 2 ? r * 0.45 : r, an = i / 10 * Math.PI * 2 + Math.PI / 2; if (i) sh.lineTo(Math.cos(an) * rr0, Math.sin(an) * rr0); else sh.moveTo(Math.cos(an) * rr0, Math.sin(an) * rr0); }
    var m = new T.Mesh(new T.ExtrudeGeometry(sh, { depth: r * 0.3, bevelEnabled: false }), std('#ffd23f', { m: 0.4, r: 0.3, em: '#ffb300', ei: 1.4 }));
    stars.push(m); return m;
  }
  function xtree(x, z, s, parent) {
    var g = grp(x, z, rnd() * 6, parent);
    var t = new T.Mesh(G.pine, vmat('pine', 0.004)); t.scale.setScalar(s); t.castShadow = true; g.add(t);
    for (var b = 0; b < 16; b++) {
      var lv = rnd(), y = (1.7 + lv * 2.9) * s, r0 = (1.75 - lv * 1.35) * s, an = rnd() * 6.28;
      var m = new T.Mesh(new T.SphereGeometry(0.12 * s, 6, 5), bulbMats[b % bulbMats.length]); m.position.set(Math.cos(an) * r0, y, Math.sin(an) * r0); g.add(m); twinkle.push(m);
    }
    var st = starMesh(0.4 * s); st.position.y = 5.35 * s; g.add(st);
    return g;
  }
  function gift(x, z, s, c, ry, parent) {
    var g = grp(x, z, ry || 0, parent);
    add(box(s, s * 0.8, s, c, { r: 0.6 }), 0, s * 0.4, 0, g);
    add(box(s * 1.02, s * 0.82, s * 0.18, '#ffd23f', { r: 0.4 }), 0, s * 0.4, 0, g);
    add(box(s * 0.18, s * 0.82, s * 1.02, '#ffd23f', { r: 0.4 }), 0, s * 0.4, 0, g);
    add(new T.Mesh(new T.TorusGeometry(s * 0.16, s * 0.05, 6, 12), std('#ffd23f')), -s * 0.12, s * 0.86, 0, g).rotation.y = 0.6;
    add(new T.Mesh(new T.TorusGeometry(s * 0.16, s * 0.05, 6, 12), std('#ffd23f')), s * 0.12, s * 0.86, 0, g).rotation.y = -0.6;
    return g;
  }
  var lampParts = null;
  function lamps(list) {
    /* Faroles de bastón de caramelo con corona (instanciados) */
    var stripe = merge([0, 1, 2, 3, 4, 5].map(function (k) { return part(new T.CylinderGeometry(0.1, 0.1, 0.56, 8), k % 2 ? '#ffffff' : '#d62839', mtx(0, 0.28 + k * 0.56, 0)); })
      .concat([part(new T.TorusGeometry(0.34, 0.11, 6, 14), '#2f7a3f', mtx(0, 2.6, 0.12)), part(new T.SphereGeometry(0.1, 6, 5), '#d62839', mtx(0, 2.28, 0.2)), part(new T.CylinderGeometry(0.25, 0.2, 0.12, 8), '#2f3b36', mtx(0, 3.4, 0))]));
    inst(stripe, vmat('lamp', 0, { flat: false }), list);
    inst(new T.SphereGeometry(0.3, 12, 8), new T.MeshStandardMaterial({ color: '#fff4c8', emissive: '#ffd27a', emissiveIntensity: 1.2 }), list.map(function (l) { return { x: l.x, z: l.z, y: 3.62, ry: l.ry }; }), false);
  }
  function benches(list) {
    var b = merge([part(new T.BoxGeometry(1.8, 0.12, 0.5), '#b07a4f', mtx(0, 0.5, 0)), part(new T.BoxGeometry(1.8, 0.45, 0.1), '#b07a4f', mtx(0, 0.82, -0.22)),
      part(new T.BoxGeometry(0.1, 0.5, 0.45), '#2f3b36', mtx(-0.8, 0.25, 0)), part(new T.BoxGeometry(0.1, 0.5, 0.45), '#2f3b36', mtx(0.8, 0.25, 0))]);
    inst(b, vmat('bench'), list);
  }

  /* ---------------- Shaders: agua, lava, aurora ---------------- */
  function waterMat() {
    return new T.ShaderMaterial({
      uniforms: { uTime: U.time }, transparent: true,
      vertexShader: 'varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: 'uniform float uTime; varying vec2 vUv; varying vec3 vW; void main(){ float d = length(vUv - 0.5) * 2.0;' +
        ' vec3 deep = vec3(0.08,0.42,0.6); vec3 shal = vec3(0.36,0.8,0.86); vec3 c = mix(deep, shal, smoothstep(0.45, 1.0, d));' +
        ' float r = sin(vW.x * 1.1 + uTime * 1.4) * sin(vW.z * 0.9 - uTime * 1.1); c += r * 0.035;' +
        ' float sp = pow(max(0.0, sin(vW.x * 2.6 + uTime * 2.0) * sin(vW.z * 2.2 + uTime * 1.6)), 14.0); c += sp * 0.6;' +
        ' float foam = smoothstep(0.9, 0.985, d + sin(atan(vUv.y-0.5, vUv.x-0.5) * 9.0 + uTime * 2.0) * 0.01); c = mix(c, vec3(0.97), foam * 0.85);' +
        ' gl_FragColor = vec4(c, mix(0.88, 1.0, foam)); }'
    });
  }
  function lavaMat() {
    return new T.ShaderMaterial({
      uniforms: { uTime: U.time },
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: 'uniform float uTime; varying vec3 vW; void main(){ float n = sin(vW.x * 0.7 + uTime * 0.5) * sin(vW.z * 0.8 - uTime * 0.7) + 0.5 * sin((vW.x - vW.z) * 1.9 + uTime * 1.2) + 0.25 * sin(vW.y * 3.0 - uTime * 2.0);' +
        ' vec3 c = mix(vec3(0.75,0.1,0.02), vec3(1.0,0.78,0.12), smoothstep(-0.5, 1.1, n)); gl_FragColor = vec4(c * 1.35, 1.0); }'
    });
  }
  function auroraMat() {
    return new T.ShaderMaterial({
      uniforms: { uTime: U.time }, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
      vertexShader: 'varying vec2 vUv; uniform float uTime; void main(){ vUv = uv; vec3 p = position; p.z += sin(p.x * 0.05 + uTime * 0.4) * 12.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0); }',
      fragmentShader: 'uniform float uTime; varying vec2 vUv; void main(){ float band = smoothstep(0.0, 0.35, vUv.y) * (1.0 - smoothstep(0.55, 1.0, vUv.y));' +
        ' float w = 0.5 + 0.5 * sin(vUv.x * 18.0 + uTime * 0.8) * sin(vUv.x * 7.0 - uTime * 0.5);' +
        ' vec3 c = mix(vec3(0.2,1.0,0.6), vec3(0.6,0.4,1.0), vUv.y); gl_FragColor = vec4(c * band * w * 0.55, 1.0); }'
    });
  }

  /* ---------------- Hábitats ---------------- */
  var anim = { fireflies: null, smoke: [], ember: [], lakes: [] };
  function clearAt(x, z, pad) {
    if (pathDist(x, z) < pad) return false;
    if (DC.PLACES.some(function (p) { return Math.hypot(p.x - x, p.z - z) < (p.kind === 'stand' ? 5 : 9) + pad; })) return false;
    if (DC.REPLICAS.some(function (p) { return Math.hypot(p.x - x, p.z - z) < 5 + pad; })) return false;
    return true;
  }
  W.clearAt = clearAt;
  function ringPts(q, n, r0, r1, pad, extra) {
    var out = [], tries = 0;
    while (out.length < n && tries++ < n * 12) {
      var a = rnd() * 6.28, d = Math.sqrt(rr(r0 * r0, r1 * r1)), x = q.x + Math.cos(a) * d, z = q.z + Math.sin(a) * d;
      if (!clearAt(x, z, pad || 1.5)) continue;
      if (extra && !extra(x, z)) continue;
      out.push({ x: x, z: z, ry: rnd() * 6.28 });
    }
    return out;
  }
  function arch(q, id) {
    /* Portal de entrada a cada hábitat, mirando a la plaza */
    var z = DC.ZONES[id - 1], L = Math.hypot(q.x, q.z), ux = q.x / L, uz = q.z / L, d = L - q.r - 1;
    var g = grp(ux * d, uz * d, Math.atan2(ux, uz) + Math.PI);
    var postC = { 1: '#8a6240', 2: '#5d4330', 3: '#7a6a55', 4: '#9a7a58', 5: '#3a2e2a', 6: '#c48a4a', 7: '#cfe9f7' }[id];
    [-4, 4].forEach(function (x) { add(cyl(0.45, 0.55, 5.6, postC, 8, { flat: true }), x, 2.8, 0, g); add(new T.Mesh(new T.SphereGeometry(0.6, 10, 8), std(z.color)), x, 5.8, 0, g); });
    var beam = add(box(9.2, 0.5, 0.5, postC), 0, 5.2, 0, g);
    sign(z.name, z.color, 0, 4.2, 0.32, 7.6, g);
    sign(z.name, z.color, 0, 4.2, -0.32, 7.6, g, Math.PI);
    /* guirnalda navideña */
    for (var i = 0; i <= 12; i++) { var t = i / 12, x2 = -4 + t * 8, y2 = 5 - Math.sin(t * Math.PI) * 0.6; var b = new T.Mesh(new T.SphereGeometry(0.11, 6, 5), bulbMats[i % bulbMats.length]); b.position.set(x2, y2, 0.3); g.add(b); twinkle.push(b); }
    return g;
  }
  function habValle(q) {
    var pts = ringPts(q, lite ? 500 : 1400, 0, q.r * 1.3, 0.6);
    inst(G.grass, vmat('grass', 0.18), pts.map(function (p) { p.s = rr(0.8, 1.5); return p; }), false);
    var fl = ringPts(q, lite ? 150 : 400, 0, q.r * 1.25, 0.6);
    inst(new T.IcosahedronGeometry(0.16, 0), windy(new T.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, flatShading: true }), 0.0),
      fl.map(function (p) { p.y = 0.38; p.c = ['#ff7aa8', '#ffd84d', '#ffffff', '#b18cff', '#ff8a4d'][Math.floor(rnd() * 5)]; return p; }), false);
    inst(G.round, vmat('round', 0.02), ringPts(q, 7, q.r * 0.85, q.r * 1.35, 3).map(function (p) { p.s = rr(0.9, 1.3); return p; }));
    inst(G.rock, vmat('rock'), ringPts(q, 10, q.r * 0.4, q.r * 1.2, 2).map(function (p) { p.s = rr(0.5, 1.3); return p; }));
    var posts = [];
    for (var a = 0; a < 6.28; a += 0.16) { var x = q.x + Math.cos(a) * q.r * 1.12, z = q.z + Math.sin(a) * q.r * 1.12; if (clearAt(x, z, 2)) posts.push({ x: x, z: z, ry: -a + Math.PI / 2 - 0.08 }); }
    inst(G.post, vmat('post'), posts);
  }
  function habBosque(q) {
    inst(G.jungle, vmat('jungle', 0.004), ringPts(q, lite ? 22 : 38, q.r * 0.55, q.r * 1.45, 3).map(function (p) { p.s = rr(0.8, 1.25); return p; }));
    inst(G.pine, vmat('pine', 0.004), ringPts(q, 14, q.r * 0.7, q.r * 1.5, 3).map(function (p) { p.s = rr(1.0, 1.6); return p; }));
    inst(G.fern, vmat('fern', 0.08), ringPts(q, lite ? 90 : 220, 0, q.r * 1.3, 1).map(function (p) { p.s = rr(0.9, 1.7); return p; }), false);
    inst(G.mushroom, vmat('mush', 0, { flat: false }), ringPts(q, 16, q.r * 0.3, q.r * 1.1, 1.5).map(function (p) { p.s = rr(0.7, 1.8); return p; }));
    var log = add(cyl(0.6, 0.6, 6, '#6b4a32', 10), q.x + q.r * 0.5, 0.55, q.z - q.r * 0.3); log.rotation.z = Math.PI / 2; log.rotation.y = 0.6;
    /* luciérnagas */
    var n = 70, pos = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) { var a = rnd() * 6.28, d = rnd() * q.r; pos[i * 3] = q.x + Math.cos(a) * d; pos[i * 3 + 1] = rr(0.6, 4); pos[i * 3 + 2] = q.z + Math.sin(a) * d; }
    var geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    var pts = new T.Points(geo, new T.PointsMaterial({ size: 0.4, map: soft(), color: '#fff27a', transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
    scene.add(pts); anim.fireflies = { p: pts, base: pos.slice() };
  }
  function habLaguna(q) {
    var lx = q.x - 3, lz = q.z - 4, lr = q.r * 0.62;
    var shore = new T.Mesh(new T.CircleGeometry(lr + 2.2, 64), std('#e2d3a0', { r: 1 })); shore.rotation.x = -Math.PI / 2; shore.position.set(lx, 0.02, lz); shore.receiveShadow = true; scene.add(shore);
    var water = new T.Mesh(new T.CircleGeometry(lr, 64), waterMat()); water.rotation.x = -Math.PI / 2; water.position.set(lx, 0.08, lz); scene.add(water);
    anim.lakes.push({ x: lx, z: lz, r: lr });
    var reeds = [];
    for (var a = 0; a < 6.28; a += 0.12) { if (rnd() < 0.35) continue; var d = lr + rr(-0.4, 1.4); reeds.push({ x: lx + Math.cos(a) * d, z: lz + Math.sin(a) * d, s: rr(0.8, 1.4), ry: rnd() * 6 }); }
    inst(G.reeds, vmat('reeds', 0.06), reeds, false);
    var pads = []; for (var i = 0; i < 18; i++) { var a2 = rnd() * 6.28, d2 = rr(lr * 0.3, lr * 0.9); pads.push({ x: lx + Math.cos(a2) * d2, z: lz + Math.sin(a2) * d2, y: 0.1, s: rr(0.6, 1.1), ry: rnd() * 6 }); }
    inst(new T.CircleGeometry(0.6, 10, 0.3, 5.8).rotateX(-Math.PI / 2), new T.MeshStandardMaterial({ color: '#4f9e45', roughness: 0.7, side: T.DoubleSide }), pads, false);
    inst(new T.IcosahedronGeometry(0.14, 0), new T.MeshStandardMaterial({ color: '#ff9ccf', emissive: '#ff6fb0', emissiveIntensity: 0.3 }), pads.filter(function (p, i) { return i % 3 === 0; }).map(function (p) { return { x: p.x + 0.15, z: p.z, y: 0.22 }; }), false);
    inst(G.rock, vmat('rock'), ringPts(q, 12, lr + 1, q.r * 1.3, 2).map(function (p) { p.s = rr(0.6, 1.6); return p; }));
    inst(G.round, vmat('round', 0.02), ringPts(q, 6, q.r * 1.0, q.r * 1.45, 3).map(function (p) { p.s = rr(0.9, 1.3); return p; }));
    /* muelle de madera */
    var ang = Math.atan2(-q.z, -q.x), px = lx + Math.cos(ang) * (lr - 2), pz = lz + Math.sin(ang) * (lr - 2);
    var pier = grp(px, pz, -ang + Math.PI / 2);
    add(box(2.2, 0.2, 7, '#a77b4f'), 0, 0.5, 0, pier);
    [-0.9, 0.9].forEach(function (x) { [-3, 0, 3].forEach(function (z) { add(cyl(0.12, 0.12, 1.2, '#7a5236', 6), x, 0.2, z, pier); }); });
  }
  function habCumbre(q) {
    var strata = ['#c49a6c', '#b0835a', '#d3ad7d', '#9e7350'];
    for (var i = 0; i < 9; i++) {
      var a = i / 9 * 6.28 + rr(-0.2, 0.2), d = q.r * rr(1.0, 1.35), x = q.x + Math.cos(a) * d, z = q.z + Math.sin(a) * d;
      if (!clearAt(x, z, 5)) continue;
      var g = grp(x, z, rnd() * 6), rad = rr(2.5, 4.5), h = 0;
      var layers = 3 + Math.floor(rnd() * 3);
      for (var l = 0; l < layers; l++) { var lh = rr(1.4, 2.4); add(cyl(rad * (1 - l * 0.08), rad * (1.04 - l * 0.08), lh, strata[l % 4], 7, { flat: true }), 0, h + lh / 2, 0, g); h += lh; }
      add(cyl(rad * 0.78, rad * 0.82, 0.3, '#8fbf5c', 7, { flat: true }), 0, h + 0.15, 0, g);
    }
    inst(G.rock, vmat('rock'), ringPts(q, 16, q.r * 0.3, q.r * 1.2, 2).map(function (p) { p.s = rr(0.6, 1.8); return p; }));
    inst(G.grass, vmat('grass', 0.18), ringPts(q, lite ? 200 : 500, 0, q.r * 1.2, 0.6).map(function (p) { p.s = rr(0.7, 1.2); return p; }), false);
    /* mirador con banderines */
    var v = grp(q.x + q.r * 0.45, q.z - q.r * 0.25, 0.5);
    add(box(4, 0.3, 4, '#9a7a58'), 0, 1.2, 0, v);
    [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]].forEach(function (c) { add(cyl(0.12, 0.12, 2.4, '#7a5236', 6), c[0], 1.2, c[1], v); });
    add(cyl(0.12, 0.12, 1.2, '#3a3a3a', 8), 0, 2, 0, v); var tel = add(cyl(0.18, 0.12, 1.1, '#2b5aa0', 10), 0, 2.7, 0.2, v); tel.rotation.x = 1.1;
    for (var f = 0; f < 10; f++) { var fl = add(new T.Mesh(new T.ConeGeometry(0.25, 0.5, 3), std(['#ff6b57', '#ffc93c', '#39b6ff', '#8a63ff', '#2fb36b'][f % 5], { ds: true })), -1.8 + f * 0.4, 3.2 - Math.sin(f / 9 * 3.14) * 0.4, -1.8, v); fl.rotation.x = Math.PI; }
    /* nidos con huevos */
    for (var n = 0; n < 3; n++) { var a3 = rnd() * 6.28, d3 = q.r * rr(0.4, 0.8), nx = q.x + Math.cos(a3) * d3, nz = q.z + Math.sin(a3) * d3; if (!clearAt(nx, nz, 2)) continue; add(new T.Mesh(new T.TorusGeometry(0.7, 0.3, 6, 14), std('#8a6a3a', { flat: true })), nx, 0.25, nz).rotation.x = Math.PI / 2; for (var e = 0; e < 3; e++) add(new T.Mesh(new T.SphereGeometry(0.22, 10, 8), std('#f4ecd8')), nx + (e - 1) * 0.3, 0.35, nz + (e % 2) * 0.2).scale.y = 1.3; }
  }
  function habGuarida(q) {
    var vx = q.x + q.r * 1.55, vz = q.z - 4, H = 26, R0 = q.r * 1.15, Rt = 6;
    add(new T.Mesh(new T.CylinderGeometry(Rt, R0, H, 22, 5), std('#3d302c', { flat: true })), vx, H / 2, vz);
    var crater = new T.Mesh(new T.CircleGeometry(Rt - 0.4, 24), lavaMat()); crater.rotation.x = -Math.PI / 2; crater.position.set(vx, H - 0.1, vz); scene.add(crater);
    /* ríos de lava pegados a la ladera (cuñas de un cono apenas más grande) */
    for (var i = 0; i < 5; i++) {
      var th = Math.PI * 0.55 + i * 0.42 + rr(-0.1, 0.1);
      var rv = new T.Mesh(new T.CylinderGeometry(Rt + 0.06, R0 + 0.06, H, 40, 1, true, th, rr(0.07, 0.12)), lavaMat());
      rv.position.set(vx, H / 2, vz); scene.add(rv);
    }
    [[-6, 4, 2.4], [-3, -7, 1.8], [-10, -2, 1.5]].forEach(function (p) { var pl = new T.Mesh(new T.CircleGeometry(p[2], 18), lavaMat()); pl.rotation.x = -Math.PI / 2; pl.position.set(q.x + p[0], 0.07, q.z + p[1]); scene.add(pl); var rim = new T.Mesh(new T.TorusGeometry(p[2], 0.35, 6, 18), std('#2b2220', { flat: true })); rim.rotation.x = Math.PI / 2; rim.position.set(q.x + p[0], 0.1, q.z + p[1]); scene.add(rim); });
    inst(G.dark, vmat('dark'), ringPts(q, 22, q.r * 0.3, q.r * 1.3, 2).map(function (p) { p.s = rr(0.6, 2.2); return p; }));
    inst(G.deadtree, vmat('dead'), ringPts(q, 10, q.r * 0.6, q.r * 1.4, 3).map(function (p) { p.s = rr(0.8, 1.3); return p; }));
    /* humo y chispas */
    for (var s = 0; s < 10; s++) { var sp = new T.Sprite(new T.SpriteMaterial({ map: soft(), color: '#7a716c', transparent: true, opacity: 0.5, depthWrite: false })); sp.position.set(vx, H, vz); scene.add(sp); anim.smoke.push({ s: sp, t: s / 10, x: vx, z: vz, y0: H }); }
    var n = 50, pos = new Float32Array(n * 3);
    for (var e = 0; e < n; e++) { pos[e * 3] = vx + rr(-4, 4); pos[e * 3 + 1] = rr(H, H + 12); pos[e * 3 + 2] = vz + rr(-4, 4); }
    var g2 = new T.BufferGeometry(); g2.setAttribute('position', new T.BufferAttribute(pos, 3));
    var em = new T.Points(g2, new T.PointsMaterial({ size: 0.6, map: soft(), color: '#ff8a2a', transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
    scene.add(em); anim.ember = { p: em, x: vx, z: vz, y0: H };
    /* huesos de presas */
    for (var b = 0; b < 3; b++) { var bx = q.x + rr(-q.r * 0.6, q.r * 0.4), bz = q.z + rr(-q.r * 0.6, q.r * 0.6); if (!clearAt(bx, bz, 2)) continue; add(cyl(0.12, 0.12, 2, '#efe6d2', 6), bx, 0.15, bz).rotation.z = Math.PI / 2; add(new T.Mesh(new T.SphereGeometry(0.2, 6, 5), std('#efe6d2')), bx - 1, 0.15, bz); add(new T.Mesh(new T.SphereGeometry(0.2, 6, 5), std('#efe6d2')), bx + 1, 0.15, bz); }
  }
  function habDesierto(q) {
    inst(G.dune, vmat('dune', 0, { flat: false }), ringPts(q, 14, q.r * 0.8, q.r * 1.5, 4).map(function (p) { p.s = rr(3, 6); return p; }), false);
    inst(G.cactus, vmat('cactus'), ringPts(q, 16, q.r * 0.3, q.r * 1.35, 2).map(function (p) { p.s = rr(0.6, 1.2); return p; }));
    inst(G.sandrock, vmat('sandrock'), ringPts(q, 12, q.r * 0.3, q.r * 1.3, 2).map(function (p) { p.s = rr(0.6, 2); return p; }));
    /* Esqueleto gigante a medio excavar */
    var bone = std('#f1e6cc', { r: 0.7 });
    var sk = grp(q.x + q.r * 0.35, q.z + q.r * 0.25, -0.6);
    for (var i = 0; i < 14; i++) { var t = i / 13, x = -7 + t * 14, y = 2.6 + Math.sin(t * Math.PI) * 1.6 - t * 1.2; var v = new T.Mesh(new T.SphereGeometry(0.42 - t * 0.15, 8, 6), bone); v.position.set(x, Math.max(0.3, y), 0); v.castShadow = true; sk.add(v); }
    for (var r = 0; r < 7; r++) { var rib = new T.Mesh(new T.TorusGeometry(1.8 - r * 0.15, 0.14, 6, 16, Math.PI), bone); rib.position.set(-4 + r * 1.1, 3.6 - r * 0.1, 0); rib.rotation.y = Math.PI / 2; rib.rotation.x = Math.PI; rib.castShadow = true; sk.add(rib); }
    var skull = new T.Mesh(new T.BoxGeometry(2.4, 1.4, 1.5), bone); skull.position.set(-8.3, 2.2, 0); skull.rotation.z = 0.25; skull.castShadow = true; sk.add(skull);
    var jaw = new T.Mesh(new T.BoxGeometry(2.2, 0.35, 1.2), bone); jaw.position.set(-8.2, 1.2, 0); jaw.rotation.z = 0.45; sk.add(jaw);
    [-0.45, 0.45].forEach(function (zz) { var eye = new T.Mesh(new T.SphereGeometry(0.25, 8, 6), std('#3a2a20')); eye.position.set(-8.4, 2.5, zz * 1.6); sk.add(eye); });
    /* carpa de excavación */
    var tent = grp(q.x - q.r * 0.55, q.z + q.r * 0.1, 0.8);
    var tg = new T.Mesh(new T.ConeGeometry(3, 3, 4, 1, true), std('#f1e2c0', { ds: true, flat: true })); tg.position.y = 1.5; tg.rotation.y = Math.PI / 4; tg.castShadow = true; tent.add(tg);
    for (var s = 0; s < 4; s++) { var st = new T.Mesh(new T.ConeGeometry(3.02, 3, 4, 1, true, s * Math.PI / 2, 0.3), std('#e8613c', { ds: true, flat: true })); st.position.y = 1.5; st.rotation.y = Math.PI / 4; tent.add(st); }
    add(box(1.6, 0.8, 0.8, '#8a6240'), 2.4, 0.4, 0, tent);
    var sh = add(cyl(0.04, 0.04, 1.6, '#6b4a32', 5), 2.2, 1.2, 0.8, tent); sh.rotation.z = 0.4;
  }
  function snowman(x, z, s, ry) {
    var g = grp(x, z, ry || 0); g.scale.setScalar(s);
    var w = std('#ffffff', { r: 0.9 });
    add(new T.Mesh(new T.SphereGeometry(1, 16, 12), w), 0, 0.9, 0, g); add(new T.Mesh(new T.SphereGeometry(0.72, 16, 12), w), 0, 2.2, 0, g); add(new T.Mesh(new T.SphereGeometry(0.5, 16, 12), w), 0, 3.2, 0, g);
    var nose = add(new T.Mesh(new T.ConeGeometry(0.09, 0.5, 8), std('#ff8a2a')), 0, 3.2, 0.6, g); nose.rotation.x = Math.PI / 2;
    [-0.17, 0.17].forEach(function (x2) { add(new T.Mesh(new T.SphereGeometry(0.06, 6, 5), std('#1b2422')), x2, 3.35, 0.44, g); });
    for (var b = 0; b < 3; b++) add(new T.Mesh(new T.SphereGeometry(0.07, 6, 5), std('#1b2422')), 0, 2.5 - b * 0.3, 0.7 - Math.abs(b - 1) * 0.03, g);
    add(cyl(0.45, 0.45, 0.08, '#1b2422', 16), 0, 3.6, 0, g); add(cyl(0.32, 0.32, 0.5, '#1b2422', 16), 0, 3.88, 0, g); add(cyl(0.33, 0.33, 0.1, '#d62839', 16), 0, 3.7, 0, g);
    var sc = add(new T.Mesh(new T.TorusGeometry(0.5, 0.12, 8, 18), std('#d62839')), 0, 2.75, 0, g); sc.rotation.x = Math.PI / 2;
    [-1, 1].forEach(function (sd) { var arm = add(cyl(0.04, 0.05, 1.3, '#5d4330', 5), sd * 1.05, 2.4, 0, g); arm.rotation.z = sd * 1.0; });
  }
  function habGlaciar(q) {
    inst(G.snowmound, vmat('snowm', 0, { flat: false }), ringPts(q, 16, q.r * 0.8, q.r * 1.5, 3).map(function (p) { p.s = rr(2.5, 5); return p; }), false);
    inst(G.ice, new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85, emissive: '#4fb6ff', emissiveIntensity: 0.25, flatShading: true }),
      ringPts(q, 26, q.r * 0.35, q.r * 1.35, 2).map(function (p) { p.s = rr(0.8, 2.2); return p; }));
    var pond = new T.Mesh(new T.CircleGeometry(q.r * 0.32, 40), new T.MeshStandardMaterial({ color: '#bfe6f7', roughness: 0.08, metalness: 0.3 })); pond.rotation.x = -Math.PI / 2; pond.position.set(q.x - q.r * 0.35, 0.06, q.z - q.r * 0.35); pond.receiveShadow = true; scene.add(pond);
    snowman(q.x + q.r * 0.5, q.z + q.r * 0.2, 1, -0.8); snowman(q.x - q.r * 0.55, q.z + q.r * 0.35, 0.8, 0.6);
    /* iglú */
    var ig = grp(q.x + q.r * 0.25, q.z - q.r * 0.55, 0.4);
    var itx = canvasTex(256, 128, function (g, w, h) { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c9dfee'; g.lineWidth = 3; for (var y = 0; y < h; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); for (var x = ((y / 16) % 2) * 16; x < w; x += 32) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 16); g.stroke(); } } });
    add(new T.Mesh(new T.SphereGeometry(3, 24, 12, 0, 6.29, 0, 1.57), new T.MeshStandardMaterial({ map: itx, roughness: 0.6 })), 0, 0, 0, ig);
    var tun = add(new T.Mesh(new T.CylinderGeometry(1.1, 1.1, 2, 16, 1, true, 0, Math.PI), new T.MeshStandardMaterial({ map: itx, side: T.DoubleSide })), 0, 0, 3, ig); tun.rotation.x = Math.PI / 2; tun.rotation.y = Math.PI / 2;
    /* trineo rojo */
    var sl = grp(q.x - q.r * 0.1, q.z + q.r * 0.55, 1.2);
    add(box(2.6, 0.7, 1.4, '#c81d32'), 0, 0.85, 0, sl); add(box(0.9, 1.2, 1.4, '#c81d32'), -1.05, 1.3, 0, sl);
    [-0.6, 0.6].forEach(function (z2) { add(box(3.2, 0.12, 0.12, '#f2c14e', { m: 0.5 }), 0.1, 0.25, z2, sl); });
    gift(0.5, 0, 0.9, '#2a9d5c', 0.3, sl).position.y = 1.2;
    /* árboles navideños y regalos */
    ringPts(q, 7, q.r * 0.7, q.r * 1.3, 3).forEach(function (p) { xtree(p.x, p.z, rr(0.9, 1.4)); });
    for (var gi = 0; gi < 8; gi++) { var a = rnd() * 6.28, d = rr(q.r * 0.3, q.r * 0.9), gx = q.x + Math.cos(a) * d, gz = q.z + Math.sin(a) * d; if (clearAt(gx, gz, 1)) gift(gx, gz, rr(0.6, 1.2), BULBS[gi % 5], rnd() * 6); }
    /* aurora austral sobre el glaciar */
    var au = new T.Mesh(new T.PlaneGeometry(220, 60, 60, 1), auroraMat()); au.position.set(q.x, 85, q.z - 140); scene.add(au);
  }

  /* ---------------- Lugares del parque (puestos, juegos, parrillas, VR, entrada) ---------------- */
  var smoke = [], vrRing = null, places3d = [];
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
    var g = grp(p.x, p.z, p.x < 0 ? Math.PI / 2 : -Math.PI / 2);
    add(box(3.2, 1.1, 1.6, '#f4ece0'), 0, 0.55, 0, g);
    add(box(3.3, 0.12, 1.8, p.color), 0, 1.15, 0, g);
    [-1.4, 1.4].forEach(function (x) { add(cyl(0.07, 0.07, 1.9, '#ffffff', 8), x, 2.1, 0.7, g); add(cyl(0.07, 0.07, 1.9, '#ffffff', 8), x, 2.1, -0.7, g); });
    for (var i = 0; i < 6; i++) { var st = add(box(0.55, 0.12, 2.1, i % 2 ? '#ffffff' : p.color), -1.375 + i * 0.55, 3.1, 0.1, g); st.rotation.x = -0.18; }
    for (var b = 0; b < 9; b++) { var bl = new T.Mesh(new T.SphereGeometry(0.08, 6, 5), bulbMats[b % bulbMats.length]); bl.position.set(-1.6 + b * 0.4, 2.9 - Math.sin(b / 8 * Math.PI) * 0.15, 1.15); g.add(bl); twinkle.push(bl); }
    add(box(0.6, 1.2, 0.3, '#ffffff'), -1.0, 1.75, -0.2, g);
    propFor(p.prop, g);
    sign(p.name, p.color, 0, 2.55, 0.92, 2.9, g);
    return g;
  }
  function buildGate(p) {
    var g = grp(p.x, p.z, 0);
    [-6, 6].forEach(function (x) { add(box(1.6, 7, 1.6, '#efe6d2', { flat: true }), x, 3.5, 0, g); add(new T.Mesh(new T.ConeGeometry(1.3, 1.4, 4), std('#2fb36b', { flat: true })), x, 7.7, 0, g).rotation.y = Math.PI / 4; });
    add(box(13.6, 1.6, 1.3, '#2fb36b'), 0, 6.4, 0, g);
    sign('DINO PARK', '#ffc93c', 0, 6.4, 0.7, 8, g);
    sign('¡Feliz Navidad!', '#d62839', 0, 5.0, 0.75, 5.5, g);
    sign('DINO PARK', '#ffc93c', 0, 6.4, -0.7, 8, g, Math.PI);
    [-6, 6].forEach(function (x) { add(new T.Mesh(new T.TorusGeometry(0.7, 0.2, 8, 20), std('#2f7a3f')), x, 5.2, 0.85, g); add(new T.Mesh(new T.SphereGeometry(0.18, 8, 6), std('#d62839')), x, 4.55, 0.95, g); });
    add(box(2.4, 2, 1.6, '#efe6d2'), 9, 1, 0, g);
    sign('Boletería', '#16302a', 9, 2.3, 0.85, 2.4, g);
    return g;
  }
  function buildPlayground(p) {
    var g = grp(p.x, p.z, 0.3);
    add(cyl(7, 7, 0.08, '#ffd98a', 32), 0, 0.04, 0, g);
    add(box(2, 2.4, 2, '#ff6b57'), -2, 1.2, 0, g);
    add(new T.Mesh(new T.ConeGeometry(1.6, 1.4, 4), std('#ffc93c', { flat: true })), -2, 3.1, 0, g).rotation.y = Math.PI / 4;
    var slide = add(box(1, 0.15, 4, '#39b6ff'), -2, 1.2, 2.6, g); slide.rotation.x = 0.55;
    var fr = new T.Group(); fr.position.set(2.5, 0, 0); g.add(fr);
    [-1.6, 1.6].forEach(function (x) { var l = add(cyl(0.1, 0.1, 3.2, '#8a63ff', 8), x, 1.5, 0, fr); l.rotation.z = x > 0 ? 0.15 : -0.15; });
    add(cyl(0.1, 0.1, 3.4, '#8a63ff', 8), 0, 3.05, 0, fr).rotation.z = Math.PI / 2;
    [-0.7, 0.7].forEach(function (x) { add(cyl(0.02, 0.02, 2, '#cccccc', 4), x, 2, 0, fr); add(box(0.6, 0.08, 0.35, '#ff7fb0'), x, 1, 0, fr); });
    var sw = grp(0, -4, 0, g); add(cyl(1.6, 1.6, 0.2, '#2fb36b', 16), 0, 0.4, 0, sw); add(cyl(0.12, 0.12, 1.2, '#ffc93c', 8), 0, 1, 0, sw);
    sign(p.name, '#ff6b57', 0, 4.6, 0, 5, g);
    return g;
  }
  function buildBBQ(p) {
    var g = grp(p.x, p.z, -0.3);
    add(box(9, 0.1, 6, '#c9a77a'), 0, 0.05, 0, g);
    [[-4, -2.6], [4, -2.6], [-4, 2.6], [4, 2.6]].forEach(function (q) { add(box(0.3, 3, 0.3, '#7a4e22'), q[0], 1.5, q[1], g); });
    add(box(9.4, 0.25, 6.4, '#a8432e'), 0, 3.1, 0, g);
    [-2, 2].forEach(function (x) {
      add(box(2.4, 0.15, 1.1, '#9a6a3a'), x, 0.8, 0.5, g);
      add(box(2.4, 0.1, 0.35, '#7a4e22'), x, 0.45, 1.3, g); add(box(2.4, 0.1, 0.35, '#7a4e22'), x, 0.45, -0.3, g);
    });
    add(box(1.4, 0.9, 0.8, '#2b2b2b', { m: 0.5, r: 0.4 }), 0, 0.45, -2.3, g);
    add(box(1.3, 0.05, 0.7, '#ff5a10', { em: '#ff4a10', ei: 1.6 }), 0, 0.92, -2.3, g);
    for (var i = 0; i < 3; i++) { var sp = new T.Sprite(new T.SpriteMaterial({ map: soft(), color: '#e8e1da', transparent: true, opacity: 0.4, depthWrite: false })); sp.scale.setScalar(1.2); sp.position.set(0, 1.6 + i * 0.8, -2.3); g.add(sp); smoke.push({ s: sp, t: i / 3, y0: 1.4 }); }
    sign(p.name, '#a8432e', 0, 3.9, 0, 5, g);
    return g;
  }
  function buildVR(p) {
    var g = grp(p.x, p.z, -0.7);
    add(cyl(3.6, 3.8, 0.3, '#2b2f4a', 32), 0, 0.15, 0, g);
    add(new T.Mesh(new T.SphereGeometry(3.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), std('#4a3f8f', { r: 0.3, m: 0.3 })), 0, 0.3, 0, g);
    add(box(1.8, 2.2, 0.6, '#16182a'), 0, 1.4, 3.0, g);
    vrRing = add(new T.Mesh(new T.TorusGeometry(3.4, 0.08, 8, 64), new T.MeshBasicMaterial({ color: '#39f0ff' })), 0, 1.2, 0, g);
    vrRing.rotation.x = Math.PI / 2;
    var gog = new T.Group(); gog.position.set(0, 4.6, 0); g.add(gog);
    add(box(1.6, 0.7, 0.5, '#ffffff'), 0, 0, 0, gog);
    add(box(1.5, 0.55, 0.1, '#39f0ff', { em: '#39f0ff', ei: 1.2 }), 0, 0, 0.27, gog);
    add(box(1.9, 0.12, 0.12, '#8a63ff'), 0, 0, -0.3, gog);
    g.userData.gog = gog;
    sign(p.name, '#8a63ff', 0, 3.9, 3.35, 4.8, g);
    return g;
  }

  /* ---------------- Árbol gigante de la plaza ---------------- */
  var orb = null;
  function plazaTree() {
    var g = xtree(0, 0, 3.1);
    /* guirnalda en espiral */
    var pts = [];
    for (var i = 0; i <= 120; i++) { var t = i / 120, y = 4 + t * 11.5, r = (1 - t) * 5.6 + 0.6; pts.push(new T.Vector3(Math.cos(t * 6.28 * 3.5) * r, y, Math.sin(t * 6.28 * 3.5) * r)); }
    var gar = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 240, 0.13, 6), std('#ffd23f', { m: 0.5, r: 0.3, em: '#c98a00', ei: 0.4 }));
    g.add(gar);
    orb = add(new T.Mesh(new T.SphereGeometry(0.95, 32, 20), new T.MeshStandardMaterial({ color: '#ffb23d', emissive: '#f08a12', emissiveIntensity: 0.9, roughness: 0.2 })), 0, 17.6, 0);
    add(new T.Mesh(new T.TorusGeometry(0.97, 0.1, 10, 40), std('#2a1a0f', { r: 0.4 })), 0, 17.6, 0).rotation.x = Math.PI / 2;
    for (var gi = 0; gi < 12; gi++) { var ga = gi / 12 * Math.PI * 2 + 0.3; gift(Math.cos(ga) * (6.5 + (gi % 2)), Math.sin(ga) * (6.5 + (gi % 2)), 0.8 + (gi % 3) * 0.3, ['#d62839', '#2a9d5c', '#3a7bd5', '#8a63ff', '#ff7fb0'][gi % 5], ga); }
  }

  /* ---------------- Construcción completa ---------------- */
  W.build = function (sc, opts) {
    scene = sc; lite = !!(opts && opts.lite); seed = 7;
    bulbMats = BULBS.map(function (c) { return new T.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.5, roughness: 0.3 }); });
    shapes();
    var sun = sky();
    terrain();
    paths();
    plazaTree();
    var P = DC.PARK;
    /* hábitats */
    var hab = { 1: habValle, 2: habBosque, 3: habLaguna, 4: habCumbre, 5: habGuarida, 6: habDesierto, 7: habGlaciar };
    Object.keys(P.zones).forEach(function (k) { arch(P.zones[k], +k); hab[k](P.zones[k]); });
    /* lugares */
    DC.PLACES.forEach(function (p) {
      var g = p.kind === 'gate' ? buildGate(p) : p.kind === 'stand' ? buildStand(p) : p.kind === 'playground' ? buildPlayground(p) : p.kind === 'bbq' ? buildBBQ(p) : buildVR(p);
      places3d.push({ p: p, g: g });
    });
    /* faroles y bancas */
    var lampL = [], benchL = [];
    for (var z = 18; z < 108; z += 10) { lampL.push({ x: -5.6, z: z, ry: 0 }); lampL.push({ x: 5.6, z: z + 5, ry: Math.PI }); }
    for (var i = 0; i < 36; i++) { var a = i / 36 * Math.PI * 2; if (Math.abs(Math.sin(a)) < 0.12 && Math.cos(a) > 0) continue; lampL.push({ x: Math.sin(a) * (RING + 4.2), z: Math.cos(a) * (RING + 4.2), ry: a + Math.PI }); if (i % 3 === 1) benchL.push({ x: Math.sin(a + 0.04) * (RING - 4.6), z: Math.cos(a + 0.04) * (RING - 4.6), ry: a + Math.PI }); }
    for (var j = 0; j < 10; j++) { var a2 = j / 10 * Math.PI * 2 + 0.31; benchL.push({ x: Math.sin(a2) * 13.5, z: Math.cos(a2) * 13.5, ry: a2 + Math.PI }); }
    lamps(lampL); benches(benchL);
    /* árboles generales del parque */
    var gen = [], gen2 = [];
    for (var t = 0; t < (lite ? 160 : 300); t++) {
      var a3 = rnd() * 6.28, d = rr(20, P.radius - 3), x = Math.cos(a3) * d, zz = Math.sin(a3) * d;
      if (!clearAt(x, zz, 4)) continue;
      if (Object.keys(P.zones).some(function (k) { var q = P.zones[k]; return Math.hypot(q.x - x, q.z - zz) < q.r * 1.6; })) continue;
      (rnd() < 0.55 ? gen : gen2).push({ x: x, z: zz, s: rr(0.8, 1.5), ry: rnd() * 6 });
    }
    inst(G.pine, vmat('pine', 0.004), gen); inst(G.round, vmat('round', 0.02), gen2);
    inst(G.grass, vmat('grass', 0.18), (function () { var o = []; for (var k = 0; k < (lite ? 600 : 1800); k++) { var a4 = rnd() * 6.28, d4 = rr(18, P.radius), x4 = Math.cos(a4) * d4, z4 = Math.sin(a4) * d4; if (clearAt(x4, z4, 1)) o.push({ x: x4, z: z4, s: rr(0.7, 1.3), ry: rnd() * 6 }); } return o; })(), false);
    /* bosque exterior y cerco */
    var outer = [];
    for (var o = 0; o < (lite ? 260 : 520); o++) { var a5 = rnd() * 6.28, d5 = rr(P.radius + 5, P.radius + 80), x5 = Math.sin(a5) * d5, z5 = Math.cos(a5) * d5; if (Math.abs(x5) < 14 && z5 > 0) continue; var h = sstep(P.radius + 6, P.radius + 70, d5) * (6 + (noise(x5, z5) + 1) * 10); outer.push({ x: x5, y: h - 0.3, z: z5, s: rr(1, 1.9), ry: rnd() * 6 }); }
    inst(G.pine, vmat('pine', 0.004), outer);
    var posts = [];
    for (var f = 0; f < 6.28; f += 3.2 / (P.radius + 1)) { var fx = Math.sin(f) * (P.radius + 1), fz = Math.cos(f) * (P.radius + 1); if (Math.abs(fx) < 9 && fz > 0) continue; posts.push({ x: fx, z: fz, ry: f + Math.PI / 2 }); }
    inst(G.post, vmat('post'), posts);
    return { sun: sun, places3d: places3d, orb: orb };
  };

  W.update = function (dt, t, focus) {
    U.time.value = t;
    clouds.forEach(function (c) { c.a += c.sp * dt; c.g.position.x = Math.cos(c.a) * c.d; c.g.position.z = Math.sin(c.a) * c.d; });
    if (Math.random() < dt * 4 && twinkle.length) { var tw = twinkle[Math.floor(Math.random() * twinkle.length)]; tw.visible = !tw.visible; }
    stars.forEach(function (s) { s.rotation.y += dt; });
    if (orb) orb.rotation.y += dt * 0.6;
    if (vrRing) vrRing.material.color.setHSL((t * 0.1) % 1, 0.9, 0.6);
    places3d.forEach(function (o) { if (o.g.userData.gog) { o.g.userData.gog.rotation.y += dt; o.g.userData.gog.position.y = 4.6 + Math.sin(t * 2) * 0.25; } });
    smoke.forEach(function (s) { s.t = (s.t + dt * 0.3) % 1; s.s.position.y = s.y0 + s.t * 3; s.s.material.opacity = 0.45 * (1 - s.t); s.s.scale.setScalar(1 + s.t * 1.5); });
    anim.smoke.forEach(function (s) { s.t = (s.t + dt * 0.08) % 1; s.s.position.set(s.x + Math.sin(s.t * 6 + t * 0.2) * 2 + s.t * 6, s.y0 + s.t * 22, s.z + s.t * 3); s.s.scale.setScalar(4 + s.t * 14); s.s.material.opacity = 0.5 * Math.sin(s.t * Math.PI); });
    if (anim.fireflies) { var fp = anim.fireflies.p.geometry.attributes.position, b = anim.fireflies.base; for (var i = 0; i < fp.count; i++) { fp.array[i * 3] = b[i * 3] + Math.sin(t * 0.7 + i) * 1.2; fp.array[i * 3 + 1] = b[i * 3 + 1] + Math.sin(t * 1.3 + i * 2) * 0.5; fp.array[i * 3 + 2] = b[i * 3 + 2] + Math.cos(t * 0.6 + i) * 1.2; } fp.needsUpdate = true; anim.fireflies.p.material.opacity = 0.6 + Math.sin(t * 3) * 0.3; }
    if (anim.ember && anim.ember.p) { var ep = anim.ember.p.geometry.attributes.position; for (var e = 0; e < ep.count; e++) { ep.array[e * 3 + 1] += dt * (2 + (e % 5)); if (ep.array[e * 3 + 1] > anim.ember.y0 + 14) { ep.array[e * 3 + 1] = anim.ember.y0; ep.array[e * 3] = anim.ember.x + (Math.random() - 0.5) * 8; ep.array[e * 3 + 2] = anim.ember.z + (Math.random() - 0.5) * 8; } } ep.needsUpdate = true; }
  };
  W.lakes = function () { return anim.lakes; };
  DC.World = W;
})();
