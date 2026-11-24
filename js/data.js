/* =====================================================================
   DinoCaza AR · data.js
   Datos del juego: tipos, especies, zonas, dificultad, misiones,
   premios y textos educativos (modo niño / adulto).
   ===================================================================== */
window.DC = window.DC || {};

DC.TYPES = {
  herb: { id: 'herb', name: 'Herbívoro', color: '#7cc46a', short: 'HRB' },
  carn: { id: 'carn', name: 'Carnívoro', color: '#e8613c', short: 'CRN' },
  vol:  { id: 'vol',  name: 'Volador',   color: '#7fb6f0', short: 'VOL' },
  agua: { id: 'agua', name: 'Acuático',  color: '#3fc1c9', short: 'ACU' }
};

/* Ciclo de ventajas (x1.5 a favor, x0.67 en contra):
   Herbívoro > Carnívoro > Volador > Acuático > Herbívoro */
DC.TYPE_BEATS = { herb: 'carn', carn: 'vol', vol: 'agua', agua: 'herb' };
DC.TYPE_REASON = {
  herb: 'Cuernos, placas y corazas frenan las mordidas de los carnívoros.',
  carn: 'Los carnívoros saltan y atrapan a los voladores cuando bajan a tierra.',
  vol:  'Los pterosaurios se lanzaban en picada para pescar en el agua.',
  agua: 'Los cazadores del río emboscan a los herbívoros en la orilla.'
};
DC.typeMult = function (atk, def) {
  if (DC.TYPE_BEATS[atk] === def) return 1.5;
  if (DC.TYPE_BEATS[def] === atk) return 0.67;
  return 1;
};

DC.RARITY = {
  comun:      { id: 'comun', name: 'Común', stars: 1, weight: 60, capture: 0.55, flee: 0.10, color: '#cfc6b0', xp: 40, coins: 20 },
  rara:       { id: 'rara', name: 'Rara', stars: 2, weight: 28, capture: 0.36, flee: 0.16, color: '#7fb6f0', xp: 70, coins: 35 },
  epica:      { id: 'epica', name: 'Épica', stars: 3, weight: 11, capture: 0.20, flee: 0.24, color: '#c58cf2', xp: 120, coins: 60 },
  legendaria: { id: 'legendaria', name: 'Legendaria', stars: 4, weight: 6, capture: 0.09, flee: 0.30, color: '#f4b638', xp: 250, coins: 120 }
};

DC.DIFFICULTY = {
  facil: {
    id: 'facil', name: 'Explorador', tag: 'Fácil', desc: 'Para niños. Ataques lentos y mucho tiempo para esquivar.',
    enemyLvl: -1, windup: 1.55, dodgeWin: 0.95, enemyDmg: 0.55, ringSpeed: 0.7,
    capture: 1.3, reward: 1.0, atkEvery: [3.4, 4.6], combo: 0, feint: 0
  },
  normal: {
    id: 'normal', name: 'Rastreador', tag: 'Normal', desc: 'El reto equilibrado. Hay que estar atento al aviso rojo.',
    enemyLvl: 1, windup: 1.05, dodgeWin: 0.55, enemyDmg: 1.0, ringSpeed: 1.0,
    capture: 1.0, reward: 1.25, atkEvery: [2.5, 3.5], combo: 0.12, feint: 0
  },
  dificil: {
    id: 'dificil', name: 'Paleontólogo', tag: 'Difícil', desc: 'Ataques rápidos, combos y amagues. Premios x1.75.',
    enemyLvl: 4, windup: 0.68, dodgeWin: 0.34, enemyDmg: 1.35, ringSpeed: 1.4,
    capture: 0.8, reward: 1.75, atkEvery: [1.8, 2.7], combo: 0.3, feint: 0.18
  }
};

DC.DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/* ---------------------------------------------------------------------
   Especies. Medidas reales aproximadas. "model" define el cuerpo 3D.
   days: días en que aparece (0=dom). minVisits: visitas necesarias.
   afterHour: solo aparece desde esa hora.
   --------------------------------------------------------------------- */
