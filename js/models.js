/* =====================================================================
   DinoCaza AR · models.js
   Dinosaurios 3D procedurales con esqueleto articulado y animaciones
   (reposo, caminar, rugir, atacar, golpe, esquiva, especial, agotado,
   desmayo, huida, aparición, vuelo y nado). Sin archivos externos.
   ===================================================================== */
(function () {
  var T = THREE;
  var texCache = {};
  var lite = false;

  /* ---------------- Utilidades de geometría ---------------- */
  /* Segmento orgánico: perfil girado (lathe) con extremos redondeados */
  function segGeom(len, r0, r1, o) {
    o = o || {};
    var N = o.n || 12, k = o.k || 2.6, bulge = o.bulge || 0, pts = [];
    for (var i = 0; i <= N; i++) {
      var t = i / N;
      var base = r0 + (r1 - r0) * t + bulge * Math.sin(Math.PI * t);
      var f = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(2 * t - 1), k)), 1 / k);
      pts.push(new T.Vector2(Math.max(base * f, 0.0006), t * len));
    }
    var g = new T.LatheGeometry(pts, o.radial || (lite ? 10 : 16));
    switch (o.axis || 'z') {
      case 'z': g.rotateX(Math.PI / 2); break;
      case '-z': g.rotateX(Math.PI / 2); g.rotateY(Math.PI); break;
      case '-y': g.rotateX(Math.PI); break;
      case 'x': g.rotateX(Math.PI / 2); g.rotateY(Math.PI / 2); break;
      case '-x': g.rotateX(Math.PI / 2); g.rotateY(-Math.PI / 2); break;
      default: break;
    }
    if (o.sx || o.sy || o.sz) g.scale(o.sx || 1, o.sy || 1, o.sz || 1);
    g.computeVertexNormals();
    return g;
  }
  function mesh(g, m) {
    var x = new T.Mesh(g, m);
    x.castShadow = true;
    return x;
  }
  function grp(x, y, z, parent) {
    var g = new T.Group();
    g.position.set(x || 0, y || 0, z || 0);
    if (parent) parent.add(g);
    return g;
  }
  function cone(r, h, m, seg) {
    var g = new T.ConeGeometry(r, h, seg || 8);
    g.translate(0, h / 2, 0);
    return mesh(g, m);
  }
  function hexToRgb(h) {
    var n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function rgb(c) { return 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')'; }
  function smooth(a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

  /* ---------------- Texturas de piel ---------------- */
  /* u (horizontal) rodea el cuerpo: 0/1 = vientre, 0.5 = lomo */
  function skinTexture(c, seed) {
    var key = c.body + c.belly + c.mark + c.pattern;
    if (texCache[key]) return texCache[key];
    var W = 256, H = 128;
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var g = cv.getContext('2d');
    var body = hexToRgb(c.body), belly = hexToRgb(c.belly), mark = hexToRgb(c.mark);
    for (var x = 0; x < W; x++) {
      var u = x / W, top = (1 - Math.cos(2 * Math.PI * u)) / 2;
      var col = mix(belly, body, smooth(0.22, 0.55, top));
      col = mix(col, mark, smooth(0.86, 1.0, top) * 0.45);
      g.fillStyle = rgb(col); g.fillRect(x, 0, 1, H);
    }
    var rs = seed || 7;
    function rnd() { rs = (rs * 9301 + 49297) % 233280; return rs / 233280; }
    g.globalAlpha = 0.55; g.fillStyle = rgb(mark);
    if (c.pattern === 'stripes') {
      for (var i = 0; i < 11; i++) {
        var y = (i + 0.5) / 11 * H + (rnd() - 0.5) * 4, w = 2 + rnd() * 4;
        var span = 0.18 + rnd() * 0.12;
        g.beginPath();
        g.moveTo(W * (0.5 - span), y);
        g.quadraticCurveTo(W * 0.5, y - 6 + rnd() * 12, W * (0.5 + span), y + (rnd() - 0.5) * 5);
        g.lineWidth = w; g.strokeStyle = rgb(mark); g.stroke();
      }
    } else if (c.pattern === 'spots') {
      for (var j = 0; j < 46; j++) {
        var sx = W * (0.25 + rnd() * 0.5), sy = rnd() * H, r = 2 + rnd() * 5;
        g.beginPath(); g.ellipse(sx, sy, r * 1.3, r, rnd() * 3, 0, Math.PI * 2); g.fill();
      }
    }
    /* Escamas: moteado fino */
    var img = g.getImageData(0, 0, W, H), d = img.data;
    for (var k = 0; k < d.length; k += 4) {
      var n = (rnd() - 0.5) * 22;
      d[k] += n; d[k + 1] += n; d[k + 2] += n;
    }
    g.putImageData(img, 0, 0);
    var tex = new T.CanvasTexture(cv);
    tex.wrapS = T.RepeatWrapping; tex.wrapT = T.RepeatWrapping;
    tex.anisotropy = 4;
    texCache[key] = tex;
    return tex;
  }
  function wingTexture(c) {
    var key = 'wing' + c.wing;
    if (texCache[key]) return texCache[key];
    var cv = document.createElement('canvas'); cv.width = 128; cv.height = 128;
    var g = cv.getContext('2d');
    var base = hexToRgb(c.wing), dark = mix(base, [20, 10, 5], 0.45), light = mix(base, [255, 240, 220], 0.3);
    var grd = g.createLinearGradient(0, 0, 128, 128);
    grd.addColorStop(0, rgb(dark)); grd.addColorStop(1, rgb(light));
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = rgb(dark); g.globalAlpha = 0.35; g.lineWidth = 1.2;
    for (var i = 0; i < 9; i++) { g.beginPath(); g.moveTo(0, i * 14); g.quadraticCurveTo(70, i * 14 + 18, 128, i * 16 + 4); g.stroke(); }
    var tex = new T.CanvasTexture(cv);
    texCache[key] = tex;
    return tex;
  }

  /* ---------------- Materiales por actor ---------------- */
  /* Aplica el color de una variante (plata, oro, gemas) o de un único */
  function tint(m, lk) {
    if (!lk || !m) return;
    var c = new T.Color(lk.color);
    if (m.color) m.color.lerp(c, lk.lerp === undefined ? 0.8 : lk.lerp);
    if (m.map && lk.lerp >= 0.8) m.color = c.clone();
    m.metalness = lk.metal; m.roughness = lk.rough;
    m.emissive = new T.Color(lk.emissive); m.emissiveIntensity = lk.glow;
    m.needsUpdate = true;
  }
  function makeMats(c, lk) {
    var skin = new T.MeshStandardMaterial({ map: skinTexture(c, c.body.length * 13), roughness: 0.78, metalness: 0.02 });
    var accent = new T.MeshStandardMaterial({ color: c.accent, roughness: 0.6 });
    var dark = new T.MeshStandardMaterial({ color: '#2b241d', roughness: 0.5 });
    var bone = new T.MeshStandardMaterial({ color: '#efe2c2', roughness: 0.45 });
    var eye = new T.MeshStandardMaterial({ color: '#f3b23a', emissive: '#5a3200', emissiveIntensity: 0.6, roughness: 0.2 });
    var pupil = new T.MeshStandardMaterial({ color: '#0d0a08', roughness: 0.1 });
    var mouth = new T.MeshStandardMaterial({ color: '#7a2a2a', roughness: 0.6 });
    var wing = c.wing ? new T.MeshStandardMaterial({ map: wingTexture(c), side: T.DoubleSide, roughness: 0.8 }) : null;
    accent.side = T.DoubleSide;
    if (lk) { tint(skin, lk); tint(accent, lk); if (wing) tint(wing, lk); accent.emissiveIntensity = lk.glow * 1.4; }
    var skinSk = skin.clone(); skinSk.skinning = true;
    var lc = mix(hexToRgb(c.body), hexToRgb(c.mark), 0.18);
    var limb = new T.MeshStandardMaterial({ color: new T.Color(lc[0] / 255, lc[1] / 255, lc[2] / 255), roughness: 0.8 });
    if (lk) tint(limb, lk);
    var limbSk = limb.clone(); limbSk.skinning = true;
    return { skin: skin, skinSk: skinSk, limb: limb, limbSk: limbSk, accent: accent, dark: dark, bone: bone, eye: eye, pupil: pupil, mouth: mouth, wing: wing };
  }

  function addEyes(parent, x, y, z, r, mats, a) {
    [-1, 1].forEach(function (s) {
      var e = mesh(new T.SphereGeometry(r, 12, 10), mats.eye);
      e.position.set(s * x, y, z);
      parent.add(e);
      var p = mesh(new T.SphereGeometry(r * 0.62, 10, 8), mats.pupil);
      p.scale.set(0.45, 1, 0.6);
      p.position.set(s * (x + r * 0.55), y, z + r * 0.15);
      parent.add(p);
      a.eyes.push(e);
    });
  }
  function teethRow(parent, len, w, y, z0, n, r, mats, down) {
    for (var s = -1; s <= 1; s += 2) {
      for (var i = 0; i < n; i++) {
        var t = i / Math.max(1, n - 1);
        var th = cone(r, r * 3.2, mats.bone, 5);
        th.castShadow = false;
        th.position.set(s * w * (1 - 0.45 * t), y, z0 + len * t);
        if (down) th.rotation.x = Math.PI;
        parent.add(th);
      }
    }
  }

  /* Cadena de segmentos (cola o cuello). dir: 1 hacia +z, -1 hacia -z */
  function chain(parent, n, total, r0, r1, dir, mats, o) {
    o = o || {};
    var out = [], prev = parent, sl = total / n;
    for (var i = 0; i < n; i++) {
      var t0 = i / n, t1 = (i + 1) / n;
      var g = grp(0, 0, i === 0 ? 0 : dir * sl * 0.92, prev);
      var m = mesh(segGeom(sl * 1.18, r0 + (r1 - r0) * t0, r0 + (r1 - r0) * t1,
        { axis: dir > 0 ? 'z' : '-z', sx: o.sx || 0.85, sy: o.sy || 1, k: 2.2, n: 10 }), o.mat || mats.skin);
      m.position.z = -dir * sl * 0.08;
      g.add(m);
      if (o.rx) g.rotation.x = typeof o.rx === 'function' ? o.rx(i) : o.rx;
      out.push(g);
      prev = g;
    }
    return out;
  }

  /* Tubo continuo con piel deformable (SkinnedMesh + huesos).
     lens: largo de cada hueso; rFn(t) radio a lo largo (0..1). */
  var AXV = { z: [0, 0, 1], '-z': [0, 0, -1], '-y': [0, -1, 0], x: [1, 0, 0], '-x': [-1, 0, 0] };
  function skinTube(parent, lens, rFn, mat, o) {
    o = o || {};
    var axis = o.axis || 'z', total = 0, i;
    lens.forEach(function (l) { total += l; });
    var back = o.back || 0, N = o.rings || (lite ? 14 : 24), pts = [];
    var r0 = rFn(0);
    pts.push(new T.Vector2(0.0006, -back - r0 * 0.35));
    pts.push(new T.Vector2(r0 * 0.75, -back - r0 * 0.12));
    for (i = 0; i <= N; i++) {
      var t = i / N, d = -back + (total + back) * t, tt = Math.max(0, d / total);
      var r = rFn(tt);
      if (o.cap !== false) { var q = Math.max(0, (tt - 0.86) / 0.14); r *= Math.sqrt(Math.max(0.02, 1 - q * q)); }
      pts.push(new T.Vector2(Math.max(r, 0.0006), d));
    }
    pts.push(new T.Vector2(0.0006, total + (o.cap === false ? 0 : 0.0005)));
    var g = new T.LatheGeometry(pts, o.radial || (lite ? 10 : 16));
    switch (axis) {
      case 'z': g.rotateX(Math.PI / 2); break;
      case '-z': g.rotateX(Math.PI / 2); g.rotateY(Math.PI); break;
      case '-y': g.rotateX(Math.PI); break;
      case 'x': g.rotateX(Math.PI / 2); g.rotateY(Math.PI / 2); break;
      case '-x': g.rotateX(Math.PI / 2); g.rotateY(-Math.PI / 2); break;
    }
    if (o.sx || o.sy || o.sz) g.scale(o.sx || 1, o.sy || 1, o.sz || 1);
    g.computeVertexNormals();
    var av = AXV[axis], pos = g.attributes.position, n = lens.length;
    var cum = [0]; for (i = 1; i < n; i++) cum.push(cum[i - 1] + lens[i - 1]);
    var si = new Uint16Array(pos.count * 4), sw = new Float32Array(pos.count * 4);
    var blend = o.blend || 0.35;
    for (i = 0; i < pos.count; i++) {
      var dd = pos.getX(i) * av[0] + pos.getY(i) * av[1] + pos.getZ(i) * av[2];
      var k = 0;
      for (var j = 0; j < n; j++) if (dd >= cum[j]) k = j;
      var f = (dd - cum[k]) / lens[k];
      var a = k, b = k, w1 = 0;
      if (k < n - 1 && f > 1 - blend) { b = k + 1; w1 = Math.min(0.5, (f - (1 - blend)) / (2 * blend)); }
      else if (k > 0 && f < blend) { b = k - 1; w1 = Math.max(0, 0.5 - Math.max(0, f) / (2 * blend)); }
      si[i * 4] = a; si[i * 4 + 1] = b; sw[i * 4] = 1 - w1; sw[i * 4 + 1] = w1;
    }
    g.setAttribute('skinIndex', new T.Uint16BufferAttribute(si, 4));
    g.setAttribute('skinWeight', new T.Float32BufferAttribute(sw, 4));
    var bones = [];
    for (i = 0; i < n; i++) {
      var bn = new T.Bone();
      if (i > 0) { bn.position.set(av[0] * lens[i - 1], av[1] * lens[i - 1], av[2] * lens[i - 1]); bones[i - 1].add(bn); }
      bones.push(bn);
    }
    var m = new T.SkinnedMesh(g, mat);
    m.frustumCulled = false; m.castShadow = true;
    parent.add(m); m.add(bones[0]);
    var top = parent; while (top.parent) top = top.parent;
    top.updateMatrixWorld(true);
    m.bind(new T.Skeleton(bones));
    if (o.rest) bones.forEach(function (bn, idx) { bn.rotation.x = o.rest(idx); });
    var end = new T.Group();
    end.position.set(av[0] * lens[n - 1], av[1] * lens[n - 1], av[2] * lens[n - 1]);
    bones[n - 1].add(end);
    return { mesh: m, bones: bones, end: end };
  }
  function lerpR(a, b) { return function (t) { return a + (b - a) * t; }; }

  /* =============================================================
     Terópodos bípedos (T. rex, Velociraptor, Spinosaurus, etc.)
     ============================================================= */
  function buildTheropod(a, p, mats) {
    var big = p.big ? 1.12 : 1, slim = p.slim ? 0.8 : 1;
    var B = p.body * 1.9, R = 0.3 * big * slim;
    var hips = grp(0, 1.0, 0, a.body); a.hips = hips;
    var torsoP = grp(0, 0, 0, hips); torsoP.rotation.x = -0.06; a.torso = torsoP;
    var torso = mesh(segGeom(B, R * 0.98, R * 0.8, { bulge: R * 0.28, sx: 0.78, sy: 1.0, k: 2.3 }), mats.skin);
    torso.position.z = -0.35 * B; torsoP.add(torso);
    a.torsoMesh = torso;

    /* Cuello continuo */
    var neckBase = grp(0, R * 0.3, 0.5 * B, torsoP);
    var nl = p.neck * 1.05;
    var nk = skinTube(neckBase, [nl * 0.5, nl * 0.5], lerpR(R * 0.62, R * 0.42), mats.skinSk,
      { axis: 'z', back: R * 0.4, sx: 0.8, cap: false, rest: function (i) { return i === 0 ? -0.5 : 0.28; } });
    a.neck = nk.bones;
    var head = grp(0, 0, 0, nk.end); head.rotation.x = 0.3; a.head = head;

    var croc = !!p.crocSnout;
    var HL = p.head * 1.25 * (croc ? 1.45 : 1);
    var hr = 0.17 * big * (croc ? 0.72 : 1) * (p.slim ? 0.72 : 1) * (p.head > 0.45 ? 1.18 : 1);
    var skull = mesh(segGeom(HL * 1.05, hr * 1.05, hr * (croc ? 0.3 : 0.52), { sx: croc ? 0.72 : 0.8, sy: croc ? 0.85 : 1.18, k: 2.4, bulge: hr * 0.12 }), mats.skin);
    skull.position.set(0, hr * 0.25, -hr * 0.55); head.add(skull);
    var jawP = grp(0, -hr * 0.28, -hr * 0.3, head); a.jaw = jawP; jawP.rotation.x = 0.06;
    var jaw = mesh(segGeom(HL * 0.92, hr * 0.68, hr * 0.22, { sx: croc ? 0.7 : 0.76, sy: 0.55, k: 2.4 }), mats.skin);
    jaw.position.z = -hr * 0.1; jawP.add(jaw);
    var tongue = mesh(segGeom(HL * 0.6, hr * 0.3, hr * 0.12, { sx: 1, sy: 0.3 }), mats.mouth);
    tongue.position.set(0, hr * 0.12, 0); jawP.add(tongue);
    var nT = croc ? 9 : p.head > 0.4 ? 7 : 5;
    teethRow(head, HL * 0.55, hr * (croc ? 0.4 : 0.5), hr * 0.0, HL * 0.3, nT, hr * 0.075, mats, true);
    teethRow(jawP, HL * 0.48, hr * (croc ? 0.36 : 0.42), hr * 0.12, HL * 0.32, nT - 1, hr * 0.06, mats, false);
    addEyes(head, hr * 0.6, hr * 0.66, HL * 0.1, hr * 0.17, mats, a);
    [-1, 1].forEach(function (s) {
      var br = mesh(segGeom(hr * 0.55, hr * 0.13, hr * 0.06, { axis: 'z' }), mats.skin);
      br.position.set(s * hr * 0.52, hr * 0.9, -hr * 0.05); head.add(br);
    });
    if (p.dualCrest) {
      [-1, 1].forEach(function (s) {
        var cr = new T.Mesh(new T.CylinderGeometry(HL * 0.4, HL * 0.4, hr * 0.06, 20, 1, false, 0, Math.PI), mats.accent);
        cr.castShadow = true;
        cr.rotation.z = Math.PI / 2; cr.rotation.y = Math.PI / 2;
        cr.scale.set(1, 1, 0.6);
        cr.position.set(s * hr * 0.2, hr * 1.0, HL * 0.38); head.add(cr);
      });
    }
    if (p.bullHorns) {
      [-1, 1].forEach(function (s) {
        var h = cone(hr * 0.24, hr * 1.0, mats.skin, 8);
        h.position.set(s * hr * 0.55, hr * 1.0, -hr * 0.05);
        h.rotation.z = -s * 0.95; h.rotation.x = -0.25; head.add(h);
      });
    }
    if (croc) {
      var nc = mesh(segGeom(HL * 0.35, hr * 0.15, hr * 0.06, {}), mats.accent);
      nc.position.set(0, hr * 0.72, HL * 0.12); head.add(nc);
    }
    if (p.feathers) {
      for (var f = 0; f < 6; f++) {
        var fe = cone(hr * 0.12, hr * (1.2 - f * 0.12), mats.accent, 5);
        fe.position.set(0, hr * 0.7, -hr * 0.4 - f * hr * 0.16);
        fe.rotation.x = -2.2 + f * 0.12; head.add(fe);
      }
    }

    /* Brazos */
    a.arms = [];
    var al = p.arms * (p.tinyArms ? 0.85 : 1);
    [-1, 1].forEach(function (s) {
      var sh = grp(s * R * 0.6, -R * 0.35, 0.47 * B, torsoP);
      sh.rotation.z = s * 0.15;
      var ar = skinTube(sh, [al * 0.5, al * 0.5], lerpR(R * 0.2, R * 0.09), mats.limbSk,
        { axis: '-y', back: R * 0.1, rest: function (i) { return i === 0 ? -0.7 : -0.9; } });
      var hand = ar.end;
      var nClaw = p.tinyArms ? 2 : 3;
      for (var i = 0; i < nClaw; i++) {
        var cl = cone(R * 0.04 * (p.bigClaw && i === 0 ? 2 : 1), R * (p.bigClaw && i === 0 ? 0.5 : 0.22), mats.dark, 5);
        cl.position.set((i - (nClaw - 1) / 2) * R * 0.07, 0, 0);
        cl.rotation.x = Math.PI * 0.85; hand.add(cl);
      }
      if (p.feathers) {
        for (var fq = 0; fq < 4; fq++) {
          var fw = cone(R * 0.05, al * (0.55 - fq * 0.07), mats.accent, 4);
          fw.position.set(0, -al * (0.1 + fq * 0.11), -R * 0.05); fw.rotation.x = -2.0; ar.bones[1].add(fw);
        }
      }
      a.arms.push({ sh: ar.bones[0], el: ar.bones[1], side: s });
    });

    /* Vela (Spinosaurus) */
    if (p.sail) {
      var shp = new T.Shape();
      shp.moveTo(0, 0);
      shp.bezierCurveTo(B * 0.1, B * 0.55, B * 0.6, B * 0.62, B * 0.95, 0);
      shp.lineTo(0, 0);
      var sail = new T.Mesh(new T.ShapeGeometry(shp, 16), mats.accent);
      sail.castShadow = true;
      sail.rotation.y = -Math.PI / 2;
      sail.position.set(0, R * 0.7, -0.3 * B);
      torsoP.add(sail);
      for (var rb = 1; rb < 9; rb++) {
        var rib = mesh(new T.CylinderGeometry(0.008, 0.012, 1, 4), mats.dark);
        var h = Math.max(0.05, 0.62 * B * Math.sin(Math.PI * rb / 9) * 0.88);
        rib.scale.y = h; rib.position.set(0, R * 0.7 + h / 2, -0.3 * B + rb / 9 * B * 0.95);
        torsoP.add(rib);
      }
    }

    /* Cola continua */
    var tailBase = grp(0, R * 0.12, -0.3 * B, torsoP);
    var TL = p.tail * 2.3, nTail = 6, tl = [];
    for (var ti = 0; ti < nTail; ti++) tl.push(TL / nTail);
    var tail = skinTube(tailBase, tl, function (t) { return R * (0.85 * Math.pow(1 - t, 1.25) + 0.03); }, mats.skinSk,
      { axis: '-z', back: R * 0.6, sx: 0.75, sy: p.paddleTail ? 1.25 : 1, rest: function (i) { return i === 0 ? 0.1 : -0.015; } });
    a.tail = tail.bones;
    if (p.paddleTail) {
      a.tail.forEach(function (tg, i) {
        if (i < 2) return;
        var seg = TL / nTail, h0 = R * (1.1 - (i - 2) * 0.22), h1 = R * (1.1 - (i - 1) * 0.22);
        var fs = new T.Shape(); fs.moveTo(0, 0); fs.lineTo(0, Math.max(0.02, h0)); fs.lineTo(seg * 1.05, Math.max(0.02, h1)); fs.lineTo(seg * 1.05, 0); fs.lineTo(0, 0);
        var fm = mesh(new T.ShapeGeometry(fs), mats.accent);
        fm.rotation.y = Math.PI / 2; fm.position.set(0, R * 0.1, 0); tg.add(fm);
      });
    }
    if (p.feathers) {
      for (var tf = 0; tf < 6; tf++) {
        var tfe = cone(R * 0.05, R * 0.9, mats.accent, 4);
        tfe.position.set((tf % 2 ? 1 : -1) * R * 0.03, 0, -tf * 0.04);
        tfe.rotation.x = -Math.PI / 2 - 0.2; tfe.rotation.z = (tf % 2 ? 1 : -1) * 0.5; tail.end.add(tfe);
      }
    }

    /* Piernas continuas: muslo, canilla, metatarso */
    a.legs = [];
    [-1, 1].forEach(function (s) {
      var root = grp(s * R * 0.6, -R * 0.05, -0.02 * B, hips);
      var thick = R * 0.68;
      var leg = skinTube(root, [0.46, 0.46, 0.27], function (t) {
        if (t < 0.38) return thick * (0.95 + 0.25 * Math.sin(Math.PI * t / 0.38 * 0.7));
        if (t < 0.4) return thick * 0.9;
        if (t < 0.77) return thick * (0.55 - 0.25 * (t - 0.4) / 0.37);
        return thick * 0.26;
      }, mats.limbSk, { axis: '-y', back: R * 0.15, sx: 0.66, blend: 0.3,
        rest: function (i) { return [-0.45, 0.95, -0.75][i]; } });
      var foot = grp(0, 0, 0, leg.end); foot.rotation.x = 0.25;
      for (var i = -1; i <= 1; i++) {
        var toe = mesh(segGeom(0.22, R * 0.11, R * 0.06, { axis: 'z' }), mats.limb);
        toe.rotation.y = i * 0.32; foot.add(toe);
        var cl = cone(R * 0.05, R * 0.22, mats.dark, 5);
        cl.rotation.x = Math.PI / 2 + 0.3; cl.position.set(Math.sin(i * 0.32) * 0.21, -0.01, Math.cos(i * 0.32) * 0.21);
        foot.add(cl);
      }
      if (p.slim) {
        var sickle = cone(R * 0.07, R * 0.45, mats.dark, 5);
        sickle.position.set(s * 0.02, 0.03, 0.05); sickle.rotation.x = -0.5; foot.add(sickle);
      }
      a.legs.push({ hip: leg.bones[0], knee: leg.bones[1], ankle: leg.bones[2], foot: foot, side: s, phase: s > 0 ? 0 : Math.PI, front: false });
    });
  }

  /* =============================================================
     Cuadrúpedos
     ============================================================= */
  function buildQuad(a, p, mats) {
    var L = 1.7 * p.len, R = p.bodyR * 1.15;
    var sx = p.wide ? 1.3 : 0.92, sy = p.wide ? 0.72 : 1;
    var hips = grp(0, p.legH * 2.0 + R * sy * 0.3, 0, a.body); a.hips = hips;
    var torsoP = grp(0, 0, 0, hips); a.torso = torsoP;
    torsoP.rotation.x = p.frontTall ? -0.26 : p.frontShort ? 0.1 : 0;
    var torso = mesh(segGeom(L, R * 1.0, R * 0.85, { bulge: R * 0.35, sx: sx, sy: sy, k: 2.2 }), mats.skin);
    torso.position.z = -0.42 * L; torsoP.add(torso);
    a.torsoMesh = torso;

    var neckBase = grp(0, R * 0.2, 0.4 * L, torsoP);
    var nl = Math.max(0.15, p.neck * 1.8);
    var nSeg = p.longNeck ? 6 : 2, nls = [];
    for (var q = 0; q < nSeg; q++) nls.push(nl / nSeg);
    var nk = skinTube(neckBase, nls, lerpR(R * (p.longNeck ? 0.6 : 0.72), R * (p.longNeck ? 0.2 : 0.5)), mats.skinSk, {
      axis: 'z', back: R * 0.5, sx: 0.85, cap: false,
      rest: function (i) { return p.longNeck ? (i === 0 ? -0.85 : -0.05) : (p.tubeCrest ? (i === 0 ? -0.35 : 0.05) : (i === 0 ? 0.1 : 0.12)); }
    });
    a.neck = nk.bones;
    var head = grp(0, 0, 0, nk.end); a.head = head;
    head.rotation.x = p.longNeck ? 1.05 : p.tubeCrest ? 0.4 : 0.25;
    var HL = p.head * 2.0, hr = Math.max(0.1, p.head * 0.62);
    if (p.longNeck) { HL = 0.38; hr = 0.115; }
    var skull = mesh(segGeom(HL, hr, hr * (p.duckBill ? 0.7 : 0.45), { sx: p.duckBill ? 0.95 : 0.85, sy: p.duckBill ? 0.8 : 1.05, k: 2.2, bulge: hr * 0.1 }), mats.skin);
    skull.position.set(0, hr * 0.1, -hr * 0.4); head.add(skull);
    var jawP = grp(0, -hr * 0.35, -hr * 0.2, head); a.jaw = jawP; jawP.rotation.x = 0.04;
    var jaw = mesh(segGeom(HL * 0.85, hr * 0.55, hr * 0.25, { sx: 0.8, sy: 0.45 }), mats.skin);
    jawP.add(jaw);
    addEyes(head, hr * 0.66, hr * 0.48, HL * 0.12, hr * 0.15, mats, a);
    if (p.beak || p.horns) {
      var bk = cone(hr * 0.28, hr * 0.7, mats.dark, 8);
      bk.rotation.x = Math.PI / 2 + 0.5; bk.position.set(0, -hr * 0.05, HL * 0.85); head.add(bk);
    }
    if (p.horns) {
      [-1, 1].forEach(function (s) {
        var h = cone(hr * 0.17, hr * 2.2, mats.bone, 10);
        h.position.set(s * hr * 0.42, hr * 0.75, HL * 0.18);
        h.rotation.x = 1.0; h.rotation.z = -s * 0.12; head.add(h);
      });
      var nh = cone(hr * 0.15, hr * 0.75, mats.bone, 8);
      nh.position.set(0, hr * 0.5, HL * 0.72); nh.rotation.x = 0.5; head.add(nh);
    }
    if (p.frill) {
      var fh = grp(0, hr * 0.5, -hr * 0.2, head);
      fh.rotation.x = -0.62;
      var fr = new T.Mesh(new T.CylinderGeometry(hr * 2.0, hr * 2.0, hr * 0.12, 28, 1, false, -Math.PI * 0.6, Math.PI * 1.2), mats.skin);
      fr.castShadow = true;
      fr.rotation.x = -Math.PI / 2;
      fr.position.z = -0.02;
      fh.add(fr);
      for (var i = 0; i < 11; i++) {
        var ang = -Math.PI * 0.6 + (i + 0.5) / 11 * Math.PI * 1.2;
        var kn = mesh(new T.ConeGeometry(hr * 0.13, hr * 0.38, 6), mats.accent);
        kn.position.set(Math.sin(ang) * hr * 2.0, Math.cos(ang) * hr * 2.0, -0.02);
        kn.rotation.z = -ang;
        fh.add(kn);
      }
    }
    if (p.tubeCrest) {
      var tc = mesh(segGeom(HL * 1.9, hr * 0.26, hr * 0.2, { axis: '-z', k: 3 }), mats.accent);
      tc.position.set(0, hr * 0.7, HL * 0.5); tc.rotation.x = 0.35; head.add(tc);
    }
    if (p.longNeck) {
      var dome = mesh(new T.SphereGeometry(hr * 0.7, 12, 10), mats.skin);
      dome.position.set(0, hr * 0.75, HL * 0.3); dome.scale.set(0.9, 0.7, 1.1); head.add(dome);
    }

    if (p.plates) {
      var ps = new T.Shape();
      ps.moveTo(-0.5, 0); ps.quadraticCurveTo(-0.55, 0.65, 0, 1); ps.quadraticCurveTo(0.55, 0.65, 0.5, 0); ps.lineTo(-0.5, 0);
      var pg = new T.ExtrudeGeometry(ps, { depth: 0.035, bevelEnabled: false, curveSegments: 8 });
      pg.translate(0, 0, -0.0175);
      for (var k = 0; k < 9; k++) {
        var t = k / 8;
        var size = 0.18 + 0.42 * Math.sin(Math.PI * (0.15 + t * 0.8));
        var pl = mesh(pg, mats.accent);
        pl.scale.set(size * 0.95, size * 1.05, 1);
        pl.rotation.y = Math.PI / 2;
        pl.rotation.z = (k % 2 ? 0.12 : -0.12);
        pl.position.set((k % 2 ? 1 : -1) * 0.05, R * sy * 0.8 + Math.sin(Math.PI * t) * 0.06, -0.48 * L + t * L * 0.9);
        torsoP.add(pl);
      }
    }
    if (p.armor) {
      var og = new T.ConeGeometry(0.055, 0.09, 6); og.translate(0, 0.045, 0);
      for (var row = 0; row < 5; row++) {
        for (var col = -3; col <= 3; col++) {
          var ang2 = col / 3 * 1.1;
          var o = mesh(og, mats.accent);
          var zz = -0.38 * L + row / 4 * L * 0.8;
          o.position.set(Math.sin(ang2) * R * sx * 0.95, Math.cos(ang2) * R * sy * 0.98, zz);
          o.rotation.z = -ang2;
          torsoP.add(o);
        }
      }
      [-1, 1].forEach(function (s) {
        for (var i = 0; i < 4; i++) {
          var sp = cone(0.05, 0.22, mats.bone, 6);
          sp.position.set(s * R * sx * 0.98, 0, -0.35 * L + i * 0.28 * L);
          sp.rotation.z = -s * 1.45; torsoP.add(sp);
        }
      });
    }

    var tailBase = grp(0, R * 0.1, -0.38 * L, torsoP);
    var TL = p.tail * 2.6, tls = [];
    for (var ti = 0; ti < 6; ti++) tls.push(TL / 6);
    var tail = skinTube(tailBase, tls, function (t) { return R * (p.wide ? 0.7 : 0.78) * Math.pow(1 - t, 1.2) + R * 0.04; }, mats.skinSk, {
      axis: '-z', back: R * 0.6, sx: p.wide ? 1.05 : 0.8, sy: p.wide ? 0.7 : 1,
      rest: function (i) { return i === 0 ? (p.frontTall ? 0.25 : 0.06) : 0.02; }
    });
    a.tail = tail.bones;
    if (p.thagomizer) {
      var tg = a.tail[4];
      [-1, 1].forEach(function (s) {
        for (var i = 0; i < 2; i++) {
          var sp = cone(0.035, 0.38, mats.bone, 6);
          sp.position.set(s * 0.04, 0.04, -0.05 - i * 0.12);
          sp.rotation.z = -s * 1.0; sp.rotation.x = -0.6; tg.add(sp);
        }
      });
    }
    if (p.club) {
      var club = mesh(new T.SphereGeometry(0.16, 14, 10), mats.accent);
      club.scale.set(1.5, 0.7, 1.0); tail.end.add(club);
    }

    a.legs = [];
    a.body.updateMatrixWorld(true);
    [{ z: 0.34 * L, front: true }, { z: -0.24 * L, front: false }].forEach(function (sp) {
      [-1, 1].forEach(function (s) {
        var root = grp(s * R * sx * 0.7, -R * sy * 0.3, sp.z, torsoP);
        root.rotation.x = -torsoP.rotation.x;
        root.updateMatrixWorld(true);
        var wp = new T.Vector3(); root.getWorldPosition(wp);
        var hgt = wp.y, front = sp.front;
        var thick = R * (front ? 0.44 : 0.56) * (p.longNeck ? 1.1 : 1);
        var leg = skinTube(root, [hgt * 0.52, hgt * 0.44], function (t) {
          return t < 0.5 ? thick * (1 + 0.18 * Math.sin(Math.PI * t / 0.5)) : thick * (0.72 - 0.1 * (t - 0.5) / 0.5);
        }, mats.limbSk, { axis: '-y', back: thick * 0.5, sx: 0.88, cap: false,
          rest: function (i) { return i === 0 ? 0 : (front ? -0.1 : 0.12); } });
        var foot = grp(0, 0, 0, leg.end);
        var fm = mesh(new T.SphereGeometry(thick * 0.78, 14, 10), mats.limb);
        fm.scale.set(1, 0.45, 1.15); fm.position.set(0, thick * 0.12, thick * 0.12); foot.add(fm);
        for (var i = -1; i <= 1; i++) {
          var nail = mesh(new T.SphereGeometry(thick * 0.18, 6, 5), mats.bone);
          nail.position.set(i * thick * 0.4, -thick * 0.08, thick * 0.74); foot.add(nail);
        }
        a.legs.push({ hip: leg.bones[0], knee: leg.bones[1], foot: foot, side: s, front: front, phase: (front ? 0 : Math.PI) + (s > 0 ? Math.PI : 0) });
      });
    });
  }

  /* =============================================================
     Pterosaurios
     ============================================================= */
  function buildPtero(a, p, mats) {
    var S = p.span;
    var hips = grp(0, 1.0, 0, a.body); a.hips = hips;
    var torsoP = grp(0, 0, 0, hips); a.torso = torsoP; torsoP.rotation.x = -0.15;
    var torso = mesh(segGeom(0.55, 0.13, 0.1, { bulge: 0.04, sx: 0.9, sy: 0.95 }), mats.skin);
    torso.position.z = -0.25; torsoP.add(torso);
    a.torsoMesh = torso;
    var neckBase = grp(0, 0.03, 0.22, torsoP);
    var nl = p.longNeck ? 0.75 : 0.32, nn = p.longNeck ? 3 : 2, nls = [];
    for (var q = 0; q < nn; q++) nls.push(nl / nn);
    var nk = skinTube(neckBase, nls, lerpR(0.075, 0.05), mats.skinSk, { axis: 'z', back: 0.05, cap: false, rest: function (i) { return i === 0 ? -0.65 : 0.12; } });
    a.neck = nk.bones;
    var head = grp(0, 0, 0, nk.end); head.rotation.x = 0.7; a.head = head;
    var big = p.bigHead ? 1.5 : 1;
    var skull = mesh(segGeom(0.22 * big, 0.08 * big, 0.06, { sx: 0.75, sy: p.bigHead ? 1.4 : 1 }), mats.skin);
    skull.position.z = -0.04; head.add(skull);
    var beakL = p.crest === 'quetzal' ? 0.85 : p.crest === 'dimorph' ? 0.25 : 0.6;
    var beak = cone(0.055 * big, beakL, mats.bone, 10);
    beak.rotation.x = Math.PI / 2; beak.position.z = 0.14 * big; beak.scale.set(0.7, 1, 1.05); head.add(beak);
    var jawP = grp(0, -0.03, 0.08, head); a.jaw = jawP;
    var lb = cone(0.035 * big, beakL * 0.92, mats.bone, 8);
    lb.rotation.x = Math.PI / 2; lb.position.z = 0.04; lb.scale.set(0.7, 1, 0.6); jawP.add(lb);
    if (p.crest === 'dimorph') teethRow(head, 0.16, 0.035, -0.02, 0.12, 4, 0.012, mats, true);
    addEyes(head, 0.06 * big, 0.04 * big, 0.04, 0.025 * big, mats, a);
    if (p.crest === 'ptera') {
      var c = cone(0.04, 0.55, mats.accent, 6);
      c.rotation.x = -Math.PI / 2 - 0.35; c.position.set(0, 0.05, -0.08); c.scale.set(0.5, 1, 1.8); head.add(c);
    } else if (p.crest === 'quetzal') {
      var qc = new T.Mesh(new T.CylinderGeometry(0.16, 0.16, 0.015, 16, 1, false, 0, Math.PI), mats.accent);
      qc.rotation.z = Math.PI / 2; qc.rotation.y = Math.PI / 2; qc.position.set(0, 0.06, 0.1); qc.scale.set(1, 1, 0.5); head.add(qc);
    } else {
      var dc = cone(0.03, 0.12, mats.accent, 5); dc.position.set(0, 0.1, 0.02); head.add(dc);
    }

    a.wings = [];
    [-1, 1].forEach(function (s) {
      var sh = grp(s * 0.1, 0.04, 0.16, torsoP);
      var up = mesh(segGeom(0.36 * S, 0.048, 0.035, { axis: s > 0 ? 'x' : '-x' }), mats.skin);
      sh.add(up);
      var el = grp(s * 0.33 * S, 0, 0, sh);
      var fo = mesh(segGeom(0.42 * S, 0.035, 0.025, { axis: s > 0 ? 'x' : '-x' }), mats.skin);
      el.add(fo);
      var fing = mesh(segGeom(0.95 * S, 0.022, 0.006, { axis: s > 0 ? 'x' : '-x' }), mats.skin);
      fing.position.x = s * 0.4 * S; fing.rotation.y = s * 0.35; el.add(fing);
      var g1 = new T.BufferGeometry();
      g1.setAttribute('position', new T.BufferAttribute(new Float32Array([0, 0, 0.04, s * 0.33 * S, 0, 0, s * 0.3 * S, 0, -0.38, 0, 0, -0.45]), 3));
      g1.setAttribute('uv', new T.BufferAttribute(new Float32Array([0, 1, 1, 1, 1, 0, 0, 0]), 2));
      g1.setIndex([0, 1, 2, 0, 2, 3]); g1.computeVertexNormals();
      var m1 = new T.Mesh(g1, mats.wing); m1.castShadow = true; sh.add(m1);
      var tipX = s * (0.4 * S + Math.cos(0.35) * 0.95 * S), tipZ = -Math.sin(0.35) * 0.95 * S;
      var g2 = new T.BufferGeometry();
      g2.setAttribute('position', new T.BufferAttribute(new Float32Array([0, 0, 0.03, s * 0.4 * S, 0, 0.02, tipX, 0, tipZ, s * 0.25 * S, 0, -0.42, -s * 0.03 * S, 0, -0.38]), 3));
      g2.setAttribute('uv', new T.BufferAttribute(new Float32Array([0, 1, 0.5, 1, 1, 0.3, 0.6, 0, 0, 0]), 2));
      g2.setIndex([0, 1, 4, 1, 3, 4, 1, 2, 3]); g2.computeVertexNormals();
      var m2 = new T.Mesh(g2, mats.wing); m2.castShadow = true; el.add(m2);
      a.wings.push({ sh: sh, el: el, side: s });
    });
    a.legs = [];
    [-1, 1].forEach(function (s) {
      var hip = grp(s * 0.07, -0.05, -0.2, torsoP); hip.rotation.x = 0.9;
      var lg = mesh(segGeom(0.28, 0.035, 0.02, { axis: '-y' }), mats.skin); hip.add(lg);
      var ft = cone(0.03, 0.08, mats.dark, 5); ft.position.y = -0.3; ft.rotation.x = Math.PI / 2; hip.add(ft);
      a.legs.push({ hip: hip, side: s, phase: s > 0 ? 0 : Math.PI, dangle: true });
    });
    var tailBase = grp(0, 0, -0.27, torsoP);
    var tln = p.longTail ? 5 : 2, TLp = p.longTail ? 0.7 : 0.12, tls = [];
    for (var ti = 0; ti < tln; ti++) tls.push(TLp / tln);
    var tail = skinTube(tailBase, tls, lerpR(0.045, 0.008), mats.skinSk, { axis: '-z', back: 0.04, rest: function () { return 0.02; } });
    a.tail = tail.bones;
    if (p.longTail) {
      var vane = new T.Mesh(new T.CircleGeometry(0.06, 4), mats.accent);
      vane.rotation.y = Math.PI / 2; tail.end.add(vane);
    }
    a.flying = true;
  }

  /* =============================================================
     Plesiosaurio
     ============================================================= */
  function buildPlesio(a, p, mats) {
    var hips = grp(0, 1.0, 0, a.body); a.hips = hips;
    var torsoP = grp(0, 0, 0, hips); a.torso = torsoP;
    var torso = mesh(segGeom(1.25, 0.34, 0.3, { bulge: 0.12, sx: 1.2, sy: 0.62, k: 2.1 }), mats.skin);
    torso.position.z = -0.6; torsoP.add(torso);
    a.torsoMesh = torso;
    var neckBase = grp(0, 0.04, 0.5, torsoP);
    var NL = 1.5 * p.neck * 1.8, nls = [];
    for (var q = 0; q < 6; q++) nls.push(NL / 6);
    var nk = skinTube(neckBase, nls, lerpR(0.19, 0.075), mats.skinSk, { axis: 'z', back: 0.1, cap: false, sx: 0.95, rest: function (i) { return i === 0 ? -0.45 : 0.02; } });
    a.neck = nk.bones;
    var head = grp(0, 0, 0, nk.end); head.rotation.x = 0.5; a.head = head;
    var skull = mesh(segGeom(0.3, 0.1, 0.05, { sx: 0.9, sy: 0.8 }), mats.skin);
    skull.position.z = -0.04; head.add(skull);
    var jawP = grp(0, -0.04, 0, head); a.jaw = jawP;
    var jaw = mesh(segGeom(0.26, 0.06, 0.03, { sx: 0.85, sy: 0.5 }), mats.skin); jawP.add(jaw);
    teethRow(head, 0.16, 0.05, -0.03, 0.1, 5, 0.01, mats, true);
    addEyes(head, 0.07, 0.04, 0.06, 0.025, mats, a);
    a.flippers = [];
    [[0.32, 1], [-0.42, 0.85]].forEach(function (fz) {
      [-1, 1].forEach(function (s) {
        var fg = grp(s * 0.3, -0.06, fz[0], torsoP);
        var fl = mesh(segGeom(0.75 * fz[1], 0.13, 0.03, { axis: s > 0 ? 'x' : '-x', sy: 0.25, sz: 1, k: 2 }), mats.skin);
        fl.rotation.y = s * 0.45; fg.add(fl);
        a.flippers.push({ g: fg, side: s, front: fz[0] > 0 });
      });
    });
    var tailBase = grp(0, 0, -0.55, torsoP);
    var tail = skinTube(tailBase, [0.15, 0.15, 0.15, 0.15], lerpR(0.2, 0.02), mats.skinSk, { axis: '-z', back: 0.1, sy: 0.7, rest: function () { return 0.02; } });
    a.tail = tail.bones;
    a.legs = [];
    a.swimming = true;
  }

  /* =============================================================
     Actor: modelo + animaciones
     ============================================================= */
  /* Caja real de un modelo con huesos (tras aplicar la pose) */
  function skinnedBox(obj) {
    obj.updateMatrixWorld(true);
    var box = new T.Box3(), v = new T.Vector3();
    obj.traverse(function (m) {
      if (!m.isMesh) return;
      var pos = m.geometry.attributes.position;
      if (m.isSkinnedMesh && m.boneTransform) {
        m.skeleton.update();
        for (var i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i); m.boneTransform(i, v); v.applyMatrix4(m.matrixWorld); box.expandByPoint(v);
        }
      } else box.expandByObject(m);
    });
    return box;
  }
  /* ---------------- Ropa navideña (accesorios en la cabeza) ---------------- */
  function findHead(a) {
    if (!a.isGLB) return a.head || null;
    var h = null;
    a.body.traverse(function (o) { if (!h && o.isBone && /^head$/i.test(o.name)) h = o; });
    if (!h) a.body.traverse(function (o) { if (!h && o.isBone && /head/i.test(o.name)) h = o; });
    return h;
  }
  function headBox(a, anchor) {
    var box = new T.Box3(), v = new T.Vector3(), n = 0;
    a.root.updateMatrixWorld(true);
    if (a.isGLB) {
      a.body.traverse(function (o) {
        if (!o.isSkinnedMesh) return;
        var bi = o.skeleton.bones.indexOf(anchor); if (bi < 0) return;
        o.skeleton.update();
        var pos = o.geometry.attributes.position, si = o.geometry.attributes.skinIndex, sw = o.geometry.attributes.skinWeight;
        for (var i = 0; i < pos.count; i++) {
          var w = (si.getX(i) === bi ? sw.getX(i) : 0) + (si.getY(i) === bi ? sw.getY(i) : 0) + (si.getZ(i) === bi ? sw.getZ(i) : 0) + (si.getW(i) === bi ? sw.getW(i) : 0);
          if (w < 0.5) continue;
          v.fromBufferAttribute(pos, i); o.boneTransform(i, v); v.applyMatrix4(o.matrixWorld); box.expandByPoint(v); n++;
        }
      });
    } else { box.setFromObject(anchor); n = box.isEmpty() ? 0 : 1; }
    return n ? box : null;
  }
  function om(c, o) { o = o || {}; return new T.MeshStandardMaterial({ color: c, roughness: o.r === undefined ? 0.7 : o.r, metalness: o.m || 0, emissive: o.em || '#000000', emissiveIntensity: o.ei || 0 }); }
  function buildOutfit(kind) {
    /* unidad: ancho de cabeza = 1, base en y = 0, frente hacia +z */
    var g = new T.Group(), m;
    function mesh(geo, mat, x, y, z) { var k = new T.Mesh(geo, mat); k.position.set(x || 0, y || 0, z || 0); k.castShadow = true; g.add(k); return k; }
    if (kind === 'santa' || kind === 'duende') {
      var red = om(kind === 'santa' ? '#d62839' : '#1f9d55'), white = om(kind === 'santa' ? '#ffffff' : '#ffd166', { r: 0.95 });
      mesh(new T.CylinderGeometry(0.46, 0.5, 0.16, 20), white, 0, 0.08, 0);
      var cone = mesh(new T.ConeGeometry(0.42, kind === 'santa' ? 0.95 : 1.2, 20, 4), red, 0, 0.6, -0.05);
      cone.rotation.x = -0.35;
      var tipY = kind === 'santa' ? 1.02 : 1.17, tipZ = kind === 'santa' ? -0.22 : -0.28;
      if (kind === 'santa') mesh(new T.SphereGeometry(0.13, 12, 10), white, 0, tipY, tipZ);
      else mesh(new T.SphereGeometry(0.1, 12, 10), om('#ffd23f', { m: 0.6, r: 0.3 }), 0, tipY, tipZ);
    } else if (kind === 'lana') {
      var blue = om('#3a7bd5', { r: 0.95 }), wh = om('#ffffff', { r: 0.95 });
      mesh(new T.SphereGeometry(0.46, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), blue, 0, 0.05, 0);
      mesh(new T.CylinderGeometry(0.48, 0.48, 0.16, 20), wh, 0, 0.08, 0);
      mesh(new T.TorusGeometry(0.4, 0.035, 6, 20), wh, 0, 0.3, 0).rotation.x = Math.PI / 2;
      mesh(new T.SphereGeometry(0.15, 12, 10), wh, 0, 0.55, 0);
    } else if (kind === 'reno') {
      var br = om('#8a5a2b');
      [-1, 1].forEach(function (sd) {
        var a = new T.Group(); a.position.set(sd * 0.28, 0, -0.05); a.rotation.z = -sd * 0.35; g.add(a);
        var t = new T.Mesh(new T.CylinderGeometry(0.05, 0.07, 0.75, 8), br); t.position.y = 0.37; a.add(t);
        [[0.28, 0.6], [0.5, -0.7], [0.68, 0.5]].forEach(function (q) {
          var b = new T.Mesh(new T.CylinderGeometry(0.035, 0.045, 0.32, 6), br); b.position.set(sd * 0.1 * Math.sign(q[1]), q[0], 0); b.rotation.z = -sd * q[1]; a.add(b);
        });
      });
    } else if (kind === 'estrella') {
      var sh = new T.Shape();
      for (var i = 0; i < 10; i++) { var r = i % 2 ? 0.2 : 0.46, an = i / 10 * Math.PI * 2 + Math.PI / 2; if (i) sh.lineTo(Math.cos(an) * r, Math.sin(an) * r); else sh.moveTo(Math.cos(an) * r, Math.sin(an) * r); }
      var st = mesh(new T.ExtrudeGeometry(sh, { depth: 0.12, bevelEnabled: false }), om('#ffd23f', { m: 0.5, r: 0.3, em: '#ffb300', ei: 0.7 }), 0, 0.6, -0.06);
      mesh(new T.CylinderGeometry(0.03, 0.03, 0.3, 6), om('#d9a400'), 0, 0.2, 0);
    }
    g.traverse(function (o) { if (o.isMesh) o.userData.outfit = true; });
    return g;
  }
  function dress(a, kind) {
    var anchor = findHead(a); if (!anchor) return;
    var box = headBox(a, anchor); if (!box) return;
    var sz = box.getSize(new T.Vector3()), c = box.getCenter(new T.Vector3());
    var w = Math.max(Math.max(sz.x, Math.min(sz.y, sz.z)) * 0.95, (a.height || 1) * (kind === 'reno' ? 0.2 : 0.17));
    var acc = buildOutfit(kind);
    acc.scale.setScalar(w);
    acc.position.set(c.x, box.max.y - sz.y * 0.12, c.z - sz.z * (a.kind === 'ptero' ? 0.05 : 0.12));
    acc.updateMatrix(); acc.updateMatrixWorld(true);
    anchor.attach(acc);
    a.outfitObj = acc;
    a.flashMats = a.flashMats.concat([]);
  }
  DC.Models_dress = dress;
  var DISPLAY_H = { theropod: 1.75, quad: 1.45, ptero: 1.0, plesio: 1.25 };

  function Actor(sp, opts) {
    opts = opts || {};
    this.sp = sp;
    this.kind = sp.model.kind;
    this.variant = opts.variant || (opts.golden ? 'oro' : 'normal');
    this.look = DC.look(this.variant);
    this.golden = this.variant === 'oro';
    this.root = new T.Group();
    this.inner = grp(0, 0, 0, this.root);
    this.body = grp(0, 0, 0, this.inner);
    this.eyes = []; this.accentMats = [];
    this.neck = []; this.tail = []; this.legs = []; this.arms = []; this.wings = []; this.flippers = [];
    var p = sp.model;
    var ext = opts.procedural ? null : DC.GLB.get(sp.id);
    if (ext) {
      buildFromGLB(this, ext);
    } else {
      this.mats = makeMats(sp.model.colors, this.look);
      if (this.kind === 'theropod') buildTheropod(this, p, this.mats);
      else if (this.kind === 'quad') buildQuad(this, p, this.mats);
      else if (this.kind === 'ptero') buildPtero(this, p, this.mats);
      else buildPlesio(this, p, this.mats);
      this.flashMats = [this.mats.skin, this.mats.skinSk, this.mats.limb, this.mats.limbSk, this.mats.accent].concat(this.accentMats);
      if (this.mats.wing) this.flashMats.push(this.mats.wing);
    }
    this.baseEmissive = this.flashMats.map(function (m) { return { c: m.emissive.clone(), i: m.emissiveIntensity }; });

    /* Captura de pose de reposo */
    var all = [this.hips, this.torso, this.head, this.jaw].concat(this.neck, this.tail);
    this.legs.forEach(function (l) { all.push(l.hip, l.knee, l.ankle, l.foot); });
    this.arms.forEach(function (l) { all.push(l.sh, l.el); });
    this.wings.forEach(function (l) { all.push(l.sh, l.el); });
    this.flippers.forEach(function (l) { all.push(l.g); });
    all.forEach(function (g) { if (g) g.userData.r0 = g.rotation.clone(); g && (g.userData.p0 = g.position.clone()); });

    /* Normalizar tamaño: altura visible estándar en AR */
    this.body.updateMatrixWorld(true);
    var box = this.isGLB ? skinnedBox(this.body) : new T.Box3().setFromObject(this.body);
    var size = box.getSize(new T.Vector3());
    var target = DISPLAY_H[this.kind] * (sp.id === 'brachiosaurus' ? 1.85 : sp.id === 'trex' ? 1.2 : sp.id === 'velociraptor' ? 0.75 : sp.id === 'dimorphodon' ? 0.75 : sp.id === 'quetzalcoatlus' ? 1.3 : 1);
    var dim = this.kind === 'ptero' ? size.x * 0.55 : this.kind === 'plesio' ? size.z * 0.55 : Math.max(size.y, size.z * 0.42);
    var sc = target / dim;
    this.body.scale.setScalar(sc);
    this.scale = sc;
    this.body.position.y = -box.min.y * sc + (this.kind === 'ptero' ? 1.1 : this.kind === 'plesio' ? 0.35 : 0);
    if (this.isGLB) {
      var cen = box.getCenter(new T.Vector3());
      this.body.position.x = -cen.x * sc; this.body.position.z = -cen.z * sc;
    }
    this.baseBodyY = this.body.position.y;
    this.height = size.y * sc;
    this.length = size.z * sc;
    this.radius = Math.max(size.x, size.z) * sc * 0.5;
    /* punto de impacto aproximado (pecho) */
    var xo = opts.outfit || (DC.XMAS_BY && DC.XMAS_BY[this.variant] && DC.XMAS_BY[this.variant].outfit);
    if (xo) { try { dress(this, xo); } catch (e) { console.warn('outfit', e); } }
    this.outfit = xo || null;
    this.chestLocal = new T.Vector3(0, this.baseBodyY + (this.kind === 'ptero' ? 0.05 : this.height * 0.55), this.length * 0.15);

    this.t = Math.random() * 10;
    this.walk = 0; this.walkPhase = 0;
    this.action = null; this.hold = null;
    this.flash = 0; this.flashColor = new T.Color('#ff3020');
    this.opacity = 1;
    this.lookYaw = 0;
  }

  Actor.prototype.setOpacity = function (o) {
    this.opacity = o;
    var all = [];
    this.root.traverse(function (x) { if (x.material && all.indexOf(x.material) < 0) all.push(x.material); });
    all.forEach(function (m) { m.transparent = o < 1; m.opacity = o; m.depthWrite = o > 0.5; });
  };
  Actor.prototype.chestWorld = function () {
    var c = this.chestLocal.clone();
    var down = this.hold === 'faint' || this.hold === 'kneel' || (this.action && (this.action.name === 'faint' || this.action.name === 'kneel'));
    if (down) { c.y = this.baseBodyY + this.height * 0.22; c.z = 0; }
    return this.root.localToWorld(c);
  };
  Actor.prototype.faceTo = function (x, z) {
    this.root.rotation.y = Math.atan2(x - this.root.position.x, z - this.root.position.z);
  };
  Actor.prototype.hit = function (color) {
    this.flash = 1;
    this.flashColor.set(color || '#ff3020');
  };

  /* Ejecuta una acción. Devuelve una promesa al terminar. */
  Actor.prototype.play = function (name, opts) {
    var self = this;
    opts = opts || {};
    var D = { roar: 1.7, attack: 0.85, strike: 0.5, hit: 0.5, dodge: 0.5, faint: 1.3, kneel: 0.9, special: 1.4, celebrate: 1.3,
      flee: 1.8, spawn: 1.1, windup: opts.dur || 1.0, shrink: 0.55, grow: 0.5, wake: 0.6 };
    if (this.action && this.action.resolve) this.action.resolve();
    this.hold = null;
    return new Promise(function (res) {
      self.action = { name: name, t: 0, dur: opts.dur || D[name] || 1, opts: opts, resolve: res, fired: false };
    });
  };

  function ease(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
  function bell(u, a, b) { if (u <= a || u >= b) return 0; var x = (u - a) / (b - a); return Math.sin(Math.PI * x); }
  function ramp(u, a, b) { return Math.min(1, Math.max(0, (u - a) / (b - a))); }

  Actor.prototype.update = function (dt) {
    this.t += dt;
    var t = this.t;
    var P = { y: 0, z: 0, x: 0, rotY: 0, rotZ: 0, rotX: 0, pitch: 0, neck: 0, head: 0, headYaw: 0, jaw: 0.04, tailAmp: 1,
      tailLift: 0, crouch: 0, shake: 0, flap: 1, flapAmp: 1, armReach: 0, scale: 1, wingFold: 0 };
    /* ---- Reposo ---- */
    var br = Math.sin(t * 2.1);
    P.y = br * 0.008;
    P.neck = Math.sin(t * 1.25) * 0.05;
    P.headYaw = Math.sin(t * 0.55) * 0.22 + this.lookYaw;
    P.jaw = 0.05 + Math.max(0, Math.sin(t * 0.9)) * 0.05;
    if (this.flying) { P.y = Math.sin(t * 2.6) * 0.06; P.pitch = Math.sin(t * 1.3) * 0.05; }
    if (this.swimming) { P.y = Math.sin(t * 1.4) * 0.05; P.rotZ = Math.sin(t * 1.1) * 0.04; }

    /* ---- Acción en curso ---- */
    var A = this.action;
    if (A) {
      A.t += dt;
      var u = Math.min(1, A.t / A.dur);
      var n = A.name;
      if (n === 'roar') {
        var up = bell(u, 0.0, 0.95);
        P.neck -= 0.55 * up; P.head -= 0.25 * up; P.jaw = 0.05 + 0.75 * bell(u, 0.15, 0.9);
        P.pitch -= 0.12 * up; P.y += 0.05 * up; P.shake = bell(u, 0.25, 0.85) * 0.12;
        P.armReach = up * 0.4; P.tailLift = -0.15 * up;
        if (!A.fired && u > 0.2) { A.fired = true; A.opts.onPeak && A.opts.onPeak(); }
      } else if (n === 'windup') {
        var w = ease(ramp(u, 0, 0.6));
        P.z -= 0.22 * w; P.crouch = 0.12 * w; P.neck -= 0.25 * w; P.jaw = 0.1 + 0.35 * w;
        P.shake = u > 0.55 ? 0.06 * Math.sin(t * 60) : 0; P.tailLift = -0.1 * w;
        if (this.flying) { P.y += 0.35 * w; P.pitch -= 0.3 * w; }
      } else if (n === 'strike' || n === 'attack') {
        var off = n === 'attack' ? 0.3 : 0;
        var reach = (A.opts.reach || 0.9);
        var back = n === 'attack' ? bell(u, 0, 0.36) : 0;
        var lunge = bell(u, off * 0.9, 1);
        P.z += reach * lunge - 0.2 * back; P.neck += 0.4 * lunge - 0.25 * back; P.head += 0.15 * lunge;
        P.jaw = 0.1 + 0.7 * bell(u, off * 0.9, off + 0.35) ;
        P.pitch += 0.12 * lunge; P.crouch = 0.06 * lunge;
        if (this.flying) { P.y -= 0.6 * lunge; P.pitch += 0.4 * lunge; }
        if (!A.fired && u > off + (1 - off) * 0.35) { A.fired = true; A.opts.onImpact && A.opts.onImpact(); }
      } else if (n === 'hit') {
        var h = bell(u, 0, 1);
        P.z -= 0.28 * h; P.neck -= 0.3 * h; P.head -= 0.2 * h; P.jaw = 0.4 * h; P.rotZ += 0.08 * h * Math.sin(u * 20);
      } else if (n === 'dodge') {
        var d = bell(u, 0, 1), dir = A.opts.dir || 1;
        P.x += 0.75 * d * dir; P.rotZ -= 0.25 * d * dir; P.y += 0.12 * d;
      } else if (n === 'faint') {
        var f = ease(ramp(u, 0, 1));
        P.rotZ += (this.swimming ? 0.5 : 1.45) * f; P.y -= 0.12 * f; P.neck += 0.4 * f; P.jaw = 0.3 * f; P.tailAmp = 1 - f;
        if (this.flying) { P.y -= (this.baseBodyY - 0.25) * f; P.flapAmp = 1 - f; P.wingFold = f; P.rotZ -= 1.0 * f; }
        if (this.swimming) P.y -= 0.12 * f;
        if (u >= 1) this.hold = 'faint';
      } else if (n === 'kneel') {
        var k = ease(ramp(u, 0, 1));
        P.crouch = 0.3 * k; P.neck += 0.5 * k; P.head += 0.3 * k; P.jaw = 0.2; P.tailAmp = 0.3;
        if (this.flying) { P.y -= (this.baseBodyY - 0.15) * k; P.flapAmp = 1 - 0.8 * k; P.wingFold = k; }
        if (u >= 1) this.hold = 'kneel';
      } else if (n === 'special') {
        var rise = bell(u, 0, 0.45), go = bell(u, 0.4, 0.85);
        P.y += 0.35 * rise; P.neck -= 0.5 * rise; P.jaw = 0.1 + 0.8 * Math.max(rise, go);
        P.z += 1.3 * go; P.pitch += 0.2 * go - 0.25 * rise; P.shake = 0.05 * rise;
        if (this.flying) { P.y += 0.8 * rise - 1.2 * go; }
        if (!A.fired && u > 0.6) { A.fired = true; A.opts.onImpact && A.opts.onImpact(); }
      } else if (n === 'celebrate') {
        var j = Math.abs(Math.sin(u * Math.PI * 3));
        P.y += 0.25 * j * (1 - u * 0.5); P.neck -= 0.3 * j; P.jaw = 0.4 * j; P.tailAmp = 2;
      } else if (n === 'flee') {
        var turn = ease(ramp(u, 0, 0.3));
        P.rotY = Math.PI * turn;
        var run = ramp(u, 0.25, 1);
        this.walk = 1;
        this.root.translateZ(0); /* el desplazamiento lo maneja el escenario */
        P.fleeRun = run;
        if (u > 0.55) this.setOpacity(Math.max(0, 1 - (u - 0.55) / 0.45));
      } else if (n === 'spawn') {
        var s = ease(ramp(u, 0, 0.75));
        P.scale = 0.2 + 0.8 * s; P.y -= (1 - s) * 0.6;
      } else if (n === 'shrink') {
        var sh = ease(ramp(u, 0, 1));
        P.scale = 1 - sh * 0.98; P.y += sh * 0.4;
      } else if (n === 'grow') {
        P.scale = 0.05 + 0.95 * ease(ramp(u, 0, 1));
      } else if (n === 'wake') {
        P.crouch = 0.3 * (1 - u);
      }
      if (u >= 1 && A === this.action) {
        this.action = null;
        A.resolve && A.resolve();
      }
    }
    if (!this.action && this.hold === 'faint') {
      P.rotZ += this.swimming ? 0.5 : this.flying ? 0.45 : 1.45; P.y -= 0.12; P.neck += 0.4; P.jaw = 0.3; P.tailAmp = 0.05;
      if (this.flying) { P.y -= this.baseBodyY - 0.25; P.flapAmp = 0; P.wingFold = 1; }
      if (this.swimming) P.y -= 0.12;
    } else if (!this.action && this.hold === 'kneel') {
      P.crouch = 0.3; P.neck += 0.5 + Math.sin(t * 1.5) * 0.04; P.head += 0.3; P.jaw = 0.2; P.tailAmp = 0.3;
      if (this.flying) { P.y -= this.baseBodyY - 0.15; P.flapAmp = 0.2; P.wingFold = 1; }
    }

    this.applyPose(P, dt);

    /* Destello de golpe */
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt * 3.2);
      var self = this;
      this.flashMats.forEach(function (m, i) {
        m.emissive.copy(self.baseEmissive[i].c).lerp(self.flashColor, self.flash);
        m.emissiveIntensity = Math.max(self.baseEmissive[i].i, self.flash * 1.4);
      });
    }
  };

  Actor.prototype.applyPose = function (P, dt) {
    if (this.isGLB) return this.applyGLB(P, dt);
    var t = this.t;
    function R(g, dx, dy, dz) {
      if (!g) return;
      var r = g.userData.r0;
      g.rotation.set(r.x + (dx || 0), r.y + (dy || 0), r.z + (dz || 0));
    }
    this.inner.position.set(P.x + (P.shake ? (Math.random() - 0.5) * P.shake : 0), P.y, P.z);
    this.inner.rotation.set(P.rotX, P.rotY, P.rotZ);
    this.inner.scale.setScalar(P.scale);

    /* Caminata */
    if (this.walk > 0) this.walkPhase += dt * (this.kind === 'quad' ? 6 : 8.5);
    var wa = this.walk, ph = this.walkPhase;
    var bob = wa * Math.abs(Math.sin(ph)) * 0.04;
    if (this.hips) {
      this.hips.position.y = this.hips.userData.p0.y - P.crouch + bob * (1 / this.scale);
    }
    R(this.torso, P.pitch + wa * Math.sin(ph * 2) * 0.03, 0, 0);
    var nN = this.neck.length;
    this.neck.forEach(function (g, i) { R(g, P.neck / nN * (i === 0 ? 1.4 : 0.8), P.headYaw / nN * 0.6, 0); });
    R(this.head, P.head, P.headYaw * 0.5, 0);
    if (this.jaw) R(this.jaw, P.jaw, 0, 0);
    var nT = this.tail.length, tt = this.t;
    var tailSpeed = this.flying ? 2.2 : 1.7;
    this.tail.forEach(function (g, i) {
      var k = (i + 1) / nT;
      R(g, P.tailLift / nT, Math.sin(tt * tailSpeed - i * 0.55) * 0.1 * k * P.tailAmp + wa * Math.sin(ph - i * 0.5) * 0.06, 0);
    });
    var self = this;
    this.legs.forEach(function (l) {
      if (l.dangle) { R(l.hip, Math.sin(t * 2 + l.phase) * 0.08, 0, 0); return; }
      var s = Math.sin(ph + l.phase) * wa;
      var c = Math.max(0, Math.cos(ph + l.phase)) * wa;
      if (self.kind === 'theropod') {
        R(l.hip, s * 0.55 - P.crouch * 1.2, 0, 0);
        R(l.knee, c * 0.6 + P.crouch * 2.2, 0, 0);
        R(l.ankle, -c * 0.3 - P.crouch * 1.1, 0, 0);
      } else {
        R(l.hip, s * 0.35 - P.crouch * 0.5, 0, 0);
        R(l.knee, (l.front ? -1 : 1) * c * 0.4 + P.crouch * 1.0, 0, 0);
      }
    });
    this.arms.forEach(function (a) {
      R(a.sh, -P.armReach + Math.sin(t * 1.8 + a.side) * 0.05, 0, 0);
      R(a.el, -P.armReach * 0.5, 0, 0);
    });
    this.wings.forEach(function (w) {
      var f = Math.sin(t * 7.5) * 0.55 * P.flapAmp;
      var fold = P.wingFold;
      R(w.sh, 0, w.side * fold * 0.9, w.side * (f + 0.08) - w.side * fold * 0.4);
      R(w.el, 0, -w.side * fold * 1.6, w.side * (Math.sin(t * 7.5 - 0.7) * 0.35 * P.flapAmp));
    });
    this.flippers.forEach(function (f) {
      var a = Math.sin(t * 2.4 + (f.front ? 0 : 1.2)) * 0.35;
      R(f.g, 0, f.side * a * 0.4, f.side * a);
    });
  };

  Actor.prototype.dispose = function () {
    this.root.traverse(function (x) {
      if (x.geometry) x.geometry.dispose();
    });
    if (this.isGLB) {
      if (this.mixer) this.mixer.stopAllAction();
      this.glbMats.forEach(function (m) { m.dispose(); });
      if (this.root.parent) this.root.parent.remove(this.root);
      return;
    }
    var m = this.mats;
    Object.keys(m).forEach(function (k) { if (m[k]) m[k].dispose(); });
    if (this.root.parent) this.root.parent.remove(this.root);
  };

  /* =============================================================
     Modelos externos .glb (por ejemplo Quaternius, CC0)
     ============================================================= */
  var GLB = { loaded: {}, waiting: {}, failed: {} };
  function cfgFor(id) { return (DC.MODEL_FILES || {})[id]; }
  GLB.has = function (id) { return !!cfgFor(id); };
  GLB.get = function (id) { return GLB.loaded[id] || null; };
  GLB.load = function (id) {
    var cfg = cfgFor(id);
    if (!cfg || !T.GLTFLoader || GLB.failed[id]) return Promise.resolve(null);
    if (GLB.loaded[id]) return Promise.resolve(GLB.loaded[id]);
    if (GLB.waiting[id]) return GLB.waiting[id];
    GLB.waiting[id] = new Promise(function (res) {
      var loader = new T.GLTFLoader();
      loader.load(cfg.file, function (gltf) {
        var entry = { gltf: gltf, cfg: cfg };
        GLB.loaded[id] = entry;
        if (DC.onModelLoaded) DC.onModelLoaded(id);
        res(entry);
      }, undefined, function () { GLB.failed[id] = true; res(null); });
    });
    return GLB.waiting[id];
  };
  /* Espera el modelo como máximo ms milisegundos (si no, se usa el procedural) */
  GLB.ready = function (id, ms) {
    if (!GLB.has(id) || GLB.loaded[id] || GLB.failed[id]) return Promise.resolve();
    return Promise.race([GLB.load(id), new Promise(function (r) { setTimeout(r, ms || 2500); })]);
  };
  GLB.preloadAll = function () {
    var ids = Object.keys(DC.MODEL_FILES || {});
    return ids.reduce(function (pr, id) { return pr.then(function () { return GLB.load(id); }); }, Promise.resolve());
  };

  var CLIP_WORDS = {
    idle: /idle/i, walk: /walk/i, run: /run|gallop/i, attack: /attack|bite|headbutt/i,
    death: /death|die|dead/i, jump: /jump/i, hit: /hit|hurt|damage|recieve|receive/i, roar: /roar|scream|howl/i
  };
  function mapClips(clips, cfg) {
    var out = {}, named = cfg.clips || {};
    Object.keys(CLIP_WORDS).forEach(function (k) {
      var c = named[k] ? clips.find(function (x) { return x.name === named[k]; }) : null;
      if (!c) c = clips.find(function (x) { return CLIP_WORDS[k].test(x.name); });
      if (c) out[k] = c;
    });
    if (!out.idle && clips.length) out.idle = clips[0];
    return out;
  }

  function buildFromGLB(a, entry) {
    var src = entry.gltf.scene;
    var model = T.SkeletonUtils ? T.SkeletonUtils.clone(src) : src.clone(true);
    model.rotation.y = entry.cfg.rotY || 0;
    var wrap = grp(0, 0, 0, a.body);
    wrap.add(model);
    var mats = [];
    var gold = new T.Color('#f2c14e');
    model.traverse(function (o) {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.frustumCulled = false;
      var list = Array.isArray(o.material) ? o.material : [o.material];
      list = list.map(function (m) {
        var c = m.clone();
        if (!c.emissive) c.emissive = new T.Color(0, 0, 0);
        /* El juego trabaja en espacio lineal: se ajustan colores y metal del glTF */
        if (!entry.cfg.keepMaterials) {
          if (c.color) c.color.convertLinearToSRGB();
          if (c.map) { c.map.encoding = T.LinearEncoding; c.map.needsUpdate = true; }
          if (c.metalness !== undefined) c.metalness = 0.05;
          if (c.roughness !== undefined) c.roughness = Math.max(0.65, c.roughness);
          c.needsUpdate = true;
        }
        if (o.isSkinnedMesh) c.skinning = true;
        if (a.look) tint(c, a.look);
        mats.push(c);
        return c;
      });
      o.material = Array.isArray(o.material) ? list : list[0];
    });
    a.isGLB = true;
    a.glbMats = mats;
    a.flashMats = mats;
    a.mats = {};
    a.model = model;
    a.mixer = new T.AnimationMixer(model);
    a.clips = mapClips(entry.gltf.animations || [], entry.cfg);
    a.acts = {};
    a.curClip = null;
    a.setClip('idle');
    a.mixer.update(0);
  }

  Actor.prototype.setClip = function (name, o) {
    o = o || {};
    var clip = this.clips[name] || this.clips.idle;
    if (!clip) return;
    var act = this.acts[clip.name] || (this.acts[clip.name] = this.mixer.clipAction(clip));
    act.timeScale = o.speed || 1;
    if (o.once) { act.setLoop(T.LoopOnce, 1); act.clampWhenFinished = true; }
    else act.setLoop(T.LoopRepeat, Infinity);
    if (this.curAct === act && !o.restart) return;
    var prev = this.curAct;
    act.reset();
    act.paused = false;
    act.setEffectiveWeight(1);
    act.play();
    if (prev && prev !== act) prev.crossFadeTo(act, o.fade === undefined ? 0.18 : o.fade, false);
    this.curAct = act;
    this.curName = name;
  };

  /* Elige la animación del archivo según la acción del juego */
  Actor.prototype.applyGLB = function (P, dt) {
    var A = this.action, want = 'idle', o = {};
    var dur = A ? A.dur : 1;
    var len = function (k, c) { c = c || this.clips[k] || this.clips.idle; return c ? c.duration : 1; }.bind(this);
    if (A) {
      var n = A.name;
      if (n === 'roar') { want = this.clips.roar ? 'roar' : 'attack'; o = { once: true, speed: len(want) / dur * 0.9 }; }
      else if (n === 'attack' || n === 'strike' || n === 'special') { want = 'attack'; o = { once: true, speed: Math.max(0.6, len('attack') / dur) }; }
      else if (n === 'windup') { want = 'idle'; o = { speed: 0.35 }; }
      else if (n === 'hit') { want = this.clips.hit ? 'hit' : 'idle'; o = { speed: 1.6 }; }
      else if (n === 'dodge') { want = this.clips.run ? 'run' : 'walk'; o = { speed: 1.4 }; }
      else if (n === 'faint' || n === 'kneel') { want = 'death'; o = { once: true, speed: len('death') / dur }; }
      else if (n === 'flee') { want = this.clips.run ? 'run' : 'walk'; }
      else if (n === 'celebrate') { want = this.clips.jump ? 'jump' : 'attack'; o = { speed: 1.1 }; }
      else want = 'idle';
      if (A.glbStarted !== true) { A.glbStarted = true; o.restart = true; }
    } else if (this.hold === 'faint' || this.hold === 'kneel') {
      want = 'death'; o = { once: true };
    } else if (this.walk > 0) {
      want = 'walk';
    }
    if (want !== this.curName || o.restart) this.setClip(want, o);
    else if (o.speed && this.curAct) this.curAct.timeScale = o.speed;
    /* Agotado: el cuerpo queda a medio caer (no muerto) */
    if (this.curName === 'death' && (this.hold === 'kneel' || (A && A.name === 'kneel')) && this.curAct) {
      var stop = len('death') * 0.97;
      if (this.curAct.time >= stop) { this.curAct.time = stop; this.curAct.paused = true; }
    }
    /* Los desplazamientos (embestida, retroceso, esquiva, escala) se suman al clip */
    var shake = P.shake ? (Math.random() - 0.5) * P.shake : 0;
    var flyFaint = 0;
    this.inner.position.set(P.x + shake, Math.max(-0.3, P.y), P.z);
    this.inner.rotation.set(P.rotX, P.rotY, this.hold || (A && (A.name === 'faint' || A.name === 'kneel')) ? 0 : P.rotZ * 0.5 + flyFaint);
    this.inner.scale.setScalar(P.scale);
    this.mixer.update(dt);
  };

  DC.GLB = GLB;

  /* =============================================================
     Dinoesfera de ámbar
     ============================================================= */
  function makeSphere(type) {
    var B = (DC.BALLS && DC.BALLS[type]) || DC.BALLS.dino;
    var r = 0.11;
    var g = new T.Group();
    var shell = new (T.MeshPhysicalMaterial || T.MeshStandardMaterial)({
      color: B.mid, roughness: 0.12, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.06,
      emissive: B.top, emissiveIntensity: 0.22, transparent: true, opacity: 0.96
    });
    var metal = new T.MeshStandardMaterial({ color: B.bottom, roughness: 0.28, metalness: 0.85 });
    var bandM = new T.MeshStandardMaterial({ color: B.band, roughness: 0.3, metalness: 0.9 });
    var btnMat = new T.MeshStandardMaterial({ color: '#fff7e2', emissive: B.glow, emissiveIntensity: 1.2, roughness: 0.2 });
    /* parte baja fija */
    var bot = new T.Mesh(new T.SphereGeometry(r, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), metal);
    var band = new T.Mesh(new T.TorusGeometry(r * 1.01, r * 0.1, 10, 48), bandM);
    band.rotation.x = Math.PI / 2;
    g.add(bot, band);
    for (var i = 0; i < 12; i++) {
      var rv = new T.Mesh(new T.SphereGeometry(r * 0.04, 6, 4), bandM);
      var a = i / 12 * Math.PI * 2;
      rv.position.set(Math.cos(a) * r * 1.1, 0, Math.sin(a) * r * 1.1);
      g.add(rv);
    }
    /* tapa con bisagra atrás: se abre para atrapar al dinosaurio */
    var lid = new T.Group(); lid.position.set(0, 0, -r); g.add(lid);
    var top = new T.Mesh(new T.SphereGeometry(r, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), shell);
    top.position.z = r; lid.add(top);
    var core = new T.Mesh(new T.SphereGeometry(r * 0.55, 16, 10), new T.MeshBasicMaterial({ color: B.glow, transparent: true, opacity: 0.55, blending: T.AdditiveBlending, depthWrite: false }));
    core.position.set(0, r * 0.35, r); lid.add(core);
    if (type === 'dino' || !type) {
      /* mosquito atrapado en el ámbar */
      var bugM = new T.MeshBasicMaterial({ color: '#3a1f08' });
      var bug = new T.Mesh(new T.SphereGeometry(r * 0.12, 8, 6), bugM); bug.scale.set(1, 0.6, 2);
      bug.position.set(r * 0.15, r * 0.45, r * 1.05); lid.add(bug);
      [-1, 1].forEach(function (s) {
        var w = new T.Mesh(new T.CircleGeometry(r * 0.16, 8), new T.MeshBasicMaterial({ color: '#f6e0b0', transparent: true, opacity: 0.6, side: T.DoubleSide }));
        w.scale.set(1, 0.4, 1); w.rotation.set(-1.2, s * 0.6, 0); w.position.set(r * 0.15 + s * r * 0.12, r * 0.5, r * 1.02); lid.add(w);
      });
    } else {
      /* franjas decorativas */
      var stripeM = new T.MeshStandardMaterial({ color: type === 'ultra' ? '#1a1a1f' : '#e9f2ff', roughness: 0.3, metalness: 0.6 });
      [-0.35, 0.35].forEach(function (k) {
        var st = new T.Mesh(new T.TorusGeometry(r * 1.004, r * 0.05, 6, 40, Math.PI), stripeM);
        st.rotation.set(0, Math.PI / 2 + k, 0); st.position.z = r; lid.add(st);
      });
    }
    /* botón frontal con anillo luminoso */
    var plate = new T.Mesh(new T.CylinderGeometry(r * 0.36, r * 0.36, r * 0.16, 24), bandM);
    plate.rotation.x = Math.PI / 2; plate.position.z = r * 1.06; g.add(plate);
    var btn = new T.Mesh(new T.CylinderGeometry(r * 0.24, r * 0.24, r * 0.1, 24), btnMat);
    btn.rotation.x = Math.PI / 2; btn.position.z = r * 1.16; g.add(btn);
    g.traverse(function (x) { if (x.isMesh) x.castShadow = true; });
    var glow = DC.FX && DC.FX.sprite ? DC.FX.sprite('soft', B.glow, 0.34, true) : null;
    if (glow) { glow.material.opacity = 0.45; g.add(glow); }
    g.userData = { lid: lid, btn: btn, btnMat: btnMat, glow: glow, core: core, type: type || 'dino', ball: B };
    return g;
  }

  DC.Models = {
    Actor: Actor,
    makeSphere: makeSphere,
    setLite: function (v) { lite = !!v; },
    skinnedBox: skinnedBox,
    tint: tint,
    segGeom: segGeom
  };
})();
