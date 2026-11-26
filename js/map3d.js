/* =====================================================================
   DinoCaza AR · map3d.js
   El mapa del menú muestra el mismo parque del paseo visto desde arriba
   (ver walk.js → mapMount). Es solo para mirar: tocar un hábitat abre su
   ficha y "Ir caminando" lleva al avatar hasta ahí.
   ===================================================================== */
(function () {
  DC.Map3D = {
    mount: function (el) { if (DC.Walk && DC.Walk.mapMount) DC.Walk.mapMount(el); },
    unmount: function () { if (DC.Walk && DC.Walk.mapUnmount) DC.Walk.mapUnmount(); },
    focus: function (z) { if (DC.Walk && DC.Walk.mapFocus) DC.Walk.mapFocus(z); },
    refresh: function () {},
    modelsChanged: function () { if (DC.Walk && DC.Walk.modelsChanged) DC.Walk.modelsChanged(); }
  };
})();