DC.SPECIES = [
  /* ---------------- Zona 1 · Valle de los Cuernos ---------------- */
  {
    id: 'triceratops', name: 'Triceratops', type: 'herb', rarity: 'comun', zone: 1,
    period: 'Cretácico superior', mya: '68–66 millones de años', length: 9, weight: '6–12 t', height: 3,
    diet: 'Helechos, cícadas y palmeras', base: { hp: 120, atk: 22, def: 30, spd: 14 },
    moves: { basic: 'Embestida', special: 'Carga de Cuernos', fx: 'charge' },
    model: { kind: 'quad', len: 1.0, legH: 0.42, bodyR: 0.27, neck: 0.12, head: 0.3, tail: 0.5,
      frill: true, horns: true, beak: true,
      colors: { body: '#7a8a4a', belly: '#d8cf9e', pattern: 'stripes', mark: '#4b5a2c', accent: '#c0532e' } },
    kid: 'Tenía tres cuernos y una gran gola en la cabeza, como un escudo. ¡Su cabeza era una de las más grandes de todos los animales terrestres!',
    adult: 'Ceratópsido de la Formación Hell Creek (Norteamérica). Su cráneo superaba los 2 m. La gola probablemente servía para exhibición y reconocimiento entre individuos; los cuernos supraorbitales, para combate intraespecífico.',
    fact: 'Se han hallado fósiles de Triceratops con marcas de mordidas de T. rex que sanaron: sobrevivió al ataque.',
    quiz: { q: '¿Cuántos cuernos tenía el Triceratops?', options: ['Uno', 'Tres', 'Cinco'], a: 1 }
  },
  {
    id: 'parasaurolophus', name: 'Parasaurolophus', type: 'herb', rarity: 'comun', zone: 1,
    period: 'Cretácico superior', mya: '76–73 millones de años', length: 9.5, weight: '2.5–3 t', height: 3.6,
    diet: 'Hojas y ramas bajas', base: { hp: 105, atk: 20, def: 22, spd: 22 },
    moves: { basic: 'Coletazo', special: 'Bramido Sónico', fx: 'roar' },
    model: { kind: 'quad', len: 1.0, legH: 0.5, bodyR: 0.22, neck: 0.3, head: 0.2, tail: 0.6,
      tubeCrest: true, duckBill: true, frontShort: true,
      colors: { body: '#b0703e', belly: '#ecd7a8', pattern: 'spots', mark: '#6b3d1f', accent: '#e0a43c' } },
    kid: 'Tenía un tubo largo en la cabeza. Soplaba por él para hacer sonidos fuertes, ¡como una trompeta!',
    adult: 'Hadrosáurido lambeosaurino. Su cresta tubular hueca, conectada a las fosas nasales, actuaba como cámara de resonancia para producir sonidos graves de baja frecuencia.',
    fact: 'Con modelos 3D de su cresta, los científicos recrearon el sonido que pudo emitir.',
    quiz: { q: '¿Para qué usaba su cresta en forma de tubo?', options: ['Para hacer sonidos', 'Para cavar', 'Para nadar'], a: 0 }
  },
  {
    id: 'stegosaurus', name: 'Stegosaurus', type: 'herb', rarity: 'rara', zone: 1,
    period: 'Jurásico superior', mya: '155–150 millones de años', length: 9, weight: '5–7 t', height: 4,
    diet: 'Helechos, musgos y cícadas', base: { hp: 115, atk: 25, def: 28, spd: 12 },
    moves: { basic: 'Golpe de Placas', special: 'Coletazo de Púas', fx: 'spikes' },
    model: { kind: 'quad', len: 1.0, legH: 0.4, bodyR: 0.26, neck: 0.18, head: 0.15, tail: 0.6,
      plates: true, thagomizer: true, frontShort: true,
      colors: { body: '#5f7d6a', belly: '#d9d6b5', pattern: 'stripes', mark: '#38503f', accent: '#d2693a' } },
    kid: 'Tenía grandes placas en la espalda y púas en la cola para defenderse. ¡Su cerebro era del tamaño de una nuez!',
    adult: 'Tireóforo del Jurásico de la Formación Morrison. Las placas dérmicas, muy vascularizadas, pudieron servir para exhibición y termorregulación; las cuatro púas caudales (thagomizer) eran defensivas.',
    fact: 'Vivió unos 80 millones de años ANTES que el T. rex: más lejos en el tiempo que nosotros del T. rex.',
    quiz: { q: '¿Cómo se llaman las púas de la cola del Stegosaurus?', options: ['Thagomizer', 'Garras', 'Escamas'], a: 0 }
  },

  /* ---------------- Zona 2 · Bosque de Helechos ---------------- */
  {
    id: 'velociraptor', name: 'Velociraptor', type: 'carn', rarity: 'comun', zone: 2,
    period: 'Cretácico superior', mya: '75–71 millones de años', length: 2, weight: '15–20 kg', height: 0.5,
    diet: 'Pequeños reptiles, mamíferos y crías', base: { hp: 85, atk: 30, def: 14, spd: 34 },
    moves: { basic: 'Garra Curva', special: 'Ataque Relámpago', fx: 'slash' },
    model: { kind: 'theropod', hip: 0.55, body: 0.55, neck: 0.32, head: 0.22, tail: 0.95, arms: 0.3,
      feathers: true, slim: true,
      colors: { body: '#8a6a4a', belly: '#e6d2ae', pattern: 'stripes', mark: '#3e2c1d', accent: '#3c7fa8' } },
    kid: 'Era del tamaño de un pavo y tenía plumas. Tenía una garra curva en cada pie para atrapar a sus presas.',
    adult: 'Dromeosáurido de Mongolia. Fósiles con protuberancias para plumas en el cúbito indican que estaba emplumado. La garra falciforme del segundo dedo (~6.5 cm) servía para sujetar presas.',
    fact: 'El famoso fósil "dinosaurios luchando" muestra a un Velociraptor peleando con un Protoceratops.',
    quiz: { q: '¿Qué tenía el Velociraptor en el cuerpo?', options: ['Pelo', 'Plumas', 'Caparazón'], a: 1 }
  },
  {
    id: 'dilophosaurus', name: 'Dilophosaurus', type: 'carn', rarity: 'rara', zone: 2,
    period: 'Jurásico inferior', mya: '193 millones de años', length: 7, weight: '400 kg', height: 1.8,
    diet: 'Peces y animales medianos', base: { hp: 95, atk: 32, def: 18, spd: 26 },
    moves: { basic: 'Mordida', special: 'Chillido de Cresta', fx: 'roar' },
    model: { kind: 'theropod', hip: 0.75, body: 0.6, neck: 0.32, head: 0.26, tail: 0.95, arms: 0.3,
      dualCrest: true,
      colors: { body: '#6c7f3e', belly: '#e1d9a6', pattern: 'spots', mark: '#2f3f1a', accent: '#e14f3a' } },
    kid: 'Tenía dos crestas delgadas sobre la cabeza, como dos abanicos. Era uno de los grandes cazadores de su época.',
    adult: 'Terópodo temprano de la Formación Kayenta (Arizona). Sus crestas nasales pareadas eran frágiles, por lo que probablemente servían para exhibición. No hay evidencia de que escupiera veneno ni tuviera gorguera.',
    fact: 'El veneno y la gorguera del Dilophosaurus de las películas son inventos: no aparecen en los fósiles.',
    quiz: { q: '¿El Dilophosaurus real escupía veneno?', options: ['Sí, siempre', 'No hay evidencia de eso', 'Solo de noche'], a: 1 }
  },
  {
    id: 'ankylosaurus', name: 'Ankylosaurus', type: 'herb', rarity: 'rara', zone: 2,
    period: 'Cretácico superior', mya: '68–66 millones de años', length: 7, weight: '5–8 t', height: 1.7,
    diet: 'Plantas bajas y helechos', base: { hp: 125, atk: 24, def: 38, spd: 10 },
    moves: { basic: 'Placa Blindada', special: 'Mazazo de Cola', fx: 'quake' },
    model: { kind: 'quad', len: 1.0, legH: 0.28, bodyR: 0.3, neck: 0.08, head: 0.18, tail: 0.55,
      armor: true, club: true, wide: true,
      colors: { body: '#7d6a52', belly: '#d8c7a2', pattern: 'spots', mark: '#4a3b2a', accent: '#a8946c' } },
    kid: 'Era como un tanque: tenía el cuerpo cubierto de placas duras y una cola con un mazo de hueso.',
    adult: 'Anquilosáurido acorazado. Los osteodermos fusionados cubrían el dorso e incluso los párpados. El mazo caudal, formado por osteodermos fusionados, podía romper huesos de un depredador.',
    fact: 'Hasta sus párpados tenían placas de hueso.',
    quiz: { q: '¿Qué tenía el Ankylosaurus al final de la cola?', options: ['Una púa', 'Un mazo de hueso', 'Una aleta'], a: 1 }
  },

  /* ---------------- Zona 3 · Laguna Prehistórica ---------------- */
  {
    id: 'plesiosaurus', name: 'Plesiosaurus', type: 'agua', rarity: 'comun', zone: 3, notDino: 'reptil marino',
    period: 'Jurásico inferior', mya: '199–175 millones de años', length: 3.5, weight: '450 kg', height: 1,
    diet: 'Peces y calamares', base: { hp: 95, atk: 24, def: 20, spd: 24 },
    moves: { basic: 'Mordisco Marino', special: 'Ola Gigante', fx: 'wave' },
    model: { kind: 'plesio', len: 1.0, neck: 0.55,
      colors: { body: '#3f6f86', belly: '#cfe3e2', pattern: 'spots', mark: '#244657', accent: '#7fd0d6' } },
    kid: '¡No es un dinosaurio! Es un reptil que vivía en el mar. Nadaba moviendo cuatro aletas como alas.',
    adult: 'Plesiosaurio, reptil marino (no dinosaurio). Sus cuatro aletas producían un nado tipo "vuelo subacuático". Fue descrito a partir de fósiles hallados por Mary Anning en Inglaterra.',
    fact: 'Mary Anning, una joven sin estudios formales, encontró el primer esqueleto completo de plesiosaurio en 1823.',
    quiz: { q: '¿El Plesiosaurus era un dinosaurio?', options: ['Sí', 'No, era un reptil marino', 'Era un pez'], a: 1 }
  },
  {
    id: 'baryonyx', name: 'Baryonyx', type: 'agua', rarity: 'rara', zone: 3,
    period: 'Cretácico inferior', mya: '130–125 millones de años', length: 8, weight: '1.2–1.7 t', height: 2.5,
    diet: 'Peces e iguanodontes jóvenes', base: { hp: 105, atk: 30, def: 20, spd: 22 },
    moves: { basic: 'Garra Pescadora', special: 'Embestida del Río', fx: 'wave' },
    model: { kind: 'theropod', hip: 0.85, body: 0.7, neck: 0.4, head: 0.34, tail: 1.0, arms: 0.42,
      crocSnout: true, bigClaw: true,
      colors: { body: '#556b5a', belly: '#d6dcc0', pattern: 'stripes', mark: '#2e4034', accent: '#c7a240' } },
    kid: 'Tenía el hocico largo como un cocodrilo y una garra enorme en la mano para pescar.',
    adult: 'Espinosáurido de Inglaterra. Se halló con escamas de pez (Scheenstia) en el estómago, prueba directa de dieta piscívora. Su garra del pulgar medía unos 30 cm.',
    fact: 'Su nombre significa "garra pesada".',
    quiz: { q: '¿Qué comía principalmente el Baryonyx?', options: ['Peces', 'Frutas', 'Insectos'], a: 0 }
  },
  {
    id: 'spinosaurus', name: 'Spinosaurus', type: 'agua', rarity: 'epica', zone: 3, days: [5, 6, 0],
    period: 'Cretácico medio', mya: '99–93 millones de años', length: 14, weight: '7–9 t', height: 4,
    diet: 'Peces grandes como celacantos', base: { hp: 130, atk: 36, def: 24, spd: 20 },
    moves: { basic: 'Mordida de Cocodrilo', special: 'Tormenta de Vela', fx: 'wave' },
    model: { kind: 'theropod', hip: 0.95, body: 0.85, neck: 0.4, head: 0.4, tail: 1.1, arms: 0.45,
      crocSnout: true, sail: true, paddleTail: true,
      colors: { body: '#6a5a45', belly: '#e0cfaa', pattern: 'stripes', mark: '#3a2f22', accent: '#d2492c' } },
    kid: 'Es el dinosaurio carnívoro más largo que se conoce. Tenía una gran vela en la espalda y nadaba en los ríos.',
    adult: 'Espinosáurido del norte de África (Marruecos y Egipto). Su cola alta con espinas neurales largas indica propulsión en el agua; huesos densos sugieren hábitos semiacuáticos. El holotipo original se perdió en Múnich en 1944.',
    fact: 'Los primeros fósiles se destruyeron en un bombardeo de la Segunda Guerra Mundial.',
    quiz: { q: '¿Qué tenía el Spinosaurus en la espalda?', options: ['Una vela', 'Alas', 'Caparazón'], a: 0 }
  },

  /* ---------------- Zona 4 · Cumbre de los Pterosaurios ---------------- */
  {
    id: 'pteranodon', name: 'Pteranodon', type: 'vol', rarity: 'comun', zone: 4, notDino: 'pterosaurio',
    period: 'Cretácico superior', mya: '86–84 millones de años', length: 1.8, weight: '20–35 kg', height: 1.8,
    diet: 'Peces', base: { hp: 80, atk: 27, def: 14, spd: 36 },
    moves: { basic: 'Picotazo', special: 'Picada Aérea', fx: 'dive' },
    model: { kind: 'ptero', span: 1.0, crest: 'ptera',
      colors: { body: '#c9b79a', belly: '#f1e7d2', pattern: 'none', mark: '#7d6247', accent: '#d8743a', wing: '#9c6a4a' } },
    kid: '¡Volaba, pero no era un dinosaurio! Era un pterosaurio. Sus alas eran de piel y no tenía dientes.',
    adult: 'Pterosaurio pteranodóntido del Mar Interior Occidental. Envergadura de hasta 7 m, sin dientes ("ala sin dientes"). El ala era una membrana sostenida por un cuarto dedo muy alargado.',
    fact: 'Su ala se sostenía con un solo dedo gigantesco: el cuarto.',
    quiz: { q: '¿Con qué sostenía el Pteranodon su ala?', options: ['Con plumas', 'Con un dedo muy largo', 'Con la cola'], a: 1 }
  },
  {
    id: 'dimorphodon', name: 'Dimorphodon', type: 'vol', rarity: 'comun', zone: 4, notDino: 'pterosaurio', afterHour: 14,
    period: 'Jurásico inferior', mya: '195–190 millones de años', length: 1, weight: '2 kg', height: 0.4,
    diet: 'Insectos y pequeños vertebrados', base: { hp: 70, atk: 26, def: 12, spd: 40 },
    moves: { basic: 'Picotazo', special: 'Ráfaga', fx: 'dive' },
    model: { kind: 'ptero', span: 0.6, crest: 'dimorph', bigHead: true, longTail: true,
      colors: { body: '#3f4a5c', belly: '#c8ced6', pattern: 'none', mark: '#1f2733', accent: '#f2c84b', wing: '#5a6b84' } },
    kid: 'Un pequeño volador con una cabeza grandota y dientes de dos tipos. Sale a cazar por la tarde.',
    adult: 'Pterosaurio basal descrito por Richard Owen. Su nombre ("dos formas de diente") alude a sus dientes frontales largos y posteriores pequeños. Tenía cola larga, rasgo de los pterosaurios primitivos.',
    fact: 'Lo encontró Mary Anning, la misma que halló el primer plesiosaurio completo.',
    quiz: { q: '¿Qué significa "Dimorphodon"?', options: ['Dos formas de diente', 'Ala gigante', 'Cabeza roja'], a: 0 }
  },
  {
    id: 'quetzalcoatlus', name: 'Quetzalcoatlus', type: 'vol', rarity: 'epica', zone: 4, notDino: 'pterosaurio', days: [6, 0],
    period: 'Cretácico superior', mya: '68–66 millones de años', length: 3, weight: '200–250 kg', height: 5,
    diet: 'Pequeños animales que cazaba caminando', base: { hp: 110, atk: 34, def: 20, spd: 30 },
    moves: { basic: 'Picotazo Gigante', special: 'Vendaval', fx: 'dive' },
    model: { kind: 'ptero', span: 1.35, crest: 'quetzal', longNeck: true,
      colors: { body: '#e2d6c2', belly: '#f6efe2', pattern: 'none', mark: '#8a6f55', accent: '#d64431', wing: '#b47d58' } },
    kid: 'Uno de los animales voladores más grandes de toda la historia. ¡Parado era tan alto como una jirafa!',
    adult: 'Azdárquido de Texas con una envergadura estimada de 10–11 m. Probablemente despegaba con un salto impulsado por las extremidades anteriores y cazaba presas pequeñas en tierra.',
    fact: 'Su nombre viene de Quetzalcóatl, la serpiente emplumada de la mitología mesoamericana.',
    quiz: { q: '¿De qué tamaño era el Quetzalcoatlus parado?', options: ['Como un gato', 'Como una jirafa', 'Como una hormiga'], a: 1 }
  },

  /* ---------------- Zona 5 · Guarida del Rey ---------------- */
  {
    id: 'carnotaurus', name: 'Carnotaurus', type: 'carn', rarity: 'rara', zone: 5, days: [2, 4, 6],
    period: 'Cretácico superior', mya: '72–69 millones de años', length: 8, weight: '1.3–2 t', height: 3,
    diet: 'Saurópodos jóvenes y otros dinosaurios', base: { hp: 110, atk: 34, def: 20, spd: 30 },
    moves: { basic: 'Topetazo', special: 'Carrera Patagónica', fx: 'charge' },
    model: { kind: 'theropod', hip: 0.9, body: 0.7, neck: 0.3, head: 0.3, tail: 1.0, arms: 0.12,
      bullHorns: true, tinyArms: true,
      colors: { body: '#9b4a35', belly: '#e9c6a4', pattern: 'spots', mark: '#5a2318', accent: '#f0c060' } },
    kid: '¡Un dinosaurio de Sudamérica con cuernos de toro! Sus brazos eran todavía más pequeños que los del T. rex.',
    adult: 'Abelisáurido de la Patagonia argentina. Se conservaron impresiones de piel con escamas y protuberancias. Sus extremidades anteriores eran vestigiales y su cola musculosa sugiere que era un corredor veloz.',
    fact: 'Es uno de los pocos dinosaurios grandes con impresiones de piel conservadas en buena parte del cuerpo.',
    quiz: { q: '¿En qué continente vivió el Carnotaurus?', options: ['Sudamérica', 'Asia', 'Antártida'], a: 0 }
  },
  {
    id: 'brachiosaurus', name: 'Brachiosaurus', type: 'herb', rarity: 'epica', zone: 5, minVisits: 2,
    period: 'Jurásico superior', mya: '154–153 millones de años', length: 22, weight: '28–46 t', height: 12,
    diet: 'Hojas de las copas de los árboles', base: { hp: 150, atk: 26, def: 32, spd: 8 },
    moves: { basic: 'Pisotón', special: 'Terremoto', fx: 'quake' },
    model: { kind: 'quad', len: 1.0, legH: 0.6, bodyR: 0.26, neck: 0.95, head: 0.13, tail: 0.5,
      longNeck: true, frontTall: true,
      colors: { body: '#7b8590', belly: '#d9dcd2', pattern: 'stripes', mark: '#4a535c', accent: '#9aa86a' } },
    kid: 'Un gigante de cuello largo que comía las hojas más altas de los árboles. ¡Era más alto que un edificio de 4 pisos!',
    adult: 'Saurópodo braquiosáurido de la Formación Morrison. A diferencia de otros saurópodos, sus patas delanteras eran más largas que las traseras, lo que inclinaba el cuerpo y elevaba el cuello.',
    fact: 'Su nombre significa "lagarto brazo" por sus largas patas delanteras.',
    quiz: { q: '¿Qué patas eran más largas en el Brachiosaurus?', options: ['Las delanteras', 'Las traseras', 'Todas iguales'], a: 0 }
  },
  {
    id: 'trex', name: 'Tyrannosaurus rex', type: 'carn', rarity: 'legendaria', zone: 5, minVisits: 3,
    period: 'Cretácico superior', mya: '68–66 millones de años', length: 12.3, weight: '8–9 t', height: 4,
    diet: 'Grandes dinosaurios como Triceratops', base: { hp: 160, atk: 42, def: 28, spd: 20 },
    moves: { basic: 'Mordida Feroz', special: 'Rugido del Rey', fx: 'roar' },
    model: { kind: 'theropod', hip: 1.0, body: 0.85, neck: 0.3, head: 0.58, tail: 1.1, arms: 0.16,
      big: true, tinyArms: true,
      colors: { body: '#6e5a3e', belly: '#e2cfa3', pattern: 'stripes', mark: '#36291a', accent: '#b8402a' } },
    kid: '¡El rey de los dinosaurios! Tenía la mordida más fuerte de todos los animales terrestres y dientes del tamaño de un plátano.',
    adult: 'Tiranosáurido de Norteamérica. Su fuerza de mordida se estima en ~35 000–57 000 N. Tenía visión binocular y un gran bulbo olfatorio. Sus brazos cortos (~1 m) eran robustos y musculosos.',
    fact: 'Un T. rex crecía hasta 2 kg por día en su adolescencia.',
    quiz: { q: '¿Qué tan fuerte era la mordida del T. rex?', options: ['Débil como un perro', 'La más fuerte de los animales terrestres', 'No tenía dientes'], a: 1 }
  }
];
DC.SP = {};
DC.SPECIES.forEach(function (s, i) { s.no = i + 1; DC.SP[s.id] = s; });

