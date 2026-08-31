---
name: nutrifoto
description: Contexto completo del proyecto NutriFoto (app Android y web que estima calorías y macros fotografiando el plato, con backend Gemini compartido). Invócala al retomar el proyecto tras reiniciar el contexto, antes de tocar código, desplegar o diagnosticar fallos.
---

# NutriFoto

App de registro de comidas para Andrés: se fotografía el plato, Gemini estima alimentos,
porciones, calorías y macronutrientes, y una pantalla de ajuste deja corregir las
cantidades antes de guardar. En español, claro y oscuro, y **el diario funciona sin
conexión**: lo único que necesita internet es el análisis de la foto y las sugerencias.

Creada el 29-08-2026 de cero, en una sola sesión, sobre el patrón ya probado de
[FORJA](../../../forja-app): un solo `index.html` empaquetado con Capacitor.

## Estado y accesos

| Qué | Dónde |
| --- | --- |
| Carpeta local | `C:\Users\amo\Desktop\Claude\nutrifoto` (clon del repositorio) |
| Repositorio | https://github.com/anmarinoc-sketch/nutrifoto (público, fuente de verdad) |
| Web | https://nutrifoto-three.vercel.app — proyecto `nutrifoto` en Vercel (equipo andres-5ced) |
| APK | https://github.com/anmarinoc-sketch/nutrifoto/releases/download/ultimo/nutrifoto.apk (enlace fijo, sin sesión) |
| CI del APK | `.github/workflows/build-apk.yml` — push a `main` compila y actualiza el release `ultimo` |
| Backend | https://madera-backend.onrender.com — **vive en el repo `maderas-app`, carpeta `backend/`** |
| Servidor local | `node servidor-local.js` → http://localhost:5191 (también en `.claude/launch.json` como `nutrifoto`) |
| Firma | APK **debug**: sirve para instalar a mano y compartir, **no** para Google Play |

`nutrifoto.vercel.app` estaba tomado por otra persona; de ahí el `-three`. Se puede
cambiar en Settings › Domains del proyecto.

## Arquitectura: un solo archivo, y un backend que no es suyo

**Toda la app es `www/index.html`** (~130 KB): HTML, CSS y JavaScript juntos, sin
framework y sin build de front.

```
www/index.html            La app entera
www/vendor/poppins-*.woff2  La tipografía, empaquetada (400/500/600/700, ~31 KB)
www/icons/                192, 512 y 512-maskable
android/                  Proyecto Capacitor generado (no se edita a mano)
capacitor.config.ts       appId com.nutrifoto.app · appName NutriFoto · webDir www
```

**El análisis NO tiene servidor propio.** Se añadió al backend que ya existía para XiloScan
y BioScan, que corre en Render desde el repositorio `maderas-app`:

| Archivo (en `maderas-app/backend/src`) | Qué hace |
| --- | --- |
| `routes/comida.js` | `POST /api/analizar-comida` y `POST /api/sugerir-comida`, con su normalización |
| `lib/prompt-comida.js` | Instrucción y esquema del análisis por foto |
| `lib/gemini-comida.js` | Motor del análisis, con su clave y su cuenta de cuota |
| `lib/prompt-sugerencias.js` | Instrucción y esquema de "¿qué puedo comer?" |
| `lib/gemini-sugerencias.js` | Motor de las sugerencias (misma clave que el análisis) |
| `app.js` | Middleware de **CORS** y la sección `apps.nutrifoto` de `/health` |

Los dos motores se construyen sobre `lib/motor-gemini.js`, que ya existía: rota entre 8
modelos y aparta el que se queda sin cuota hasta la medianoche del Pacífico.

**Si tocas `backend/`, invoca también las skills `xiloscan` y `bioscan`**: comparten
proceso, y Render redespliega el servicio entero.

## Cuota de Gemini

El nivel gratuito da **20 peticiones diarias por modelo Y POR PROYECTO** de Google Cloud.
Por eso cada app tiene su clave de un proyecto distinto:

- `GEMINI_API_KEY` → XiloScan
- `GEMINI_API_KEY_ESPECIES` → BioScan
- `GEMINI_API_KEY_COMIDA` → **NutriFoto** (proyecto propio en AI Studio, creado el 29-08-2026)

Con 8 modelos, eso son ~160 consultas diarias solo para NutriFoto. Comprobarlo desde fuera:

```bash
curl.exe -s https://madera-backend.onrender.com/health
```

En `apps.nutrifoto`: `cuota_propia` debe ser `true`, y `modelos_disponibles` y
`sugerencias_disponibles` van por separado porque **cada motor lleva su propia cuenta**:
la foto puede quedarse sin cuota y las sugerencias seguir vivas.

Render duerme el servicio gratuito tras 15 min sin tráfico: el primer análisis del día
puede tardar hasta un minuto. La app lo dice en pantalla ("Despertando el servidor…").

## Cómo probar un cambio

Es una página web. Servirla por HTTP:

```bash
node "C:\Users\amo\Desktop\Claude\nutrifoto\servidor-local.js"
```

