/* =====================================================================
   DinoCaza AR · avatar.js
   Explorador estilo "chibi": cabeza grande, cara expresiva, chaleco de
   explorador, mochila con saco de dormir, contorno tipo dibujo animado y
   animaciones de respirar, parpadear, mirar alrededor, caminar y correr.
   ===================================================================== */
(function () {
  var T = THREE;

  /* Contorno: se infla el modelo a lo largo de sus normales y se dibuja por detrás */
  var outlineMat = null;
  function outlineMaterial() {
    if (outlineMat) return outlineMat;
    outlineMat = new T.ShaderMaterial({
      uniforms: { w: { value: 0.028 }, c: { value: new T.Color('#1d2b28') } },
      vertexShader: 'uniform float w; void main(){ vec3 p = position + normal * w; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
      fragmentShader: 'uniform vec3 c; void main(){ gl_FragColor = vec4(c, 1.0); }',
      side: T.BackSide
    });
    return outlineMat;
  }
  function mat(c, o) { o = o || {}; return new T.MeshStandardMaterial({ color: c, roughness: o.r === undefined ? 0.75 : o.r, metalness: o.m || 0, emissive: o.em || '#000000', emissiveIntensity: o.ei || 0 }); }
  function mesh(geo, m, parent, x, y, z, opt) {
    var k = new T.Mesh(geo, m); k.position.set(x || 0, y || 0, z || 0); k.castShadow = true; k.receiveShadow = false;
    if (!(opt && opt.noOutline)) { var o = new T.Mesh(geo, outlineMaterial()); o.userData.outline = true; k.add(o); }
    parent.add(k); return k;
  }
  function grp(parent, x, y, z) { var g = new T.Group(); g.position.set(x || 0, y || 0, z || 0); parent.add(g); return g; }
  /* Torso suave (perfil de barril) */
  function lathe(points, seg) { return new T.LatheGeometry(points.map(function (p) { return new T.Vector2(p[0], p[1]); }), seg || 24); }
  function shade(hex, f) { var c = new T.Color(hex); c.multiplyScalar(f); return '#' + c.getHexString(); }

  function build(a, preview) {
    a = a || {};
    var C = DC.AVATAR_COLORS;
    var skin = a.skin || C.skin[0], shirt = a.shirt || C.shirt[0], pants = a.pants || C.pants[0], hair = a.hair || C.hair[0], hat = a.hat || 'navidad';
    var M = {
      skin: mat(skin, { r: 0.6 }), shirt: mat(shirt), pants: mat(pants, { r: 0.85 }), hair: mat(hair, { r: 0.9 }),
      vest: mat('#c9a66b', { r: 0.85 }), vestD: mat('#8f6f3e'), shoe: mat('#6b4426', { r: 0.6 }), sole: mat('#f4efe6'),
      dark: mat('#1b2422', { r: 0.3 }), white: mat('#ffffff', { r: 0.3 }), belt: mat('#4a3220'), gold: mat('#f2c14e', { m: 0.5, r: 0.35 }),
      pack: mat('#e08b2c', { r: 0.7 }), packD: mat('#b56a1a'), roll: mat('#3f7f63'), blush: new T.MeshBasicMaterial({ color: '#ff8a8a', transparent: true, opacity: 0.45, depthWrite: false }),
      red: mat('#d62839'), wool: mat('#3a7bd5', { r: 0.95 }), cream: mat('#fffaf0', { r: 0.95 }), khaki: mat('#d8b66a', { r: 0.85 }), band: mat('#7a4e22')
    };
    var g = new T.Group();
    var root = grp(g, 0, 0, 0);          /* sube y baja al caminar */
    var hips = grp(root, 0, 0.92, 0);
    mesh(new T.CylinderGeometry(0.27, 0.25, 0.22, 18), M.pants, hips, 0, 0, 0);
    /* Piernas con rodilla */
    var legs = [];
    [-1, 1].forEach(function (sd) {
      var hip = grp(hips, sd * 0.14, -0.05, 0);
      mesh(new T.CylinderGeometry(0.11, 0.1, 0.42, 12), M.pants, hip, 0, -0.2, 0);
      var knee = grp(hip, 0, -0.42, 0);
      mesh(new T.SphereGeometry(0.1, 12, 8), M.pants, knee, 0, 0, 0, { noOutline: true });
      mesh(new T.CylinderGeometry(0.1, 0.09, 0.36, 12), M.pants, knee, 0, -0.18, 0);
      var foot = grp(knee, 0, -0.38, 0);
      var sh = mesh(new T.SphereGeometry(0.13, 14, 10), M.shoe, foot, 0, -0.02, 0.06); sh.scale.set(1, 0.62, 1.45);
      var so = mesh(new T.CylinderGeometry(0.13, 0.13, 0.04, 14), M.sole, foot, 0, -0.085, 0.06, { noOutline: true }); so.scale.set(1, 1, 1.45);
      legs.push({ hip: hip, knee: knee, foot: foot });
    });
    /* Torso, chaleco y cinturón */
    var chest = grp(hips, 0, 0.1, 0);
    mesh(lathe([[0, 0], [0.27, 0.02], [0.31, 0.2], [0.3, 0.42], [0.24, 0.58], [0.1, 0.64], [0, 0.64]]), M.shirt, chest, 0, 0, 0);
    var vest = mesh(lathe([[0.285, 0.04], [0.325, 0.2], [0.315, 0.42], [0.255, 0.56]], 24), M.vest, chest, 0, 0, 0, { noOutline: true });
    vest.geometry = new T.LatheGeometry([[0.285, 0.04], [0.325, 0.2], [0.315, 0.42], [0.255, 0.56]].map(function (p) { return new T.Vector2(p[0], p[1]); }), 24, Math.PI * 0.62, Math.PI * 1.76);
    vest.material.side = T.DoubleSide;
    [-1, 1].forEach(function (sd) { var pk = mesh(new T.BoxGeometry(0.12, 0.1, 0.04), M.vestD, chest, sd * 0.17, 0.24, 0.27, { noOutline: true }); pk.rotation.y = sd * 0.5; });
    var belt = mesh(new T.TorusGeometry(0.28, 0.035, 8, 24), M.belt, chest, 0, 0.04, 0, { noOutline: true }); belt.rotation.x = Math.PI / 2;
    mesh(new T.BoxGeometry(0.09, 0.07, 0.03), M.gold, chest, 0, 0.04, 0.29, { noOutline: true });
    /* Mochila con saco de dormir */
    var pack = grp(chest, 0, 0.32, -0.3);
    var pb = mesh(new T.BoxGeometry(0.44, 0.48, 0.22), M.pack, pack, 0, 0, 0); pb.scale.set(1, 1, 1);
    mesh(new T.BoxGeometry(0.46, 0.16, 0.24), M.packD, pack, 0, 0.18, 0.01, { noOutline: true });
    mesh(new T.BoxGeometry(0.26, 0.14, 0.06), M.packD, pack, 0, -0.1, -0.13, { noOutline: true });
    var roll = mesh(new T.CylinderGeometry(0.1, 0.1, 0.5, 14), M.roll, pack, 0, 0.32, 0); roll.rotation.z = Math.PI / 2;
    [-1, 1].forEach(function (sd) { mesh(new T.BoxGeometry(0.05, 0.5, 0.02), M.packD, chest, sd * 0.15, 0.34, 0.27, { noOutline: true }).rotation.x = -0.15; });
    /* Brazos con codo y mano */
    var arms = [];
    [-1, 1].forEach(function (sd) {
      var sh = grp(chest, sd * 0.33, 0.5, 0);
      mesh(new T.SphereGeometry(0.11, 12, 10), M.shirt, sh, 0, 0, 0, { noOutline: true });
      mesh(new T.CylinderGeometry(0.095, 0.085, 0.3, 12), M.shirt, sh, 0, -0.15, 0);
      var el = grp(sh, 0, -0.3, 0);
      mesh(new T.CylinderGeometry(0.075, 0.07, 0.26, 12), M.skin, el, 0, -0.13, 0);
      mesh(new T.SphereGeometry(0.09, 12, 10), M.skin, el, 0, -0.3, 0.01);
      sh.rotation.z = sd * 0.12;
      arms.push({ sh: sh, el: el, side: sd });
    });
    /* Cuello, bufanda y cabeza */
    var neck = grp(chest, 0, 0.62, 0);
    mesh(new T.CylinderGeometry(0.09, 0.1, 0.1, 12), M.skin, neck, 0, 0.02, 0, { noOutline: true });
    var scarf = null;
    if (hat === 'navidad' || hat === 'lana') {
      var sm = hat === 'navidad' ? M.red : M.wool;
      var sc = mesh(new T.TorusGeometry(0.15, 0.06, 8, 20), sm, neck, 0, 0.02, 0); sc.rotation.x = Math.PI / 2;
      scarf = grp(neck, 0.08, -0.02, 0.1);
      mesh(new T.BoxGeometry(0.1, 0.26, 0.04), sm, scarf, 0, -0.13, 0);
      mesh(new T.BoxGeometry(0.1, 0.03, 0.045), M.cream, scarf, 0, -0.24, 0, { noOutline: true });
    }
    var head = grp(neck, 0, 0.42, 0.02);
    var skull = mesh(new T.SphereGeometry(0.42, 28, 22), M.skin, head, 0, 0, 0); skull.scale.set(1, 0.95, 0.95);
    [-1, 1].forEach(function (sd) { mesh(new T.SphereGeometry(0.08, 10, 8), M.skin, head, sd * 0.41, -0.02, 0, { noOutline: true }).scale.set(0.6, 1, 0.9); });
    /* Cara */
    var eyes = [];
    [-1, 1].forEach(function (sd) {
      var eg = grp(head, sd * 0.15, 0.02, 0.37);
      var e = mesh(new T.SphereGeometry(0.075, 14, 12), M.dark, eg, 0, 0, 0, { noOutline: true }); e.scale.set(0.85, 1.15, 0.5);
      mesh(new T.SphereGeometry(0.024, 8, 6), M.white, eg, sd * -0.02 + 0.015, 0.035, 0.035, { noOutline: true });
      mesh(new T.SphereGeometry(0.012, 6, 5), M.white, eg, -0.02, -0.025, 0.035, { noOutline: true });
      eyes.push(eg);
      var brow = mesh(new T.BoxGeometry(0.11, 0.022, 0.02), M.hair, head, sd * 0.15, 0.14, 0.375, { noOutline: true }); brow.rotation.z = sd * -0.12;
      var bl = new T.Mesh(new T.CircleGeometry(0.06, 16), M.blush); bl.position.set(sd * 0.25, -0.08, 0.34); bl.rotation.y = sd * 0.5; head.add(bl);
    });
    mesh(new T.SphereGeometry(0.03, 8, 6), mat(shade(skin, 0.85)), head, 0, -0.04, 0.4, { noOutline: true });
    var mouth = mesh(new T.TorusGeometry(0.06, 0.016, 6, 14, Math.PI), M.dark, head, 0, -0.13, 0.37, { noOutline: true }); mouth.rotation.z = Math.PI;
    /* Pelo: casquete + mechones */
    var hr = mesh(new T.SphereGeometry(0.445, 26, 18, 0, Math.PI * 2, 0, Math.PI * 0.52), M.hair, head, 0, 0.02, -0.03); hr.rotation.x = -0.28;
    for (var i = 0; i < 5; i++) { var tf = mesh(new T.ConeGeometry(0.08, 0.2, 8), M.hair, head, -0.2 + i * 0.1, 0.26, 0.3, { noOutline: true }); tf.rotation.x = 1.9; tf.rotation.z = (i - 2) * 0.18; }
    /* Gorros */
    if (hat === 'safari') {
      mesh(new T.CylinderGeometry(0.62, 0.62, 0.04, 28), M.khaki, head, 0, 0.3, 0);
      mesh(new T.CylinderGeometry(0.33, 0.4, 0.28, 24), M.khaki, head, 0, 0.44, 0);
      mesh(new T.CylinderGeometry(0.405, 0.405, 0.07, 24), M.band, head, 0, 0.35, 0, { noOutline: true });
    } else if (hat === 'navidad') {
      mesh(new T.TorusGeometry(0.4, 0.08, 10, 26), M.cream, head, 0, 0.3, 0).rotation.x = Math.PI / 2;
      var hg = grp(head, 0, 0.32, -0.02);
      var cn = mesh(new T.ConeGeometry(0.38, 0.75, 22), M.red, hg, 0, 0.33, -0.08); cn.rotation.x = -0.55;
      mesh(new T.SphereGeometry(0.1, 12, 10), M.cream, hg, 0, 0.62, -0.36);
    } else if (hat === 'lana') {
      mesh(new T.SphereGeometry(0.45, 22, 14, 0, Math.PI * 2, 0, Math.PI / 2), M.wool, head, 0, 0.1, 0);
      mesh(new T.CylinderGeometry(0.455, 0.455, 0.12, 24), M.cream, head, 0, 0.14, 0, { noOutline: true });
      mesh(new T.SphereGeometry(0.12, 12, 10), M.cream, head, 0, 0.58, 0);
    } else if (hat === 'gorra') {
      mesh(new T.SphereGeometry(0.44, 22, 14, 0, Math.PI * 2, 0, Math.PI / 2), M.shirt, head, 0, 0.12, 0);
      var vis = mesh(new T.CylinderGeometry(0.26, 0.26, 0.03, 18), M.shirt, head, 0, 0.13, 0.4); vis.scale.z = 1.3;
      mesh(new T.SphereGeometry(0.04, 8, 6), M.white, head, 0, 0.56, 0, { noOutline: true });
    }
    g.userData = { root: root, hips: hips, chest: chest, legs: legs, arms: arms, head: head, eyes: eyes, scarf: scarf, pack: pack };
    g.userData.anim = { phase: 0, blink: 2 + Math.random() * 3, look: 0, lookT: 3, k: 0 };
    g.scale.setScalar(preview ? 1 : 0.95);
    return g;
  }

  /* speed: 0 quieto · 1 caminar · 2 correr */
  function animate(g, speed, dt, t) {
    var u = g.userData, A = u.anim;
    A.k += (Math.min(2, speed) - A.k) * Math.min(1, dt * 8);
    var k = Math.min(1, A.k), run = Math.max(0, A.k - 1);
    A.phase += dt * (7.5 + run * 5) * Math.min(1, A.k * 1.5);
    var p = A.phase, s = Math.sin(p), c = Math.cos(p);
    var amp = (0.55 + run * 0.35) * k;
    u.legs.forEach(function (L, i) {
      var ph = i ? s : -s;
      L.hip.rotation.x = ph * amp;
      L.knee.rotation.x = Math.max(0, (i ? -c : c)) * (0.9 + run * 0.6) * k + 0.04;
      L.foot.rotation.x = -L.hip.rotation.x * 0.4 - L.knee.rotation.x * 0.4;
    });
    u.arms.forEach(function (Ar, i) {
      var ph = i ? -s : s;
      Ar.sh.rotation.x = ph * (0.5 + run * 0.5) * k;
      Ar.sh.rotation.z = Ar.side * (0.12 + 0.05 * (1 - k)) + Ar.side * Math.sin(t * 1.6) * 0.02 * (1 - k);
      Ar.el.rotation.x = -(0.25 + 0.35 * k + run * 0.9);
    });
    var bob = Math.abs(c) * (0.05 + run * 0.05) * k;
    u.root.position.y = bob + (1 - k) * Math.sin(t * 2) * 0.008;
    u.hips.rotation.y = s * 0.12 * k;
    u.chest.rotation.y = -s * 0.18 * k;
    u.chest.rotation.x = 0.06 * k + run * 0.14;
    u.chest.scale.set(1, 1 + Math.sin(t * 2.2) * 0.015 * (1 - k), 1);
    /* Mirar alrededor cuando está quieto */
    A.lookT -= dt;
    if (A.lookT <= 0) { A.lookT = 2 + Math.random() * 4; A.look = (Math.random() - 0.5) * 1.1; }
    var tl = k > 0.3 ? 0 : A.look;
    u.head.rotation.y += (tl - u.head.rotation.y) * Math.min(1, dt * 3);
    u.head.rotation.x = -u.chest.rotation.x * 0.6 + Math.sin(t * 2.2) * 0.02 * (1 - k);
    u.head.rotation.z = Math.sin(p * 0.5) * 0.03 * k;
    /* Parpadeo */
    A.blink -= dt;
    var bs = 1;
    if (A.blink < 0.12) bs = 0.12;
    if (A.blink <= 0) A.blink = 2 + Math.random() * 3.5;
    u.eyes.forEach(function (e) { e.scale.y = bs; });
    if (u.scarf) u.scarf.rotation.x = 0.2 + k * 0.5 + Math.sin(t * 6) * 0.1 * k;
    u.pack.rotation.x = Math.sin(p * 2) * 0.04 * k;
  }

  DC.Avatar = { build: build, animate: animate };
})();