/* ---------------------------------------------------------------------
   Zonas de Dino Park (5) — posición en el mapa SVG (viewBox 360x520)
   --------------------------------------------------------------------- */
DC.ZONES = [
  { id: 1, name: 'Valle de los Cuernos', short: 'Valle', glyph: 'horn', color: '#9cc25a', x: 92, y: 430,
    desc: 'Praderas abiertas donde pastan los grandes herbívoros. Busca entre las réplicas cerca de la entrada.' },
  { id: 2, name: 'Bosque de Helechos', short: 'Bosque', glyph: 'fern', color: '#4f9a5c', x: 252, y: 360,
    desc: 'Sendero sombreado con helechos. Los carnívoros pequeños se esconden entre las plantas.' },
  { id: 3, name: 'Laguna Prehistórica', short: 'Laguna', glyph: 'wave', color: '#3fb0bf', x: 96, y: 268,
    desc: 'Junto al agua cazan los dinosaurios pescadores. En Querulpa (valle de Majes, Arequipa) se conservan huellas reales de dinosaurios.' },
  { id: 4, name: 'Cumbre de los Pterosaurios', short: 'Cumbre', glyph: 'wing', color: '#7fb6f0', x: 258, y: 190,
    desc: 'El mirador más alto del parque. Mira hacia el cielo: aquí planean los reptiles voladores.' },
  { id: 5, name: 'Guarida del Rey', short: 'Guarida', glyph: 'crown', color: '#f4b638', x: 160, y: 104,
    desc: 'La zona a los pies del volcán. Aquí viven los gigantes. El T. rex solo se deja ver a exploradores veteranos.' }
];

