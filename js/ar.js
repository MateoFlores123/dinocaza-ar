/* =====================================================================
   DinoCaza AR · ar.js
   Escena 3D + realidad aumentada:
   - Video de la cámara trasera como fondo (getUserMedia)
   - Orientación del celular (giroscopio) para que el dinosaurio quede
     "anclado" en el mundo real mientras mueves el teléfono
   - Arrastrar para mirar si no hay giroscopio
   - Entorno 3D (Dino Park + volcán Misti) cuando no hay cámara
   - Sombras de contacto sobre el piso real (ShadowMaterial)
   ===================================================================== */
(function () {
  var T = THREE;
  var R = {
    renderer: null, scene: null, camera: null, video: null, stream: null,
    mode: '3d', active: false, actors: [], frameCbs: [],
    gyro: { on: false, has: false, q: new T.Quaternion(), alphaOffset: 0, last: null },
    look: { yaw: 0, pitch: -0.12, ty: null, tp: null }, drag: true
  };
  var clock = new T.Clock(), env = null, shadowPlane = null, sun = null, hemi = null, tweens = [];
  var euler = new T.Euler(), zee = new T.Vector3(0, 0, 1), q0 = new T.Quaternion(), q1 = new T.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
  var shakeAmt = 0;

  /* ---------------- Interpolaciones (tweens) ---------------- */
  DC.tween = function (dur, fn, easeName) {
    return new Promise(function (res) { tweens.push({ t: 0, dur: dur, fn: fn, res: res, ease: easeName || 'inout' }); });
  };
  function easeF(name, u) {
    if (name === 'linear') return u;
    if (name === 'out') return 1 - Math.pow(1 - u, 3);
    if (name === 'in') return u * u * u;
    if (name === 'back') { var c = 1.70158; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); }
    return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
  }
  DC.wait = function (s) { return DC.tween(s, function () {}); };

  /* ---------------- Inicialización ---------------- */
  R.init = function (stage) {
    var lite = DC.Store.get().settings.lite;
    R.stage = stage;
    R.video = stage.querySelector('video');
    var r = new T.WebGLRenderer({ antialias: !lite, alpha: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, lite ? 1 : 2));
    r.setClearColor(0x000000, 0);
    r.shadowMap.enabled = !lite;
    r.shadowMap.type = T.PCFSoftShadowMap;
    stage.insertBefore(r.domElement, stage.querySelector('#hud'));
    r.domElement.className = 'gl';
    R.renderer = r;

    var sc = new T.Scene();
    R.scene = sc;
    var cam = new T.PerspectiveCamera(62, 1, 0.05, 900);
    cam.position.set(0, 1.5, 0);
    cam.rotation.order = 'YXZ';
    R.camera = cam;
    sc.add(cam);

    hemi = new T.HemisphereLight('#fff3dd', '#6b5a3a', 0.85);
    sc.add(hemi);
    sun = new T.DirectionalLight('#fff1d6', 1.35);
    sun.position.set(4, 9, 3);
    sun.target.position.set(0, 0, -4);
    sun.castShadow = true;
    var sz = lite ? 512 : 1024;
    sun.shadow.mapSize.set(sz, sz);
    var sh = sun.shadow.camera;
    sh.left = -9; sh.right = 9; sh.top = 9; sh.bottom = -9; sh.near = 0.5; sh.far = 40;
    sun.shadow.bias = -0.0008;
    sun.shadow.radius = 4;
    sc.add(sun); sc.add(sun.target);

    shadowPlane = new T.Mesh(new T.PlaneGeometry(60, 60), new T.ShadowMaterial({ opacity: 0.38 }));
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.receiveShadow = true;
    sc.add(shadowPlane);

    DC.FX.init(sc);
    buildEnv();
    R.setMode('3d');
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', function () { setTimeout(resize, 300); });
    bindDrag(r.domElement);
    loop();
  };

  function resize() {
    if (!R.renderer) return;
    var w = R.stage.clientWidth || window.innerWidth, h = R.stage.clientHeight || window.innerHeight;
    R.renderer.setSize(w, h, false);
    R.renderer.domElement.style.width = '100%';
    R.renderer.domElement.style.height = '100%';
    R.camera.aspect = w / h;
    R.camera.fov = w > h ? 50 : 68;
    R.camera.updateProjectionMatrix();
  }
  R.resize = resize;

  /* ---------------- Modo AR / 3D ---------------- */
  R.setMode = function (m) {
    R.mode = m;
    var ar = m === 'ar';
    env.visible = !ar;
    shadowPlane.visible = ar;
    R.scene.fog = ar ? null : new T.Fog('#e9cfa4', 40, 330);
    R.video.hidden = !ar;
    R.stage.classList.toggle('is-ar', ar);
    hemi.intensity = ar ? 0.95 : 0.62;
    sun.intensity = ar ? 1.35 : 1.05;
  };

  R.startCamera = function () {
    if (R.stream) { R.setMode('ar'); return Promise.resolve(true); }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return Promise.resolve(false);
    return navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
    }).then(function (stream) {
      R.stream = stream;
      R.video.srcObject = stream;
      R.video.setAttribute('playsinline', '');
      R.video.muted = true;
      return R.video.play().catch(function () {}).then(function () { R.setMode('ar'); return true; });
    }).catch(function (e) {
      R.cameraError = e && e.name;
      return false;
    });
  };
  R.stopCamera = function () {
    if (R.stream) { R.stream.getTracks().forEach(function (t) { t.stop(); }); }
    R.stream = null;
    if (R.video) R.video.srcObject = null;
    R.setMode('3d');
  };

  /* ---------------- Giroscopio ---------------- */
  function onOrient(e) {
    if (e.alpha === null && e.beta === null) return;
    R.gyro.has = true;
    R.gyro.last = e;
  }
  R.enableGyro = function () {
    if (!DC.Store.get().settings.gyro) return Promise.resolve(false);
    var DOE = window.DeviceOrientationEvent;
    if (!DOE) return Promise.resolve(false);
    var go = function () {
      window.addEventListener('deviceorientation', onOrient, true);
      return new Promise(function (res) { setTimeout(function () { R.gyro.on = R.gyro.has; res(R.gyro.has); }, 450); });
    };
    if (typeof DOE.requestPermission === 'function') {
      return DOE.requestPermission().then(function (st) { return st === 'granted' ? go() : false; }).catch(function () { return false; });
    }
    return go();
  };
  R.disableGyro = function () {
    window.removeEventListener('deviceorientation', onOrient, true);
    R.gyro.on = false;
  };
  function gyroQuat(out, e, offset) {
    var d = Math.PI / 180;
    var orient = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
    euler.set((e.beta || 0) * d, (e.alpha || 0) * d + offset, -(e.gamma || 0) * d, 'YXZ');
    out.setFromEuler(euler);
    out.multiply(q1);
    out.multiply(q0.setFromAxisAngle(zee, -orient * d));
    return out;
  }
  /* Recentrar: lo que miras ahora pasa a ser "adelante" (yaw = 0) */
  R.recenter = function () {
    if (R.gyro.on && R.gyro.last) {
      var q = gyroQuat(new T.Quaternion(), R.gyro.last, 0);
      var f = new T.Vector3(0, 0, -1).applyQuaternion(q);
      R.gyro.alphaOffset = -Math.atan2(-f.x, -f.z);
    }
    R.look.yaw = 0;
  };
  R.yaw = function () {
    var f = new T.Vector3(0, 0, -1).applyQuaternion(R.camera.quaternion);
    return Math.atan2(-f.x, -f.z);
  };

  /* ---------------- Arrastrar para mirar ---------------- */
  function bindDrag(el) {
    var down = null;
    el.addEventListener('pointerdown', function (e) { if (!R.drag || R.gyro.on) return; down = { x: e.clientX, y: e.clientY, yaw: R.look.yaw, pitch: R.look.pitch }; R.look.ty = null; });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      R.look.yaw = down.yaw + (e.clientX - down.x) * 0.006;
      R.look.pitch = Math.max(-0.9, Math.min(0.6, down.pitch + (e.clientY - down.y) * 0.004));
    });
    window.addEventListener('pointerup', function () { down = null; });
    window.addEventListener('pointercancel', function () { down = null; });
  }
  /* Girar la cámara suavemente hacia un punto (modo sin giroscopio) */
  R.lookTowards = function (p, pitch) {
    var dx = p.x - R.camera.position.x, dz = p.z - R.camera.position.z;
    R.look.ty = Math.atan2(-dx, -dz);
    R.look.tp = pitch === undefined ? -0.14 : pitch;
  };

  /* ---------------- Proyección e indicadores ---------------- */
  var tmp = new T.Vector3();
  R.project = function (v) {
    tmp.copy(v).applyMatrix4(R.camera.matrixWorldInverse);
    var behind = tmp.z > 0;
    var p = v.clone().project(R.camera);
    var w = R.stage.clientWidth, h = R.stage.clientHeight;
    return { x: (p.x + 1) / 2 * w, y: (1 - p.y) / 2 * h, on: !behind && Math.abs(p.x) < 1 && Math.abs(p.y) < 1, behind: behind, cx: tmp.x, cy: tmp.y };
  };
  /* Ángulo hacia un punto fuera de pantalla (para la flecha guía) */
  R.offscreen = function (v) {
    var pr = R.project(v);
    if (pr.on) return null;
    var x = pr.cx, y = pr.cy;
    if (pr.behind && Math.abs(x) < 0.3) x = x < 0 ? -1 : 1;
    return Math.atan2(-y, x);
  };

  R.shake = function (a) { shakeAmt = Math.max(shakeAmt, a); };
  R.onFrame = function (cb) { R.frameCbs.push(cb); return function () { R.frameCbs = R.frameCbs.filter(function (x) { return x !== cb; }); }; };
  R.add = function (actor) { R.actors.push(actor); R.scene.add(actor.root); };
  R.remove = function (actor) { R.actors = R.actors.filter(function (a) { return a !== actor; }); actor.dispose(); };
  R.clearActors = function () { R.actors.slice().forEach(R.remove); };

  /* ---------------- Bucle principal ---------------- */
  var targetQ = new T.Quaternion();
  function loop() {
    requestAnimationFrame(loop);
    var dt = Math.min(0.1, clock.getDelta());
    if (!R.active) return;
    animateSnowAR(dt);
    var cam = R.camera;
    if (R.gyro.on && R.gyro.last) {
      gyroQuat(targetQ, R.gyro.last, R.gyro.alphaOffset);
      cam.quaternion.slerp(targetQ, 0.35);
    } else {
      if (R.look.ty !== null) {
        var dy = R.look.ty - R.look.yaw;
        while (dy > Math.PI) dy -= Math.PI * 2;
        while (dy < -Math.PI) dy += Math.PI * 2;
        R.look.yaw += dy * Math.min(1, dt * 4);
        R.look.pitch += (R.look.tp - R.look.pitch) * Math.min(1, dt * 4);
        if (Math.abs(dy) < 0.002) R.look.ty = null;
      }
      cam.rotation.set(R.look.pitch, R.look.yaw, 0);
    }
    if (shakeAmt > 0.001) {
      cam.position.set(0 + (Math.random() - 0.5) * shakeAmt, 1.5 + (Math.random() - 0.5) * shakeAmt, (Math.random() - 0.5) * shakeAmt);
      shakeAmt *= Math.pow(0.02, dt);
    } else cam.position.set(0, 1.5, 0);

    for (var i = tweens.length - 1; i >= 0; i--) {
      var tw = tweens[i];
      tw.t += dt;
      var u = Math.min(1, tw.t / tw.dur);
      tw.fn(easeF(tw.ease, u));
      if (u >= 1) { tweens.splice(i, 1); tw.res(); }
    }
    R.actors.forEach(function (a) { a.update(dt); });
    DC.FX.update(dt);
    if (env && env.visible) animateEnv(dt);
    R.frameCbs.forEach(function (cb) { cb(dt); });
    R.renderer.render(R.scene, cam);
  }

  /* =====================================================================
     Entorno 3D: plaza de sillar, selva jurásica y volcanes de Arequipa
     ===================================================================== */
  var clouds = [];
  function grad(stops, w, h) {
    var c = document.createElement('canvas'); c.width = w || 4; c.height = h || 256;
    var g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, c.height);
    stops.forEach(function (s) { gr.addColorStop(s[0], s[1]); });
    g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
    return c;
  }
  function noiseTex(base, var1, size, rep, dots) {
    var c = document.createElement('canvas'); c.width = c.height = size;
    var g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, size, size);
    for (var i = 0; i < dots; i++) {
      g.fillStyle = var1[i % var1.length];
      g.globalAlpha = 0.25 + Math.random() * 0.4;
      g.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 3, 1 + Math.random() * 5);
    }
    var t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep, rep);
    return t;
  }
  function sillarTex() {
    var s = 512, c = document.createElement('canvas'); c.width = c.height = s;
    var g = c.getContext('2d');
    g.fillStyle = '#a89f8c'; g.fillRect(0, 0, s, s);
    var rows = 8;
    for (var r = 0; r < rows; r++) {
      var y = r * s / rows, off = (r % 2) * s / 8;
      for (var x = -s / 8; x < s; x += s / 4) {
        var tone = 178 + Math.random() * 20;
        g.fillStyle = 'rgb(' + tone + ',' + (tone - 8) + ',' + (tone - 26) + ')';
        g.fillRect(x + off + 3, y + 3, s / 4 - 6, s / rows - 6);
      }
    }
    for (var i = 0; i < 3000; i++) { g.fillStyle = 'rgba(120,100,80,' + Math.random() * 0.18 + ')'; g.fillRect(Math.random() * s, Math.random() * s, 2, 2); }
    var t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(3, 3);
    return t;
  }

  function buildEnv() {
    env = new T.Group();
    R.scene.add(env);
    var lite = DC.Store.get().settings.lite;
    /* Cielo */
    var skyC = grad([[0, '#3f78b8'], [0.42, '#8fb9de'], [0.5, '#f3d7a6'], [0.56, '#e8c08a'], [1, '#c7a47a']]);
    var skyT = new T.CanvasTexture(skyC);
    var sky = new T.Mesh(new T.SphereGeometry(600, 32, 16), new T.MeshBasicMaterial({ map: skyT, side: T.BackSide, fog: false, depthWrite: false }));
    sky.rotation.x = 0; env.add(sky);
    var sunGlow = DC.FX.sprite('soft', '#fff2c2', 160, true);
    sunGlow.material.fog = false;
    sunGlow.position.set(240, 160, -380); env.add(sunGlow);
    /* Suelo de pasto */
    var grass = new T.Mesh(new T.CircleGeometry(420, 64), new T.MeshStandardMaterial({
      map: noiseTex('#5d7436', ['#48602a', '#6f8642', '#7f7a45', '#3c5224'], 256, 90, 9000), roughness: 1
    }));
    grass.rotation.x = -Math.PI / 2; grass.receiveShadow = true; env.add(grass);
    /* Plaza circular de sillar (piedra volcánica blanca de Arequipa) */
    var plaza = new T.Mesh(new T.CircleGeometry(8.5, 48), new T.MeshStandardMaterial({ map: sillarTex(), color: '#b9b3a6', roughness: 0.95 }));
    plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.01; plaza.receiveShadow = true; env.add(plaza);
    var curb = new T.Mesh(new T.TorusGeometry(8.5, 0.12, 6, 64), new T.MeshStandardMaterial({ color: '#d8cdb4', roughness: 0.9 }));
    curb.rotation.x = -Math.PI / 2; curb.position.y = 0.04; curb.receiveShadow = true; env.add(curb);

    /* Volcanes: Misti (cono con nieve), Chachani y Pichu Pichu */
    function volcano(x, z, r, h, color, snow, flat) {
      var gV = new T.Group();
      var c = new T.Mesh(new T.ConeGeometry(r, h, 40, 6), new T.MeshStandardMaterial({ color: color, roughness: 1, flatShading: true }));
      c.position.y = h / 2 - 2; gV.add(c);
      if (flat) { c.scale.set(1.6, 1, 1); }
      if (snow) {
        var sH = h * 0.24, sR = r * 0.24;
        var s = new T.Mesh(new T.ConeGeometry(sR * (flat ? 1.6 : 1), sH, 40, 2), new T.MeshStandardMaterial({ color: '#f7f4ee', roughness: 0.8, flatShading: true }));
        s.position.y = h - sH / 2 - 2 + 0.6; gV.add(s);
      }
      gV.position.set(x, 0, z);
      env.add(gV);
    }
    volcano(70, -360, 150, 118, '#8a7663', true, false);      /* Misti */
    volcano(-230, -330, 190, 92, '#7c6d63', true, true);      /* Chachani */
    volcano(290, -300, 150, 70, '#8f7b6a', false, true);      /* Pichu Pichu */

    /* Vegetación jurásica: araucarias, cícadas y helechos */
    var trunk = new T.MeshStandardMaterial({ color: '#5a4030', roughness: 1 });
    var leafD = new T.MeshStandardMaterial({ color: '#2f5a32', roughness: 0.9, flatShading: true });
    var leafL = new T.MeshStandardMaterial({ color: '#5f8f3c', roughness: 0.9, flatShading: true, side: T.DoubleSide });
    var rockM = new T.MeshStandardMaterial({ color: '#9a8c7a', roughness: 1, flatShading: true });
    var seed = 11;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    function araucaria(x, z, s) {
      var g = new T.Group();
      var tr = new T.Mesh(new T.CylinderGeometry(0.12 * s, 0.22 * s, 7 * s, 6), trunk);
      tr.position.y = 3.5 * s; tr.castShadow = true; g.add(tr);
      for (var i = 0; i < 4; i++) {
        var c = new T.Mesh(new T.ConeGeometry((2.2 - i * 0.45) * s, 1.4 * s, 7), leafD);
        c.position.y = (4.4 + i * 1.05) * s; c.castShadow = true; g.add(c);
      }
      g.position.set(x, 0, z); g.rotation.y = rnd() * 6; env.add(g);
    }
    function cycad(x, z, s) {
      var g = new T.Group();
      var tr = new T.Mesh(new T.CylinderGeometry(0.25 * s, 0.32 * s, 1.1 * s, 7), trunk);
      tr.position.y = 0.55 * s; tr.castShadow = true; g.add(tr);
      for (var i = 0; i < 9; i++) {
        var f = new T.Mesh(new T.ConeGeometry(0.22 * s, 1.9 * s, 3), leafL);
        f.scale.z = 0.15;
        var holder = new T.Group(); holder.position.y = 1.1 * s; holder.rotation.y = i / 9 * Math.PI * 2;
        f.position.set(0, 0.7 * s, 0.45 * s); f.rotation.x = 0.9; f.castShadow = true;
        holder.add(f); g.add(holder);
      }
      g.position.set(x, 0, z); env.add(g);
    }
    function fern(x, z, s) {
      var g = new T.Group();
      for (var i = 0; i < 7; i++) {
        var f = new T.Mesh(new T.ConeGeometry(0.16 * s, 1.2 * s, 3), leafL);
        f.scale.z = 0.12;
        var h = new T.Group(); h.rotation.y = i / 7 * Math.PI * 2 + rnd();
        f.position.set(0, 0.45 * s, 0.35 * s); f.rotation.x = 1.0 + rnd() * 0.3;
        h.add(f); g.add(h);
      }
      g.position.set(x, 0, z); env.add(g);
    }
    var nTrees = lite ? 26 : 55;
    for (var i = 0; i < nTrees; i++) {
      var a = rnd() * Math.PI * 2, d = 14 + rnd() * 70;
      araucaria(Math.cos(a) * d, Math.sin(a) * d, 0.8 + rnd() * 0.9);
    }
    for (var j = 0; j < (lite ? 14 : 30); j++) {
      var a2 = rnd() * Math.PI * 2, d2 = 9.5 + rnd() * 20;
      if (rnd() < 0.5) cycad(Math.cos(a2) * d2, Math.sin(a2) * d2, 0.8 + rnd() * 0.7);
      else fern(Math.cos(a2) * d2, Math.sin(a2) * d2, 0.8 + rnd() * 0.8);
    }
    for (var k = 0; k < 18; k++) {
      var a3 = rnd() * Math.PI * 2, d3 = 9 + rnd() * 30;
      var rk = new T.Mesh(new T.DodecahedronGeometry(0.4 + rnd() * 0.9, 0), rockM);
      rk.position.set(Math.cos(a3) * d3, 0.2, Math.sin(a3) * d3); rk.scale.y = 0.6; rk.rotation.set(rnd(), rnd(), rnd());
      rk.castShadow = true; rk.receiveShadow = true; env.add(rk);
    }
    /* Nubes */
    for (var n = 0; n < 9; n++) {
      var cl = DC.FX.sprite('soft', '#ffffff', 60 + rnd() * 50, false);
      cl.material.opacity = 0.55; cl.material.fog = false;
      cl.scale.set(110 + rnd() * 90, 26 + rnd() * 14, 1);
      var ca = rnd() * Math.PI * 2;
      cl.position.set(Math.cos(ca) * 380, 110 + rnd() * 70, Math.sin(ca) * 380);
      env.add(cl); clouds.push({ s: cl, a: ca, sp: 0.004 + rnd() * 0.004 });
    }
  }
  /* Nieve navideña: se ve tanto con la cámara como en el parque 3D */
  var arSnow = null;
  function buildSnowAR() {
    var n = DC.Store.get().settings.lite ? 250 : 600, pos = new Float32Array(n * 3), sp = new Float32Array(n);
    for (var i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 30; pos[i * 3 + 1] = Math.random() * 12; pos[i * 3 + 2] = (Math.random() - 0.5) * 30; sp[i] = 0.6 + Math.random() * 0.9; }
    var geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    var c = document.createElement('canvas'); c.width = c.height = 32; var g = c.getContext('2d');
    var gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
    arSnow = new T.Points(geo, new T.PointsMaterial({ size: 0.09, map: new T.CanvasTexture(c), transparent: true, depthWrite: false }));
    arSnow.userData.sp = sp; arSnow.frustumCulled = false; R.scene.add(arSnow);
  }
  function animateSnowAR(dt) {
    if (!DC.SEASON || !DC.SEASON.xmas) return;
    if (!arSnow) buildSnowAR();
    var p = arSnow.geometry.attributes.position.array, sp = arSnow.userData.sp, t = performance.now() / 1000;
    for (var i = 0; i < sp.length; i++) { p[i * 3 + 1] -= sp[i] * dt; p[i * 3] += Math.sin(t + i) * dt * 0.15; if (p[i * 3 + 1] < 0) p[i * 3 + 1] += 12; }
    arSnow.geometry.attributes.position.needsUpdate = true;
  }
  function animateEnv(dt) {
    clouds.forEach(function (c) {
      c.a += c.sp * dt;
      c.s.position.x = Math.cos(c.a) * 380; c.s.position.z = Math.sin(c.a) * 380;
    });
  }

  /* =====================================================================
     Retratos 3D para el álbum (renderer pequeño aparte)
     ===================================================================== */
  var pr = null, prScene = null, prCam = null, cache = {};
  var PKEY = 'dinocaza_portrait_v7_';
  DC.portrait = function (spId, variant) {
    variant = variant && variant !== 'normal' ? variant : '';
    var key = spId + (DC.GLB.get(spId) ? '_glb' : '') + (variant ? '_' + variant : '');
    if (cache[key]) return cache[key];
    try { var saved = localStorage.getItem(PKEY + key); if (saved) { cache[key] = saved; return saved; } } catch (e) {}
    if (!pr) {
      pr = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      pr.setSize(200, 200); pr.setPixelRatio(1);
      prScene = new T.Scene();
      prScene.add(new T.HemisphereLight('#fff6e6', '#5b4a35', 1.0));
      var dl = new T.DirectionalLight('#ffffff', 1.1); dl.position.set(2, 4, 3); prScene.add(dl);
      prCam = new T.PerspectiveCamera(30, 1, 0.05, 100);
    }
    var a = new DC.Models.Actor(DC.SP[spId], { variant: variant || 'normal' });
    a.root.rotation.y = 0.75;
    prScene.add(a.root);
    for (var i = 0; i < 4; i++) a.update(0.02);
    a.root.updateMatrixWorld(true);
    var box = a.isGLB ? DC.Models.skinnedBox(a.root) : new T.Box3().setFromObject(a.root);
    var c = box.getCenter(new T.Vector3()), sz = box.getSize(new T.Vector3());
    var dist = Math.max(sz.x, sz.y, sz.z) * 1.75;
    prCam.position.set(c.x + dist * 0.15, c.y + dist * 0.18, c.z + dist);
    prCam.lookAt(c);
    pr.render(prScene, prCam);
    var url = pr.domElement.toDataURL('image/webp', 0.85);
    if (url.indexOf('data:image/webp') !== 0) url = pr.domElement.toDataURL('image/png');
    try { localStorage.setItem(PKEY + key, url); } catch (e) {}
    prScene.remove(a.root);
    a.dispose();
    cache[key] = url;
    return url;
  };

  /* Foto: compone la cámara real + la escena 3D */
  R.snapshot = function () {
    var w = R.renderer.domElement.width, h = R.renderer.domElement.height;
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var g = c.getContext('2d');
    if (R.mode === 'ar' && R.video.videoWidth) {
      var vw = R.video.videoWidth, vh = R.video.videoHeight;
      var s = Math.max(w / vw, h / vh);
      g.drawImage(R.video, (w - vw * s) / 2, (h - vh * s) / 2, vw * s, vh * s);
    }
    R.renderer.render(R.scene, R.camera);
    g.drawImage(R.renderer.domElement, 0, 0);
    return c;
  };

  DC.AR = R;
})();