**Probar siempre en el navegador antes de compilar**: el ciclo de Actions son 3-5 minutos.
Para el camino de la foto sin gastar cuota, sustituir `window.fetch` por un doble que
devuelva un `resultado` con la forma del esquema — así se prueba la pantalla de revisión,
el recálculo en vivo y el guardado sin tocar Gemini.

Para probar el backend de verdad sin desplegarlo, arrancarlo en local con una clave falsa:
Gemini responde `CREDENCIAL_INVALIDA` y eso **ya recorre el camino completo** (CORS,
recepción de la imagen, traducción del error y pantalla de fallo de la app).

## Dónde se toca cada cosa

Todo dentro de `www/index.html`, organizado por bloques comentados.

| Lo que pida Andrés | Dónde |
| --- | --- |
| Alimentos de la base, valores por 100 g | La constante `BASE` (~180 filas) y `desdeBase` |
| Medidas caseras (taza, tajada, cucharón) | El último campo de cada fila de `BASE` |
| Liviano/pesado, qué aporta un alimento | `PESOS`, `pesoDe`, `aporteDominante`, `queAporta` |
| Comidas del día y sus horarios sugeridos | `COMIDAS` (id, nombre, hora, ventana) |
| Meta de calorías y macros | `calcularMeta` (Mifflin-St Jeor), `metaVigente` |
| Anillo, barras, restantes | `pintarInicio` |
| Tira de días de la semana | `pintarSemana` |
| Tarjetas del diario, repetir comida | `pintarComidas`, `tarjetaRegistro`, `repetir` |
| Elegir cámara o galería | `pedirFoto`, `#hoja-origen`, `recibirImagen` |
| Contar qué tiene el plato | `pedirDescripcion` |
| Llamada al análisis | `analizarFoto` |
| Pantalla de revisión y ajuste | `pintarRevision`, `filaAlimento`, `guardarRevision` |
| Búsqueda y alimentos propios | `buscarAlimentos`, `pintarBusqueda`, `abrirPorcion` |
| "¿Qué puedo comer?" | `abrirIdeas`, `pintarIdeasInicio`, `pedirIdeas`, `ideasLocales` |
| Gráficas de calorías y peso | `barras`, `linea`, `lienzo`, `pintarProgreso` |
| Perfil, copia de seguridad | `pintarPerfil`, `leerPerfil`, botones de exportar/importar |
| Colores, tipografía | Variables CSS de `:root` y los bloques de tema oscuro |
| Iconos de la app | Regenerar con el script de iconos (cámara + hoja sobre verde) |

Cinco entradas en la barra inferior: **Inicio · Buscar · (cámara) · Progreso · Perfil**.

## Reglas de diseño que hay que mantener

- **Todo alimento guarda sus valores por 100 g**, nunca los de la porción. Es lo que
  permite recalcular al vuelo cuando el usuario cambia la cantidad. Por eso el backend
  añade `por_100g` a cada alimento que devuelve el modelo, y por eso el esquema pide
  `gramos_aproximados` aunque la cantidad venga en tazas o unidades.
- **Los totales se recalculan sumando, en el servidor.** Si el modelo suma mal, manda la
  suma. Lo mismo con la etiqueta liviana/media/pesada de las sugerencias: se deduce de las
  calorías ya sumadas, con umbrales fijos, en vez de preguntársela al modelo.
- **Corregir una porción a mano borra la etiqueta de confianza** del alimento. Deja de ser
  un estimado y pasa a ser un dato del usuario; mantener el "media" sería mentir.
- **Ante la duda, `requiere_confirmacion` es `true`.** El coste de revisar es un toque; el
  de no revisar es un dato falso guardado en el diario.
- **Las fotos van a IndexedDB** (`nutrifoto` → store `fotos`), no a localStorage. Una
  miniatura pesa ~15 KB y el cupo de localStorage (~5 MB) se agotaría en semanas. El resto
  del estado va en localStorage bajo la clave `nutrifoto.v1`.
- **Nada de CDNs.** Poppins está empaquetada en `www/vendor/`. Dentro del APK no hay red
  garantizada, y una tipografía que no carga cambia la app entera de aspecto.
- **Dos inputs de archivo separados**, uno con `capture="environment"` y otro sin él.
  Encender y apagar `capture` sobre el mismo input no es fiable dentro del WebView. Es el
  mismo reparto que hace BioScan en nativo con `TakePicture` y `PickVisualMedia`.
- **Sin permisos de Android.** La cámara la abre la app del sistema y la galería el
  selector de fotos; el manifiesto solo declara INTERNET.
- **Tono neutro.** La app informa, no califica. Ningún alimento es "bueno", "malo",
  "sano" ni "chatarra", y no se felicita ni se regaña por lo que se comió. Está escrito
  así también en los dos prompts, y hay que mantenerlo al tocarlos.
- **Sin diagnósticos.** Ni la app ni los prompts dan indicaciones clínicas.

## Trampas ya pisadas