/* ---------------------------------------------------------------------
   Progresión del explorador
   --------------------------------------------------------------------- */
DC.TITLES = [
  { lvl: 1, name: 'Novato' }, { lvl: 3, name: 'Rastreador' }, { lvl: 6, name: 'Explorador' },
  { lvl: 10, name: 'Paleontólogo' }, { lvl: 15, name: 'Guardián del Parque' }, { lvl: 20, name: 'Leyenda Jurásica' }
];
DC.titleFor = function (lvl) {
  var t = DC.TITLES[0];
  DC.TITLES.forEach(function (x) { if (lvl >= x.lvl) t = x; });
  return t.name;
};
DC.xpToNext = function (lvl) { return 100 + 60 * (lvl - 1); };
DC.dinoXpToNext = function (lvl) { return 60 + 30 * (lvl - 1); };

/* Recursos por visita */
DC.SPHERES_PER_VISIT = 10;
DC.SPHERE_BUY_LIMIT = 6; /* compras con monedas por visita */

/* ---------------------------------------------------------------------
   Pasaporte Jurásico: recompensas por número de visitas (días distintos)
   --------------------------------------------------------------------- */
DC.PASSPORT = [
  { visit: 1, title: 'Primera huella', reward: '10 Dinoesferas y tu primer compañero', items: {} },
  { visit: 2, title: 'Rastro fresco', reward: 'Huevo misterioso + 5 Dinoesferas extra. Aparece el Brachiosaurus.', items: { egg: 1, spheres: 5 } },
  { visit: 3, title: 'Sello del Rey', reward: 'Se despierta el T. rex en la Guarida + Bebida gratis en la cafetería', items: { coins: 150 }, code: 'Bebida gratis en la cafetería' },
  { visit: 5, title: 'Explorador fiel', reward: '20 % de descuento en tu próxima entrada', items: { coins: 250, egg: 1 }, code: '20 % de descuento en tu próxima entrada' },
  { visit: 8, title: 'Huella dorada', reward: 'Helecho dorado x3 + Medalla dorada', items: { fern: 3, coins: 300 } },
  { visit: 10, title: 'Paleontólogo honorario', reward: 'Certificado y peluche oficial de Dino Park', items: { coins: 500 }, code: 'Peluche oficial + certificado de Paleontólogo honorario' }
];

