/* =====================================================================
   DinoCaza AR · fx.js
   Partículas y efectos 3D: chispas, polvo, estrellas, anillos de
   impacto, rayo de captura, ondas de agua y grietas en el suelo.
   ===================================================================== */
(function () {
  var T = THREE;
  var scene = null, items = [], tex = {};

  function canvasTex(draw, size) {
    var c = document.createElement('canvas'); c.width = c.height = size || 64;
    draw(c.getContext('2d'), c.width);
    var t = new T.CanvasTexture(c);
    return t;
  }
  function init(sc) {
    scene = sc;
    tex.soft = canvasTex(function (g, s) {
      var r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,0.6)'); r.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = r; g.fillRect(0, 0, s, s);
    });
    tex.star = canvasTex(function (g, s) {
      g.translate(s / 2, s / 2); g.fillStyle = '#fff';
      g.beginPath();
      for (var i = 0; i < 10; i++) {
        var a = i / 10 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? s * 0.18 : s * 0.48;
        g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      g.closePath(); g.fill();
    });
    tex.ring = canvasTex(function (g, s) {
      g.strokeStyle = '#fff'; g.lineWidth = s * 0.07;
      g.beginPath(); g.arc(s / 2, s / 2, s * 0.42, 0, Math.PI * 2); g.stroke();
    }, 128);
    tex.crack = canvasTex(function (g, s) {
      g.translate(s / 2, s / 2); g.strokeStyle = 'rgba(40,25,12,0.9)'; g.lineCap = 'round';
      for (var i = 0; i < 9; i++) {
        var a = i / 9 * Math.PI * 2 + Math.random() * 0.4, r = 0;
        g.lineWidth = 5; g.beginPath(); g.moveTo(0, 0);
        while (r < s * 0.46) { r += 8 + Math.random() * 10; a += (Math.random() - 0.5) * 0.5; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); g.lineWidth = Math.max(1, g.lineWidth - 0.6); }
        g.stroke();
      }
    }, 256);
    tex.leaf = canvasTex(function (g, s) {
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(s / 2, s / 2, s * 0.18, s * 0.42, 0.6, 0, Math.PI * 2); g.fill();
    });
  }

  function sprite(texName, color, size, additive) {
    var m = new T.SpriteMaterial({ map: tex[texName], color: color, transparent: true, depthWrite: false,
      blending: additive === false ? T.NormalBlending : T.AdditiveBlending });
    var s = new T.Sprite(m); s.scale.setScalar(size);
    return s;
  }

  /* Ráfaga de partículas */
  function burst(pos, o) {
    o = o || {};
    var n = o.count || 24;
    if (DC.Store.get().settings.lite) n = Math.ceil(n / 2);
    for (var i = 0; i < n; i++) {
      var s = sprite(o.tex || 'soft', o.color || '#ffd27a', (o.size || 0.12) * (0.6 + Math.random() * 0.8), o.additive);
      s.position.copy(pos);
      var th = Math.random() * Math.PI * 2, ph = Math.random() * Math.PI - (o.up ? Math.PI / 2 : 0);
      var sp = (o.speed || 2) * (0.4 + Math.random() * 0.8);
      var v = new T.Vector3(Math.cos(th) * Math.cos(ph), Math.abs(Math.sin(ph)) * (o.up ? 1.2 : 1) * (o.flat ? 0.3 : 1), Math.sin(th) * Math.cos(ph)).multiplyScalar(sp);
      scene.add(s);
      items.push({ obj: s, v: v, life: (o.life || 0.8) * (0.6 + Math.random() * 0.6), age: 0, g: o.gravity === undefined ? -4 : o.gravity, spin: (Math.random() - 0.5) * 6, fade: true, grow: o.grow || 0 });
    }
  }
  /* Anillo de onda expansiva en el suelo */
  function ring(pos, o) {
    o = o || {};
    var m = new T.MeshBasicMaterial({ map: tex.ring, color: o.color || '#ffffff', transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide });
    var r = new T.Mesh(new T.PlaneGeometry(1, 1), m);
    r.rotation.x = -Math.PI / 2;
    r.position.set(pos.x, (o.y !== undefined ? o.y : pos.y) + 0.02, pos.z);
    scene.add(r);
    items.push({ obj: r, life: o.life || 0.7, age: 0, ring: true, from: o.from || 0.3, to: o.to || 3, mesh: true });
  }
  /* Grietas en el suelo (aparición, terremoto) */
  function crack(pos, size) {
    var m = new T.MeshBasicMaterial({ map: tex.crack, transparent: true, depthWrite: false, opacity: 0.9 });
    var r = new T.Mesh(new T.PlaneGeometry(size || 2.5, size || 2.5), m);
    r.rotation.x = -Math.PI / 2; r.rotation.z = Math.random() * 6;
    r.position.set(pos.x, 0.015, pos.z);
    scene.add(r);
    items.push({ obj: r, life: 2.6, age: 0, mesh: true, hold: 0.6 });
  }
  /* Rayo de luz vertical (captura) */
  function beam(from, to, color) {
    var dir = new T.Vector3().subVectors(to, from);
    var len = dir.length();
    var m = new T.MeshBasicMaterial({ color: color || '#ffcf6a', transparent: true, opacity: 0.8, blending: T.AdditiveBlending, depthWrite: false });
    var c = new T.Mesh(new T.CylinderGeometry(0.03, 0.18, len, 12, 1, true), m);
    c.position.copy(from).add(to).multiplyScalar(0.5);
    c.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.normalize());
    scene.add(c);
    items.push({ obj: c, life: 0.55, age: 0, mesh: true });
  }
  /* Ola (ataque acuático) */
  function wave(from, to) {
    var dir = new T.Vector3().subVectors(to, from); dir.y = 0;
    for (var i = 0; i < 26; i++) {
      var s = sprite('soft', i % 3 ? '#7fe3ff' : '#ffffff', 0.25 + Math.random() * 0.2);
      var t = Math.random();
      s.position.set(from.x + (Math.random() - 0.5) * 0.6, 0.1 + Math.random() * 0.4, from.z + (Math.random() - 0.5) * 0.6);
      scene.add(s);
      items.push({ obj: s, v: dir.clone().multiplyScalar(1.3 + Math.random() * 0.6).add(new T.Vector3(0, 1.6 + Math.random() * 1.5, 0)), life: 0.75, age: -t * 0.15, g: -6, fade: true });
    }
  }
  /* Hojas cayendo (aparición en bosque) */
  function leaves(pos, color) {
    for (var i = 0; i < 14; i++) {
      var s = sprite('leaf', color || '#7cc46a', 0.14, false);
      s.position.set(pos.x + (Math.random() - 0.5) * 2, pos.y + 1.5 + Math.random() * 1.5, pos.z + (Math.random() - 0.5) * 2);
      scene.add(s);
      items.push({ obj: s, v: new T.Vector3((Math.random() - 0.5) * 0.4, -0.7, (Math.random() - 0.5) * 0.4), life: 2.4, age: 0, g: 0, spin: 3, fade: true });
    }
  }

  function update(dt) {
    for (var i = items.length - 1; i >= 0; i--) {
      var it = items[i];
      it.age += dt;
      if (it.age < 0) { it.obj.visible = false; continue; }
      it.obj.visible = true;
      var k = it.age / it.life;
      if (it.v) {
        it.v.y += (it.g || 0) * dt;
        it.obj.position.addScaledVector(it.v, dt);
        if (it.obj.position.y < 0.02 && it.g < 0) { it.obj.position.y = 0.02; it.v.multiplyScalar(0.5); it.v.y = Math.abs(it.v.y) * 0.3; }
      }
      if (it.spin && it.obj.material.rotation !== undefined) it.obj.material.rotation += it.spin * dt;
      if (it.grow) it.obj.scale.multiplyScalar(1 + it.grow * dt);
      if (it.ring) { var sc = it.from + (it.to - it.from) * (1 - Math.pow(1 - k, 2)); it.obj.scale.set(sc, sc, sc); }
      var hold = it.hold || 0;
      var op = k < hold ? 1 : 1 - (k - hold) / (1 - hold);
      it.obj.material.opacity = Math.max(0, op) * (it.mesh && !it.ring && !it.hold ? 0.8 : 1);
      if (k >= 1) {
        scene.remove(it.obj);
        if (it.mesh) { it.obj.geometry.dispose(); }
        it.obj.material.dispose();
        items.splice(i, 1);
      }
    }
  }
  function clear() {
    items.forEach(function (it) { scene.remove(it.obj); if (it.mesh) it.obj.geometry.dispose(); it.obj.material.dispose(); });
    items = [];
  }

  DC.FX = { init: init, burst: burst, ring: ring, crack: crack, beam: beam, wave: wave, leaves: leaves, update: update, clear: clear, sprite: sprite };
})();
