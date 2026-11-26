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

/* Una sola dificultad para todos: equilibrada para niños y adultos */
DC.DIFF = {
  id: 'normal', name: 'Explorador',
  enemyLvl: 0, windup: 1.2, dodgeWin: 0.62, enemyDmg: 0.85, ringSpeed: 0.9,
  capture: 1.05, reward: 1.25, atkEvery: [2.8, 3.8], combo: 0.1, feint: 0.06
};
DC.DIFFICULTY = { normal: DC.DIFF };

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
DC.SPHERES_PER_VISIT = 6;
DC.SPHERE_BUY_LIMIT = 4; /* compras con monedas por visita */

/* ---------------------------------------------------------------------
   Pasaporte Jurásico: recompensas por número de visitas (días distintos)
   --------------------------------------------------------------------- */
DC.PASSPORT = [
  { visit: 1, title: 'Primera huella', reward: '6 Dinoesferas y tu primer compañero', items: {}, prize: null },
  { visit: 2, title: 'Rastro fresco', reward: 'Canchita gratis + huevo misterioso + 5 Dinoesferas. Aparece el Brachiosaurus.', items: { egg: 1, spheres: 5 }, prize: 'canchita' },
  { visit: 3, title: 'Sello del Rey', reward: 'Juego gratis + 2 Superesferas. Se despierta el T. rex.', items: { coins: 150, super: 2 }, prize: 'juego' },
  { visit: 5, title: 'Explorador fiel', reward: '20 % de descuento en tu próxima entrada + huevo', items: { coins: 250, egg: 1 }, prize: 'entrada20' },
  { visit: 8, title: 'Huella dorada', reward: '2 Ultraesferas + 3 Helechos dorados', items: { fern: 3, ultra: 2, coins: 300 }, prize: null },
  { visit: 10, title: 'Paleontólogo honorario', reward: 'Peluche oficial de Dino Park + certificado', items: { coins: 500 }, prize: 'peluche' }
];

/* ---------------------------------------------------------------------
   Tienda (Dino-monedas)
   --------------------------------------------------------------------- */
DC.SHOP = [
  { id: 'sphere', name: 'Dinoesfera', desc: 'Un intento más de captura. Máx. 4 por visita.', price: 60, kind: 'item' },
  { id: 'super', name: 'Superesfera', desc: 'Captura x1.6. Hecha de zafiro y plata.', price: 140, kind: 'item' },
  { id: 'ultra', name: 'Ultraesfera', desc: 'Captura x2.4. Ideal para únicos y legendarios.', price: 300, kind: 'item' },
  { id: 'leaf', name: 'Hoja medicinal', desc: 'Cura el 60 % de la vida de un compañero.', price: 40, kind: 'item' },
  { id: 'fern', name: 'Helecho dorado', desc: 'El próximo lanzamiento tiene x1.5 de captura.', price: 90, kind: 'item' }
];