/* ---------------------------------------------------------------------
   Tienda (Dino-monedas)
   --------------------------------------------------------------------- */
DC.SHOP = [
  { id: 'sphere', name: 'Dinoesfera', desc: 'Un intento más de captura. Máx. 6 por visita.', price: 60, kind: 'item' },
  { id: 'leaf', name: 'Hoja medicinal', desc: 'Cura el 60 % de la vida de un compañero.', price: 40, kind: 'item' },
  { id: 'fern', name: 'Helecho dorado', desc: 'El próximo lanzamiento tiene x1.5 de captura.', price: 90, kind: 'item' },
  { id: 'r_sticker', name: 'Sticker oficial DinoCaza', desc: 'Canjéalo en la caja del parque.', price: 400, kind: 'real' },
  { id: 'r_photo', name: 'Foto impresa con dinosaurio', desc: 'Foto 10x15 en el punto de fotos.', price: 900, kind: 'real' },
  { id: 'r_toy', name: 'Mini figura de dinosaurio', desc: 'En la tienda de recuerdos.', price: 1800, kind: 'real' }
];

/* ---------------------------------------------------------------------
   Misiones diarias (se eligen 3 por visita)
   --------------------------------------------------------------------- */
DC.MISSION_POOL = [
  { id: 'win2', text: 'Gana 2 peleas', stat: 'wins', goal: 2, coins: 80, xp: 50 },
  { id: 'win4', text: 'Gana 4 peleas', stat: 'wins', goal: 4, coins: 140, xp: 90 },
  { id: 'cap1', text: 'Captura 1 dinosaurio', stat: 'caps', goal: 1, coins: 60, xp: 40 },
  { id: 'cap3', text: 'Captura 3 dinosaurios', stat: 'caps', goal: 3, coins: 130, xp: 90 },
  { id: 'capherb', text: 'Captura un Herbívoro', stat: 'cap_herb', goal: 1, coins: 80, xp: 50 },
  { id: 'capcarn', text: 'Captura un Carnívoro', stat: 'cap_carn', goal: 1, coins: 90, xp: 60 },
  { id: 'capvol', text: 'Captura un Volador', stat: 'cap_vol', goal: 1, coins: 90, xp: 60 },
  { id: 'quiz2', text: 'Responde bien 2 preguntas de fichas', stat: 'quiz', goal: 2, coins: 70, xp: 60 },
  { id: 'zones3', text: 'Explora 3 zonas distintas', stat: 'zones', goal: 3, coins: 90, xp: 60 },
  { id: 'exc2', text: 'Haz 2 lanzamientos "Excelente"', stat: 'excellent', goal: 2, coins: 90, xp: 60 },
  { id: 'dodge4', text: 'Logra 4 esquivas perfectas', stat: 'perfect', goal: 4, coins: 80, xp: 60 },
  { id: 'crit5', text: 'Consigue 5 golpes críticos', stat: 'crits', goal: 5, coins: 80, xp: 60 },
  { id: 'special2', text: 'Usa 2 ataques especiales', stat: 'specials', goal: 2, coins: 70, xp: 50 }
];