**1. Quitar HTML y dejar el JavaScript colgando.** Al retirar de la interfaz el ajuste del
servidor y el plan nutricional quedó un `document.getElementById('plan-cerrar').onclick`
apuntando a un elemento que ya no existía. El `TypeError` **rompía el arranque entero**:
no salía la pantalla de bienvenida y la meta aparecía en 0 kcal. Al borrar un bloque de
HTML, buscar siempre todas sus referencias (`grep` del id) antes de dar el cambio por
bueno, y recargar mirando la consola.

**2. Especificidad de CSS en la barra inferior.** `nav.inferior button { color: var(--apagado) }`
le gana a `.fab { color: #fff }`, y el icono de la cámara salía gris sobre el verde. Se
arregla con `nav.inferior button.fab`. Un `svg` sin `width`/`height` explícitos tampoco se
limita solo: se desbordó el icono del calendario hasta ocupar media pantalla.

**3. Las capturas del panel de vista previa engañan.** La animación de entrada de las capas
(`@keyframes sube`) hace que un screenshot tomado a destiempo muestre dos pantallas
superpuestas. No es un fallo de la app: repetir la captura.

**4. `pdf-parse` v2 no exporta una función.** Exporta la clase `PDFParse`
(`new PDFParse({data}).getText()`). Y en este equipo **no hay poppler ni Python**, así que
`Read` sobre un PDF falla: para leer un PDF hay que instalar `pdf-parse` en el scratchpad
y usar Node.

**5. El backend no tenía CORS.** XiloScan y BioScan son nativas y nunca lo necesitaron.
NutriFoto es la primera app web que llama a ese backend; sin las cabeceras, el navegador
bloquea la respuesta y la app dice "no responde" aunque el servidor esté perfecto. El
middleware está en `app.js` y se puede restringir con `ORIGENES_PERMITIDOS`.

## El plan nutricional de Andrés

Tiene un plan de su entrenador **Stiveen Gallego** (Guarne, Antioquia) para hipertrofia:
**2604 kcal**, 351 g de carbohidratos, 120 g de proteína y 80 g de grasa, por
**intercambios** — en cada comida se elige una opción de cada bloque y todas las de un
bloque aportan lo mismo. El PDF está en `C:\Users\amo\Downloads`.

Ese plan **se implementó y luego Andrés pidió quitarlo de la app** (31-08-2026). El código
completo —la constante `PLAN` con sus 84 opciones, la pantalla "Mi plan" y el envío del
plan a las sugerencias— **está en el commit `eeb3761`**. Si vuelve a pedirlo, se recupera
de ahí en vez de rehacerlo.

Dos cosas quedaron pendientes de él:

- El **bloque de proteína del desayuno** es el único que la extracción del PDF no dejó leer
  con certeza (las columnas se mezclaron). Lo demás salió limpio.
- Su plan da **1,46 g de proteína por kilo**, por debajo del rango habitual para
  hipertrofia (1,6-2,2). Se le señaló como observación, sin cambiar nada: el plan es de su
  entrenador, que conoce el caso. Si lo pregunta, es a él a quien debe preguntarle.

Los alimentos que se añadieron a la base por ese plan (feijoa, kiwi, pistacho, avellana,
macadamia, semillas de calabaza, girasol y ajonjolí, trucha) se quedaron: son útiles
igual.

## Trato con el usuario

Andrés trabaja en el sector maderero, no es desarrollador. Ver también las skills
`xiloscan`, `bioscan`, `forja-gym-app` y `misfinanzas`, sus otros proyectos.

- Comandos completos listos para pegar en PowerShell, uno por bloque, con los valores ya
  sustituidos.
- Prefiere que se hagan las cosas por él. Los `git push` los ha autorizado explícitamente
  cada vez; **pedir permiso antes de publicar**, y no dar por hecho que vale para la
  siguiente.
- Manda capturas del teléfono y del navegador: leerlas con atención ahorra iteraciones.
- Decir claramente qué está comprobado y qué es hipótesis.

## Publicar

Un push a `main` dispara las dos cosas a la vez:

- **Web**: Vercel despliega solo. `vercel.json` publica `www/` y sella `__VERSION__` del
  service worker con el commit.
- **APK**: GitHub Actions compila y actualiza el release `ultimo`.

Si el cambio toca `maderas-app/backend/`, **ese es otro repositorio y otro push**, y Render
tarda un par de minutos más. Comprobar con `/health` antes de decirle a Andrés que ya está.

## Pendiente

- **Cuánto acierta de verdad.** Solo se ha probado con imágenes sintéticas y una foto
  dibujada; ante un dibujo el modelo se negó a inventar, que era lo que se quería
  comprobar. Falta medir con fotos reales de platos colombianos y ajustar el prompt si las
  porciones se quedan cortas o largas.
- **Recetas y planificación semanal**: existe "¿qué puedo comer?", pero no hay planificador
  de la semana ni lista de mercado.
- **Escaneo de código de barras** para productos empacados.
- **El logo real.** Los iconos actuales (cámara con hoja sobre verde) los dibujó Claude
  para que pegaran con la paleta; Andrés tiene un logo propio y quedó pendiente que pase el
  archivo para ponerlo tal cual.