/* Premios reales que se canjean en el parque con un código + QR */
DC.PRIZES = {
  canchita: { id: 'canchita', name: 'Canchita gratis', desc: 'Una bolsa de canchita (popcorn) en la cafetería.', price: 350, color: '#ffcf3f', place: 'Cafetería' },
  juego: { id: 'juego', name: 'Juego gratis', desc: 'Una partida gratis en los juegos del parque.', price: 700, color: '#3fb5ff', place: 'Zona de juegos' },
  helado: { id: 'helado', name: 'Helado gratis', desc: 'Un helado por cada dinosaurio único capturado.', price: 0, color: '#ff8fb1', place: 'Heladería' },
  peluche: { id: 'peluche', name: 'Peluche de dinosaurio', desc: 'Peluche oficial de Dino Park.', price: 2500, color: '#8f6bff', place: 'Tienda de recuerdos' },
  sticker: { id: 'sticker', name: 'Sticker oficial', desc: 'Sticker de DinoCaza AR.', price: 300, color: '#2fae66', place: 'Caja' },
  foto: { id: 'foto', name: 'Foto impresa', desc: 'Foto 10x15 con tu dinosaurio favorito.', price: 900, color: '#ff6f59', place: 'Punto de fotos' },
  entrada20: { id: 'entrada20', name: '20 % en tu próxima entrada', desc: 'Descuento para volver al parque.', price: 0, color: '#2fae66', place: 'Boletería' },
  entrada: { id: 'entrada', name: 'Entrada gratis', desc: 'Premio por completar el álbum.', price: 0, color: '#ffc531', place: 'Boletería' },
  tienda10: { id: 'tienda10', name: '10 % en la tienda', desc: 'Descuento en la tienda de recuerdos.', price: 0, color: '#3fb5ff', place: 'Tienda de recuerdos' },
  peluche_oro: { id: 'peluche_oro', name: 'Peluche dorado edición única', desc: 'Por capturar los 8 dinosaurios únicos.', price: 0, color: '#ffc531', place: 'Tienda de recuerdos' }
};
DC.PRIZE_SHOP = ['canchita', 'sticker', 'juego', 'foto', 'peluche'];

/* Tipos de esfera */
DC.BALLS = {
  dino: { id: 'dino', name: 'Dinoesfera', mult: 1, top: '#ffb23d', mid: '#f08a12', bottom: '#3b2618', band: '#2a1a0f', glow: '#ffcf6a' },
  super: { id: 'super', name: 'Superesfera', mult: 1.6, top: '#6fc7ff', mid: '#1f6fd6', bottom: '#d9e2ec', band: '#1b2b44', glow: '#9fe0ff' },
  ultra: { id: 'ultra', name: 'Ultraesfera', mult: 2.4, top: '#ffd85a', mid: '#e0a300', bottom: '#1a1a1f', band: '#ffd85a', glow: '#fff0a8' }
};

/* Variantes de color (cualquier especie). chance = probabilidad por encuentro */
DC.VARIANTS = {
  normal: { id: 'normal', name: 'Normal', mult: 1 },
  plata: { id: 'plata', name: 'Plateado', chance: 1 / 12, mult: 1.06, color: '#dfe6ee', lerp: 0.9, metal: 0.4, rough: 0.3, emissive: '#55606c', glow: 0.45, aura: '#eef6ff', coins: 1.5, capture: 0.9, chip: '#c9d3de' },
  oro: { id: 'oro', name: 'Dorado', chance: 1 / 25, mult: 1.1, color: '#f2c14e', lerp: 0.9, metal: 0.4, rough: 0.32, emissive: '#7a4e00', glow: 0.6, aura: '#ffd45a', coins: 2, capture: 0.8, chip: '#ffc531' },
  rubi: { id: 'rubi', name: 'Rubí', chance: 1 / 40, mult: 1.08, color: '#e0314f', lerp: 0.7, metal: 0.3, rough: 0.35, emissive: '#5a0010', glow: 0.45, aura: '#ff6b84', coins: 1.75, capture: 0.85, chip: '#ff5470' },
  zafiro: { id: 'zafiro', name: 'Zafiro', chance: 1 / 40, mult: 1.08, color: '#2f6bff', lerp: 0.7, metal: 0.3, rough: 0.35, emissive: '#001a5a', glow: 0.45, aura: '#7fb0ff', coins: 1.75, capture: 0.85, chip: '#4a86ff' },
  esmeralda: { id: 'esmeralda', name: 'Esmeralda', chance: 1 / 40, mult: 1.08, color: '#19c27a', lerp: 0.7, metal: 0.3, rough: 0.35, emissive: '#003a20', glow: 0.45, aura: '#7dffbe', coins: 1.75, capture: 0.85, chip: '#19c27a' },
  amatista: { id: 'amatista', name: 'Amatista', chance: 1 / 40, mult: 1.08, color: '#9b5cff', lerp: 0.7, metal: 0.3, rough: 0.35, emissive: '#2a0060', glow: 0.45, aura: '#d3a8ff', coins: 1.75, capture: 0.85, chip: '#9b5cff' }
};
DC.VARIANT_ORDER = ['plata', 'oro', 'rubi', 'zafiro', 'esmeralda', 'amatista'];

