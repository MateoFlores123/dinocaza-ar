/* =====================================================================
   DinoCaza AR · audio.js
   Efectos de sonido sintetizados con Web Audio (sin archivos externos)
   y vibración háptica.
   ===================================================================== */
(function () {
  var ctx = null, master = null, noiseBuf = null, ambient = null;

  function on() { return DC.Store.get().settings.sound; }
  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    var comp = ctx.createDynamicsCompressor();
    master.connect(comp); comp.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }
  function noise(dur) {
    var s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    s.start(); s.stop(ctx.currentTime + dur + 0.05);
    return s;
  }
  function env(g, t0, a, peak, d, end) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(end || 0.0001, t0 + a + d);
  }
  function tone(type, f0, f1, dur, vol, when) {
    var t = ctx.currentTime + (when || 0);
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, 0.01, vol || 0.3, dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }

  var FX = {
    tap: function () { tone('triangle', 660, 880, 0.08, 0.12); },
    back: function () { tone('triangle', 520, 380, 0.09, 0.1); },
    /* Rugido: ruido filtrado + diente de sierra grave con vibrato */
    roar: function (size) {
      size = size || 1;
      var t = ctx.currentTime, dur = 1.1 + 0.5 * size;
      var n = noise(dur), bp = ctx.createBiquadFilter(), g = ctx.createGain();
      bp.type = 'bandpass'; bp.Q.value = 1.4;
      bp.frequency.setValueAtTime(260 / size, t);
      bp.frequency.linearRampToValueAtTime(900 / size, t + 0.35);
      bp.frequency.linearRampToValueAtTime(180 / size, t + dur);
      env(g, t, 0.12, 0.9, dur - 0.12);
      n.connect(bp); bp.connect(g); g.connect(master);
      var o = ctx.createOscillator(), og = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(70 / size + 30, t);
      o.frequency.linearRampToValueAtTime(110 / size + 30, t + 0.3);
      o.frequency.linearRampToValueAtTime(55 / size + 20, t + dur);
      lfo.frequency.value = 23; lg.gain.value = 14;
      lfo.connect(lg); lg.connect(o.frequency);
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
      env(og, t, 0.1, 0.5, dur - 0.1);
      o.connect(lp); lp.connect(og); og.connect(master);
      o.start(t); lfo.start(t); o.stop(t + dur); lfo.stop(t + dur);
    },
    screech: function () {
      var t = ctx.currentTime;
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'square'; o.frequency.setValueAtTime(1400, t);
      o.frequency.exponentialRampToValueAtTime(700, t + 0.5);
      var lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = 40; lg.gain.value = 120; lfo.connect(lg); lg.connect(o.frequency);
      env(g, t, 0.02, 0.12, 0.55);
      o.connect(g); g.connect(master); o.start(t); lfo.start(t); o.stop(t + 0.6); lfo.stop(t + 0.6);
    },
    hit: function (strong) {
      var t = ctx.currentTime;
      tone('sine', strong ? 160 : 200, 45, 0.25, strong ? 0.9 : 0.6);
      var n = noise(0.15), g = ctx.createGain(), lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = strong ? 2600 : 1500;
      env(g, t, 0.003, strong ? 0.6 : 0.35, 0.14);
      n.connect(lp); lp.connect(g); g.connect(master);
    },
    whoosh: function () {
      var t = ctx.currentTime, n = noise(0.45), bp = ctx.createBiquadFilter(), g = ctx.createGain();
      bp.type = 'bandpass'; bp.Q.value = 2;
      bp.frequency.setValueAtTime(400, t); bp.frequency.exponentialRampToValueAtTime(2400, t + 0.35);
      env(g, t, 0.05, 0.4, 0.38);
      n.connect(bp); bp.connect(g); g.connect(master);
    },
    dodge: function () { FX.whoosh(); tone('triangle', 500, 1200, 0.18, 0.12, 0.05); },
    warn: function () { tone('square', 880, 880, 0.07, 0.08); tone('square', 880, 880, 0.07, 0.08, 0.12); },
    click: function () { tone('square', 2200, 1800, 0.03, 0.08); tone('sine', 120, 80, 0.08, 0.25); },
    capture: function () {
      [523, 659, 784, 1046, 1318].forEach(function (f, i) { tone('triangle', f, f, 0.22, 0.2, i * 0.08); });
      tone('sine', 1568, 1568, 0.5, 0.12, 0.42);
    },
    fail: function () { tone('sawtooth', 300, 120, 0.35, 0.2); },
    pop: function () { tone('sine', 300, 900, 0.12, 0.3); },
    beam: function () {
      var t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(1600, t + 0.5);
      env(g, t, 0.05, 0.25, 0.5); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.6);
    },
    levelup: function () {
      [392, 523, 659, 784, 1046].forEach(function (f, i) { tone('square', f, f, 0.16, 0.08, i * 0.09); });
      [784, 1046].forEach(function (f) { tone('triangle', f, f, 0.6, 0.12, 0.5); });
    },
    coin: function () { tone('square', 988, 988, 0.06, 0.08); tone('square', 1319, 1319, 0.2, 0.08, 0.06); },
    special: function () {
      FX.whoosh();
      var t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(80, t); o.frequency.exponentialRampToValueAtTime(600, t + 0.6);
      env(g, t, 0.05, 0.25, 0.7); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.8);
    },
    quake: function () {
      var t = ctx.currentTime, n = noise(1.2), lp = ctx.createBiquadFilter(), g = ctx.createGain();
      lp.type = 'lowpass'; lp.frequency.value = 160;
      env(g, t, 0.02, 1.0, 1.1);
      n.connect(lp); lp.connect(g); g.connect(master);
      tone('sine', 60, 30, 1.0, 0.7);
    },
    splash: function () {
      var t = ctx.currentTime, n = noise(0.8), hp = ctx.createBiquadFilter(), g = ctx.createGain();
      hp.type = 'highpass'; hp.frequency.setValueAtTime(400, t); hp.frequency.linearRampToValueAtTime(1800, t + 0.6);
      env(g, t, 0.02, 0.5, 0.75); n.connect(hp); hp.connect(g); g.connect(master);
    },
    step: function () { tone('sine', 90, 40, 0.12, 0.25); },
    win: function () {
      [523, 659, 784].forEach(function (f, i) { tone('triangle', f, f, 0.25, 0.16, i * 0.12); });
      tone('triangle', 1046, 1046, 0.7, 0.18, 0.36);
    },
    lose: function () { [392, 330, 262].forEach(function (f, i) { tone('triangle', f, f * 0.98, 0.3, 0.16, i * 0.2); }); },
    egg: function () { [880, 660, 990, 1320].forEach(function (f, i) { tone('sine', f, f, 0.18, 0.15, i * 0.1); }); }
  };

  function play(name, arg) {
    if (!on()) return;
    try { if (!ensure()) return; FX[name] && FX[name](arg); } catch (e) { /* audio no disponible */ }
  }
  function vibe(p) { try { if (on() && navigator.vibrate) navigator.vibrate(p); } catch (e) {} }

  /* Ambiente de selva: pájaros y viento muy suaves */
  function startAmbient() {
    if (!on() || ambient) return;
    if (!ensure()) return;
    ambient = setInterval(function () {
      if (!on() || document.hidden) return;
      var f = 1800 + Math.random() * 1600;
      tone('sine', f, f * (Math.random() < 0.5 ? 1.3 : 0.75), 0.09, 0.025);
      if (Math.random() < 0.5) tone('sine', f * 1.1, f * 1.4, 0.07, 0.02, 0.12);
    }, 2600);
  }
  function stopAmbient() { clearInterval(ambient); ambient = null; }

  DC.Audio = { play: play, vibe: vibe, unlock: function () { if (on()) ensure(); }, startAmbient: startAmbient, stopAmbient: stopAmbient };
})();
