/* =====================================================================
   DinoCaza AR · vision.js
   Reconocimiento de las réplicas reales del parque con la cámara.
   Usa MobileNet (TensorFlow.js) para sacar una "huella" de cada imagen
   y la compara con fotos de referencia de cada réplica (k vecinos con
   similitud coseno). Las referencias se entrenan desde Ajustes tomando
   o subiendo fotos de las estatuas reales, y se pueden exportar/importar.
   ===================================================================== */
(function () {
  var V = {};
  var KEY = 'dinocaza_replica_refs_v1';
  var TF = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/dist/tf.min.js';
  var MN = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.1/dist/mobilenet.min.js';
  var THRESH = 0.8, NEED = 3;
  var model = null, loading = null, refs = {}, bundled = false;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var U = function () { return DC.UI; };

  try { refs = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { refs = {}; }
  function saveRefs() { try { localStorage.setItem(KEY, JSON.stringify(refs)); } catch (e) { U().toast('No hay espacio para guardar más fotos de referencia', 'photo'); } }
  function count(id) { return (refs[id] || []).length; }
  V.count = count;

  /* Referencias que vienen con la app (replicas/referencias.json), si existen */
  function loadBundled() {
    if (bundled) return Promise.resolve();
    bundled = true;
    return fetch('replicas/referencias.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j) return;
      Object.keys(j).forEach(function (k) { if (!count(k)) refs[k] = j[k]; });
    }).catch(function () {});
  }

  function script(src) {
    return new Promise(function (ok, bad) {
      var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { bad(new Error('No se pudo cargar ' + src)); };
      document.head.appendChild(s);
    });
  }
  V.load = function () {
    if (model) return Promise.resolve(model);
    if (loading) return loading;
    loading = (window.tf ? Promise.resolve() : script(TF))
      .then(function () { return window.mobilenet ? null : script(MN); })
      .then(function () { return window.mobilenet.load({ version: 2, alpha: 1.0 }); })
      .then(function (m) { model = m; return loadBundled().then(function () { return m; }); })
      .catch(function (e) { loading = null; throw e; });
    return loading;
  };

  function embed(src) {
    return tf.tidy(function () {
      var v = model.infer(src, true);
      var n = tf.div(v, tf.norm(v));
      return Array.prototype.slice.call(n.dataSync());
    });
  }
  function dot(a, b) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
  /* devuelve {id, sim} del mejor parecido entre todas las réplicas, y la similitud con la réplica pedida */
  function match(vec, wantId) {
    var best = { id: null, sim: 0 }, want = 0;
    Object.keys(refs).forEach(function (id) {
      var top = (refs[id] || []).map(function (r) { return dot(vec, r); }).sort(function (a, b) { return b - a; });
      var sim = top.length ? (top[0] + (top[1] || top[0])) / 2 : 0; /* promedio de los 2 vecinos más cercanos */
      if (sim > best.sim) best = { id: id, sim: sim };
      if (id === wantId) want = sim;
    });
    return { best: best, want: want };
  }
  function addRef(id, vec) {
    refs[id] = refs[id] || [];
    refs[id].push(vec.map(function (x) { return Math.round(x * 1e4) / 1e4; }));
    if (refs[id].length > 12) refs[id].shift();
    saveRefs();
  }

  /* ---------------- Cámara ---------------- */
  var stream = null;
  function openCam(video) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return Promise.resolve(false);
    return navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 960 } }, audio: false })
      .then(function (s) { stream = s; video.srcObject = s; return video.play().then(function () { return true; }, function () { return true; }); })
      .catch(function () { return false; });
  }
  function closeCam() { if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
  function fileToImg(file) {
    return new Promise(function (ok, bad) {
      var img = new Image(); img.onload = function () { ok(img); }; img.onerror = bad;
      img.src = URL.createObjectURL(file);
    });
  }

  function overlay(html) {
    var el = document.createElement('div'); el.className = 'vscan'; el.innerHTML = html;
    document.getElementById('app').appendChild(el);
    return el;
  }

  /* ---------------- Escanear una réplica para desafiarla ---------------- */
  V.scanReplica = function (R, done) {
    var trained = count(R.id) > 0;
    var el = overlay(
      '<video playsinline muted autoplay></video><div class="vs-frame"><i></i><i></i><i></i><i></i></div>' +
      '<div class="vs-top"><button class="icon-btn" data-v="cancel" aria-label="Cancelar">' + U().icon('close') + '</button>' +
      '<div class="vs-title"><div class="eyebrow">Réplica real</div><b>' + U().esc(R.name) + '</b></div></div>' +
      '<div class="vs-bottom"><p class="vs-msg" id="vsmsg">Cargando reconocimiento…</p>' +
      '<div class="vs-meter"><i id="vsbar"></i></div>' +
      '<div class="vs-acts"><label class="btn ghost light">' + U().icon('photo') + 'Subir foto<input type="file" accept="image/*" capture="environment" hidden id="vsfile"></label>' +
      '<button class="btn sun" data-v="skip">' + U().icon('bolt') + 'Desafiar (demo)</button></div></div>');
    var video = $('video', el), msg = $('#vsmsg', el), bar = $('#vsbar', el), ok = 0, alive = true, timer = null;
    function end(res) {
      if (!alive) return; alive = false; clearTimeout(timer); closeCam(); el.remove(); done(res);
    }
    function success() {
      if (!alive) return;
      el.classList.add('hit'); msg.textContent = '¡Réplica reconocida! Prepárate…';
      DC.Audio.play('levelup'); DC.Audio.vibe([40, 60, 120]);
      setTimeout(function () { end(true); }, 900);
    }
    function judge(vec) {
      var m = match(vec, R.id);
      var pct = Math.round(Math.max(0, (m.want - 0.5) / (THRESH - 0.5)) * 100);
      bar.style.width = Math.min(100, pct) + '%';
      if (m.best.id === R.id && m.want >= THRESH) { ok++; msg.textContent = 'Reconociendo… ' + ok + '/' + NEED; if (ok >= NEED) success(); }
      else { ok = 0; msg.textContent = m.best.id && m.best.id !== R.id && m.best.sim >= THRESH ? 'Esa parece otra réplica: ' + (DC.REPLICAS.find(function (x) { return x.id === m.best.id; }) || {}).name : 'Apunta a la réplica completa · parecido ' + Math.min(100, pct) + '%'; }
      return m;
    }
    function triceraFallback(src) {
      /* sin fotos de entrenamiento: ImageNet sí conoce la clase "triceratops" */
      return model.classify(src, 5).then(function (c) {
        var hit = c.find(function (x) { return /triceratops/i.test(x.className); });
        var p = hit ? hit.probability : 0;
        bar.style.width = Math.round(Math.min(1, p / 0.3) * 100) + '%';
        if (p > 0.3) { ok++; if (ok >= 2) success(); } else ok = 0;
        msg.textContent = 'Buscando un triceratops… ' + Math.round(p * 100) + '%';
      });
    }
    function tick() {
      if (!alive) return;
      if (video.readyState >= 2) {
        if (trained) judge(embed(video));
        else if (R.sp === 'triceratops') { triceraFallback(video).then(function () { timer = setTimeout(tick, 350); }); return; }
      }
      timer = setTimeout(tick, 300);
    }
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-v]'); if (!b) return;
      if (b.dataset.v === 'cancel') end(false);
      if (b.dataset.v === 'skip') success();
    });
    $('#vsfile', el).addEventListener('change', function (e) {
      var f = e.target.files[0]; if (!f || !model) return;
      fileToImg(f).then(function (img) {
        if (trained) { var m = judge(embed(img)); if (m.best.id === R.id && m.want >= THRESH) success(); else msg.textContent = 'No coincide lo suficiente (' + Math.round(m.want * 100) + '%). Intenta otra foto.'; }
        else if (R.sp === 'triceratops') { ok = 1; triceraFallback(img); }
      });
    });
    openCam(video).then(function (camOk) {
      if (!camOk) msg.textContent = 'No se pudo abrir la cámara. Sube una foto de la réplica.';
      return V.load();
    }).then(function () {
      if (!alive) return;
      trained = count(R.id) > 0;
      if (!trained && R.sp !== 'triceratops') { msg.textContent = 'Esta réplica aún no fue entrenada. Entrénala en Ajustes → Réplicas del parque, o usa "Desafiar (demo)".'; return; }
      msg.textContent = 'Apunta la cámara a la réplica';
      tick();
    }).catch(function () {
      if (alive) msg.textContent = 'El reconocimiento necesita internet la primera vez. Usa "Desafiar (demo)".';
    });
  };

  /* ---------------- Entrenamiento (Ajustes) ---------------- */
  V.trainer = function () {
    function rows() {
      return DC.REPLICAS.map(function (r) {
        var n = count(r.id);
        return '<li class="vt-row"><div class="vt-img">' + U().img(r.sp, '', r.name) + '</div><div class="vt-txt"><b>' + U().esc(r.name) + '</b><small>' + (n ? n + ' foto' + (n > 1 ? 's' : '') + ' de referencia' : 'Sin entrenar') + '</small></div>' +
          '<button class="btn small" data-t="cam" data-id="' + r.id + '">' + U().icon('camera') + '</button>' +
          '<label class="btn ghost small">' + U().icon('photo') + '<input type="file" accept="image/*" multiple hidden data-id="' + r.id + '"></label>' +
          (n ? '<button class="btn ghost small" data-t="clear" data-id="' + r.id + '" aria-label="Borrar">' + U().icon('close') + '</button>' : '') + '</li>';
      }).join('');
    }
    var m = U().modal('<div class="stack"><div class="eyebrow">Réplicas del parque</div><h2>Entrenar reconocimiento</h2>' +
      '<p class="muted small">Toma 4–8 fotos de cada estatua real desde distintos ángulos y distancias. Las fotos no se guardan: solo una huella numérica en este dispositivo.</p>' +
      '<ul class="vt-list" id="vtlist">' + rows() + '</ul>' +
      '<p class="small muted" id="vtmsg"></p>' +
      '<div class="row gap"><button class="btn ghost small" data-t="export">Exportar</button><label class="btn ghost small">Importar<input type="file" accept="application/json" hidden id="vtimp"></label></div>' +
      '<button class="btn block" data-act="close">Listo</button></div>');
    var box = m;
    function refresh() { var l = $('#vtlist', box); if (l) { l.innerHTML = rows(); U().fillPortraits(l); } }
    function say(t) { var x = $('#vtmsg', box); if (x) x.textContent = t; }
    U().fillPortraits(box);
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-t]'); if (!b) return;
      var id = b.dataset.id;
      if (b.dataset.t === 'clear') { delete refs[id]; saveRefs(); refresh(); }
      if (b.dataset.t === 'cam') capture(id, refresh);
      if (b.dataset.t === 'export') {
        var blob = new Blob([JSON.stringify(refs)], { type: 'application/json' });
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'referencias.json'; a.click();
        say('Guarda el archivo como replicas/referencias.json en la app para que todos los celulares reconozcan las réplicas.');
      }
    });
    box.addEventListener('change', function (e) {
      var inp = e.target;
      if (inp.id === 'vtimp') {
        inp.files[0].text().then(function (t) { var j = JSON.parse(t); Object.keys(j).forEach(function (k) { refs[k] = j[k]; }); saveRefs(); refresh(); say('Referencias importadas.'); }).catch(function () { say('Archivo no válido.'); });
        return;
      }
      var id = inp.dataset.id; if (!id) return;
      var files = Array.prototype.slice.call(inp.files);
      say('Cargando el modelo…');
      V.load().then(function () {
        return files.reduce(function (p, f) { return p.then(function () { return fileToImg(f).then(function (img) { addRef(id, embed(img)); }); }); }, Promise.resolve());
      }).then(function () { refresh(); say(files.length + ' foto(s) agregadas.'); }).catch(function () { say('Se necesita internet para cargar el modelo de reconocimiento.'); });
    });
    return m;
  };

  function capture(id, after) {
    var R = DC.REPLICAS.find(function (r) { return r.id === id; });
    var el = overlay('<video playsinline muted autoplay></video><div class="vs-frame"><i></i><i></i><i></i><i></i></div>' +
      '<div class="vs-top"><button class="icon-btn" data-v="cancel" aria-label="Cerrar">' + U().icon('close') + '</button><div class="vs-title"><div class="eyebrow">Entrenando</div><b>' + U().esc(R.name) + '</b></div></div>' +
      '<div class="vs-bottom"><p class="vs-msg" id="vsmsg">Cargando…</p><div class="vs-acts"><button class="shutter" data-v="snap" aria-label="Tomar foto"></button></div></div>');
    var video = $('video', el), msg = $('#vsmsg', el), n = 0;
    Promise.all([openCam(video), V.load()]).then(function (r) { msg.textContent = r[0] ? 'Rodea la estatua y toma varias fotos' : 'No se pudo abrir la cámara'; }).catch(function () { msg.textContent = 'Se necesita internet para cargar el modelo.'; });
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-v]'); if (!b) return;
      if (b.dataset.v === 'cancel') { closeCam(); el.remove(); after(); }
      if (b.dataset.v === 'snap' && model && video.readyState >= 2) {
        addRef(id, embed(video)); n++; DC.Audio.play('pop');
        el.classList.add('flash'); setTimeout(function () { el.classList.remove('flash'); }, 150);
        msg.textContent = n + ' foto(s) nuevas · total ' + count(id);
      }
    });
  }

  DC.Vision = V;
})();