/* Dinosaurios únicos: uno de cada uno por jugador. Cada uno = helado gratis */
DC.UNIQUES = [
  { id: 'u_glaciar', sp: 'triceratops', name: 'Tricera Glaciar', zone: 1, color: '#9fe3ff', emissive: '#1a8fd0', glow: 0.7, aura: '#c9f2ff', lore: 'Tiene escarcha en los cuernos y deja huellas de hielo.' },
  { id: 'u_coral', sp: 'parasaurolophus', name: 'Parasauro Coral', zone: 1, color: '#ff8fa3', emissive: '#c2185b', glow: 0.55, aura: '#ffc1d0', lore: 'Su cresta suena como un caracol marino.' },
  { id: 'u_esmeralda', sp: 'stegosaurus', name: 'Stego Esmeralda', zone: 1, color: '#16b86d', emissive: '#00ff99', glow: 0.6, aura: '#7dffbe', lore: 'Sus placas brillan como gemas al atardecer.' },
  { id: 'u_neon', sp: 'velociraptor', name: 'Raptor Neón', zone: 2, color: '#28e07c', emissive: '#00ff6a', glow: 0.9, aura: '#a6ffcc', lore: 'Sus plumas brillan en la oscuridad del bosque.' },
  { id: 'u_abisal', sp: 'spinosaurus', name: 'Spino Abisal', zone: 3, color: '#1b3a8a', emissive: '#00d9ff', glow: 0.8, aura: '#5ff0ff', lore: 'Vive en lo más hondo de la laguna. Su vela emite luz.' },
  { id: 'u_aurora', sp: 'pteranodon', name: 'Ptera Aurora', zone: 4, color: '#9b6bff', emissive: '#ff4fd8', glow: 0.75, aura: '#ffb0f0', lore: 'Sus alas cambian de color como una aurora.' },
  { id: 'u_nube', sp: 'brachiosaurus', name: 'Brachio Nube', zone: 5, color: '#f2f6ff', emissive: '#8fc8ff', glow: 0.5, aura: '#ffffff', lore: 'Tan alto que su cabeza se pierde entre las nubes.' },
  { id: 'u_volcan', sp: 'trex', name: 'Rex Volcán', zone: 5, color: '#3a1a12', emissive: '#ff4a10', glow: 1.0, aura: '#ff8a3d', lore: 'Nació en el cráter del Misti. Su piel brilla como lava.' }
];
DC.UNIQUE = {};
DC.UNIQUES.forEach(function (u) { DC.UNIQUE[u.id] = u; });
DC.UNIQUE_CHANCE = 0.08;
/* Devuelve el aspecto visual de una variante o un único */
DC.look = function (variant) {
  if (!variant || variant === 'normal') return null;
  var u = DC.UNIQUE[variant];
  var xm = DC.XMAS_BY && DC.XMAS_BY[variant];
  if (xm) return null;
  if (u) return { id: u.id, name: u.name, unique: true, mult: 1.15, color: u.color, lerp: 0.85, metal: 0.25, rough: 0.35, emissive: u.emissive, glow: u.glow, aura: u.aura, coins: 3, capture: 0.6, chip: u.color };
  return DC.VARIANTS[variant] || null;
};

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
  { id: 'uniques', name: 'Los 8 únicos', test: function (s) { return Object.keys(s.uniques || {}).length >= 8; } },
  { id: 'trex', name: 'Rey capturado', test: function (s) { return !!s.album.trex && s.album.trex.caught > 0; } },
  { id: 'unique1', name: 'Primer único', test: function (s) { return Object.keys(s.uniques || {}).length >= 1; } },
  { id: 'variant', name: 'Coleccionista de colores', test: function (s) { return (s.totals.variants || 0) >= 3; } },
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


