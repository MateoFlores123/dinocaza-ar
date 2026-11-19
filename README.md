# DinoCaza AR · Dino Park Arequipa

Web app de realidad aumentada: el visitante recorre las 5 zonas de Dino Park, encuentra dinosaurios 3D animados sobre la cámara del celular, pelea, los captura con la **Dinoesfera de ámbar**, aprende con fichas por edad y gana premios canjeables en caja.

**Grupo 03 · Innovación y Emprendedurismo · UCSM 2026**
Mateo Jesus Flores Gutierres · Eduardo Adriano Heracles Del Mar · Adriano Alessio Sanchez Velasquez

---

## 1. Cómo probarla

### En tu computadora
```bash
cd dinocaza-ar
python -m http.server 8000
```
Abre `http://localhost:8000`. En la PC funciona con la webcam (o en modo parque 3D) y se mira alrededor arrastrando con el mouse.

> No abras `index.html` con doble clic: algunos navegadores bloquean la cámara en `file://`.

### En el celular (cámara + giroscopio)
La cámara y los sensores de movimiento **solo funcionan con HTTPS**. La forma más rápida es publicarla gratis:

- **GitHub Pages:** sube la carpeta a un repositorio → *Settings → Pages → Deploy from branch (main / root)*. Te da una dirección del tipo `https://usuario.github.io/dinocaza-ar/`.
- **Netlify Drop:** entra a `app.netlify.com/drop` y arrastra la carpeta.

Luego abre la dirección en el celular (Chrome en Android o Safari en iPhone), acepta la cámara y el movimiento, y opcionalmente toca *Agregar a pantalla de inicio*: queda instalada como app y funciona **sin internet** después de la primera carga, para las zonas con poca señal (hallazgo de E1 y E5).

### QR para los letreros del parque
Abre `qr-zonas.html` (en tu dirección publicada), pega la URL pública y genera los 6 QR (entrada + 5 zonas). Al escanearlos con la cámara normal del celular, la app abre directamente esa zona. En *Ajustes → Validar zonas con QR* se exige el QR para explorar.

---

## 2. Qué incluye

| Área | Detalle |
|---|---|
| **AR real** | Video de la cámara trasera de fondo, dinosaurio anclado al mundo con el giroscopio, sombra de contacto sobre el piso real, flecha guía si el dino está fuera de pantalla, botón para recentrar. Sin cámara: parque 3D con plaza de sillar, araucarias y los volcanes Misti, Chachani y Pichu Pichu. |
| **15 especies 3D** | Modelos procedurales con esqueleto y piel deformable (skinning): T. rex, Triceratops, Spinosaurus, Brachiosaurus, Velociraptor, Stegosaurus, Ankylosaurus, Parasaurolophus, Dilophosaurus, Baryonyx, Carnotaurus, Pteranodon, Quetzalcoatlus, Dimorphodon, Plesiosaurus. |
| **Animaciones** | Respirar, mirar, caminar, rugir, preparar ataque, morder, recibir golpe, esquivar, ataque especial, agotarse, desmayarse, huir, aparecer desde el suelo, volar y nadar. Variante **dorada** (1 de 20; 1 de 12 al atardecer). |
| **Peleas** | Tiempo real. Atacas tocando cuando el anillo coincide (crítico / bien / roce). El enemigo avisa con un **"!" rojo** y hay que esquivar en el último momento (esquiva perfecta = energía + contraataque). Ataque especial con energía. Tipos: Herbívoro > Carnívoro > Volador > Acuático > Herbívoro. |
| **Dificultad** | Explorador (fácil), Rastreador (normal), Paleontólogo (difícil: combos, amagues, el enemigo esquiva la esfera, premios x1.75). |
| **Captura** | Toque único (hallazgo E2) o deslizar hacia arriba. Calidad Bien / Genial / Excelente según el anillo, 3 sacudidas de la esfera, el dinosaurio puede escapar o huir. Helecho dorado x1.5. |
| **Fichas educativas** | Texto niño / adulto (hallazgo E4), medidas reales, dato curioso, ventajas de tipo y pregunta con premio. |
| **Recompensas** | XP y niveles con títulos, Dino-monedas, medallas, tienda de objetos y **premios reales** con código + QR validable en caja. |

## 3. Mecánicas para que la gente vuelva

1. **Intentos limitados:** 10 Dinoesferas por visita (+1 por cada visita anterior, hasta +5). Con monedas se compran máx. 6 más por visita.
2. **Pasaporte Jurásico:** un sello por cada día distinto de visita. Premios en las visitas 2, 3, 5, 8 y 10 (huevo, bebida gratis, 20 % en la próxima entrada, peluche).
3. **Especies que se desbloquean con visitas:** Brachiosaurus desde la 2.ª visita, **T. rex desde la 3.ª**.
4. **Calendario:** Spinosaurus solo de viernes a domingo, Quetzalcoatlus solo fines de semana, Carnotaurus martes/jueves/sábado, Dimorphodon desde las 2 p. m. Para completar el álbum hay que volver en otros días.
5. **Huevos:** se ganan en peleas y **eclosionan en la próxima visita**, favoreciendo especies que te faltan.
6. **Equipo que se cansa:** la vida no se recupera del todo en el día; se cura por completo al volver.
7. **Misiones diarias** (3 por visita), ruta del tesoro de 5 zonas con código de premio y álbum completo = entrada gratis.

> **Modo presentación** (Ajustes): simula la próxima visita (+1 día), da esferas y monedas, y abre el **Panel Dino Park** con las métricas del Lean Canvas (North Star: % de rutas completadas).

## 4. Estructura

```
index.html            App (una sola página)
css/styles.css        Estilos
js/data.js            Especies, zonas, dificultad, misiones, premios, textos
js/store.js           Progreso, visitas, pasaporte, huevos, misiones, códigos
js/audio.js           Sonidos sintetizados (sin archivos) y vibración
js/models.js          Modelos 3D procedurales y animaciones
js/fx.js              Partículas y efectos
js/ar.js              Cámara, giroscopio, escena 3D, entorno, retratos
js/ui.js              Pantallas: mapa, álbum, equipo, pasaporte, premios, ajustes, panel
js/encounter.js       Encuentro, pelea, captura, QR y modo foto
js/main.js            Arranque
sw.js, manifest       App instalable y modo sin internet
vendor/               Three.js r128 y generador de QR (copia local)
qr-zonas.html         Hoja imprimible de QR para los letreros
```

El progreso se guarda en el navegador de cada visitante. Para producción, el siguiente paso es un backend que sincronice cuentas y alimente el panel del parque con todas las visitas.