/* ---------------------------------------------------------------------
   Medallas (logros permanentes)
   --------------------------------------------------------------------- */
DC.MEDALS = [
  { id: 'first', name: 'Primera captura', test: function (s) { return s.totals.caps >= 1; } },
  { id: 'route', name: 'Ruta completa', test: function (s) { return s.totals.routes >= 1; } },
  { id: 'route3', name: 'Tres rutas', test: function (s) { return s.totals.routes >= 3; } },
  { id: 'all_types', name: 'Los 4 tipos', test: function (s) { var c = DC.Store.caughtTypes(); return c.length >= 4; } },
  { id: 'golden', name: 'Fósil dorado', test: function (s) { return s.totals.golden >= 1; } },
  { id: 'trex', name: 'Rey capturado', test: function (s) { return !!s.album.trex && s.album.trex.caught > 0; } },
  { id: 'hard', name: 'Victoria difícil', test: function (s) { return s.totals.hardWins >= 1; } },
  { id: 'sabio', name: 'Pequeño sabio', test: function (s) { return s.totals.quiz >= 5; } },
  { id: 'album', name: 'Álbum completo', test: function (s) { return DC.Store.caughtCount() >= DC.SPECIES.length; } },
  { id: 'visit5', name: 'Cinco visitas', test: function (s) { return s.visits >= 5; } }
];

/* ---------------------------------------------------------------------
   Modelos 3D externos (.glb con animaciones). Si el archivo no carga,
   el juego usa el modelo procedural de models.js.
   Para agregar otro: pon el .glb en models/ y añade una línea aquí.
   rotY: giro extra (radianes) si el modelo no mira hacia adelante.
   clips: nombre de la animación del archivo para cada acción del juego
   (si se omite, se reconoce por palabras como idle, walk, attack...).
   --------------------------------------------------------------------- */
DC.MODEL_CREDIT = 'Modelos 3D animados: Quaternius · Animated Dinosaur Pack (CC0)';
DC.MODEL_FILES = {
  trex:            { file: 'models/Trex.glb' },
  triceratops:     { file: 'models/Triceratops.glb' },
  velociraptor:    { file: 'models/Velociraptor.glb' },
  stegosaurus:     { file: 'models/Stegosaurus.glb' },
  parasaurolophus: { file: 'models/Parasaurolophus.glb' }
};