/* ---------------------------------------------------------------------
   Modo paseo (estilo Pokémon GO). Coordenadas en unidades de 2 m.
   La entrada está al sur (z positivo) y el norte es -z.
   Ajustar estas posiciones al plano real de Dino Park.
   --------------------------------------------------------------------- */
DC.PARK = {
  unit: 2, radius: 78, entrance: { x: 0, z: 68 },
  zones: { 1: { x: -40, z: 22, r: 11 }, 2: { x: -46, z: -18, r: 11 }, 3: { x: -12, z: -50, r: 11 }, 4: { x: 34, z: -42, r: 11 }, 5: { x: 48, z: 8, r: 12 } }
};
/* Lugares del parque que aparecen al caminar */
DC.PLACES = [
  { id: 'entrada', name: 'Entrada y boletería', kind: 'gate', x: 0, z: 66, desc: 'Aquí empieza la aventura. Escanea el QR de tu entrada.', prize: 'entrada20' },
  { id: 'canchita', name: 'Canchita', kind: 'stand', x: -7, z: 54, color: '#ff5a4e', prop: 'popcorn', desc: 'Canchita dulce y salada recién hecha.', prize: 'canchita' },
  { id: 'helado', name: 'Heladería', kind: 'stand', x: -7, z: 43, color: '#ff7fb0', prop: 'icecream', desc: 'Helados de frutas de Arequipa. Aquí se canjea el helado de cada dinosaurio único.', prize: 'helado' },
  { id: 'comida', name: 'Comida rápida', kind: 'stand', x: -7, z: 32, color: '#ff9a2e', prop: 'burger', desc: 'Hamburguesas, salchipapas y anticuchos.' },
  { id: 'juguera', name: 'Juguería', kind: 'stand', x: 7, z: 54, color: '#2fb36b', prop: 'juice', desc: 'Jugos y refrescos para seguir caminando.' },
  { id: 'tienda', name: 'Tienda de recuerdos', kind: 'stand', x: 7, z: 43, color: '#8a63ff', prop: 'plush', desc: 'Peluches, figuras y stickers de dinosaurios.', prize: 'peluche' },
  { id: 'fotos', name: 'Punto de fotos', kind: 'stand', x: 7, z: 32, color: '#39b6ff', prop: 'camera', desc: 'Llévate tu foto impresa con tu dinosaurio favorito.', prize: 'foto' },
  { id: 'juegos', name: 'Juegos infantiles', kind: 'playground', x: -26, z: 46, desc: 'Toboganes, columpios y la zona de juegos. Aquí se canjea tu juego gratis.', prize: 'juego' },
  { id: 'parrillas', name: 'Área de parrillas', kind: 'bbq', x: 28, z: 42, desc: 'Mesas y parrillas para compartir en familia.' },
  { id: 'vr', name: 'Realidad virtual', kind: 'vr', x: 20, z: -14, desc: 'Ponte los lentes y vuela con los pterosaurios.' }
];
/* Réplicas reales del parque: se reconocen con la cámara y son jefes */
DC.REPLICAS = [
  { id: 'rep_tricera', sp: 'triceratops', name: 'Gran Triceratops', zone: 1, x: -44, z: 26, desc: 'La réplica a tamaño real del Valle.' },
  { id: 'rep_raptor', sp: 'velociraptor', name: 'Manada de Raptores', zone: 2, x: -50, z: -14, desc: 'Las réplicas escondidas entre los helechos.' },
  { id: 'rep_spino', sp: 'spinosaurus', name: 'Spinosaurus de la Laguna', zone: 3, x: -16, z: -54, desc: 'La gran vela que se ve desde el lago.' },
  { id: 'rep_ptera', sp: 'pteranodon', name: 'Pteranodon del Mirador', zone: 4, x: 38, z: -46, desc: 'Vigila desde lo alto de la cumbre.' },
  { id: 'rep_trex', sp: 'trex', name: 'T. rex Gigante', zone: 5, x: 52, z: 12, desc: 'La réplica más grande del parque. ¿Te atreves?' }
];
DC.AVATAR_COLORS = { shirt: ['#2fb36b', '#39b6ff', '#ff6b57', '#8a63ff', '#ffc93c', '#ff7fb0'], skin: ['#f2c7a5', '#d9a273', '#b07a4f', '#7a4e30'] };


/* =====================================================================
   NAVIDAD · dinosaurios especiales con ropa, puntos y premios grandes
   ===================================================================== */
DC.SEASON = { xmas: true, name: 'Navidad Jurásica' };
/* Cada especial navideño es raro: 7 % por encuentro en su zona, y como
   máximo 1 por visita (día). Hace falta volver varios días para tenerlos todos. */
DC.XMAS_CHANCE = 0.07;
DC.XMAS_PER_VISIT = 1;
DC.XMAS = [
  { id: 'x_santa', sp: 'trex', name: 'Santa Rex', zone: 5, outfit: 'santa', color: '#e63946', lore: 'Reparte huevos de regalo en la Guarida del Rey.' },
  { id: 'x_reno', sp: 'triceratops', name: 'Tricera Reno', zone: 1, outfit: 'reno', color: '#a0662d', lore: 'Con sus cuernos y astas tira del trineo más pesado.' },
  { id: 'x_duende', sp: 'velociraptor', name: 'Raptor Duende', zone: 2, outfit: 'duende', color: '#2a9d5c', lore: 'Ayuda a envolver regalos a toda velocidad.' },
  { id: 'x_nieve', sp: 'stegosaurus', name: 'Stego Nevado', zone: 1, outfit: 'lana', color: '#4f8fd6', lore: 'Sus placas se cubren de escarcha y lleva bufanda.' },
  { id: 'x_coro', sp: 'parasaurolophus', name: 'Parasauro Villancico', zone: 1, outfit: 'santa', color: '#d62839', lore: 'Su cresta suena como una campana navideña.' },
  { id: 'x_estrella', sp: 'pteranodon', name: 'Ptera Estrella', zone: 4, outfit: 'estrella', color: '#f2b705', lore: 'Vuela con una estrella para la punta del árbol.' }
];
DC.XMAS_BY = {};
DC.XMAS.forEach(function (x) { DC.XMAS_BY[x.id] = x; });

/* Dino-puntos: se ganan jugando (con límite diario) y se canjean por premios grandes */
DC.POINTS = {
  daily: 400,
  capture: { comun: 15, rara: 30, epica: 70, legendaria: 150 },
  variant: 40, unique: 150, xmas: 150, boss: 120, route: 60, quiz: 10, win: 5,
  xmasAll: 1500, uniquesAll: 800
};
/* Premios por puntos: los grandes necesitan varias visitas por el límite diario */
DC.POINT_PRIZES = [
  { id: 'sticker', pts: 250 },
  { id: 'canchita', pts: 450 },
  { id: 'helado', pts: 700 },
  { id: 'juego', pts: 1100 },
  { id: 'foto', pts: 1600 },
  { id: 'peluche', pts: 3200 }
];
DC.AVATAR_HATS = [
  { id: 'navidad', name: 'Gorro navideño' },
  { id: 'safari', name: 'Safari' },
  { id: 'lana', name: 'Gorro de lana' },
  { id: 'gorra', name: 'Gorra' }
];
DC.AVATAR_COLORS.hair = ['#2b1a12', '#6b3e1f', '#c98a3c', '#e8d6a0'];
DC.AVATAR_COLORS.pants = ['#3b4a5a', '#2f5d8a', '#6b4a32', '#2b2b2b'];
