# NutriFoto

App para registrar lo que comes con una foto: la IA estima los alimentos, las porciones,
las calorías y los macronutrientes, y tú ajustas lo que no cuadre antes de guardar.

Toda la app es un único archivo, `www/index.html`, sin framework ni compilación. Se
publica en dos sitios con cada push, igual que FORJA: la web en Vercel y el APK en el
release `ultimo` del repositorio.

## Qué hace

- **Foto → calorías.** Botón de cámara siempre visible. La foto se reduce en el teléfono
  y se envía al backend, que le pregunta a Gemini y devuelve alimentos, porciones,
  calorías, macros y un nivel de confianza por alimento.
- **Pantalla de ajuste.** Cambiar cantidades (gramos o medidas caseras), borrar lo que la
  IA vio de más, agregar lo que no vio. Todo se recalcula al instante. Es opcional: si el
  estimado sirve, se guarda de una.
- **Diario del día** por comidas (desayuno, media mañana, almuerzo, onces, cena), con
  anillo de calorías, barras de macros, historial por fecha y botón de "repetir".
- **Búsqueda manual** sobre una base de ~170 alimentos con preparaciones colombianas
  (arepa, fríjoles con garra, sancocho, bandeja paisa, patacón, buñuelo…), más los
  alimentos propios que crees tú.
- **Perfil y metas.** La meta diaria se calcula con Mifflin-St Jeor y se puede editar a
  mano. Registro de peso con gráfica.
- **Sin conexión.** El diario, la búsqueda y el historial funcionan offline. Lo único que
  necesita internet es el análisis de la foto.

## Dónde está cada cosa

| Qué | Dónde |
| --- | --- |
| Toda la app | `www/index.html` |
| Iconos y manifiesto (PWA) | `www/icons/`, `www/manifest.json`, `www/sw.js` |
| Proyecto Android (Capacitor) | `android/` — generado, no se edita a mano |
| Compilación del APK | `.github/workflows/build-apk.yml` |
| Publicación web | `vercel.json` |
| Servidor de análisis | `maderas-app/backend`, endpoint `POST /api/analizar-comida` |

## Probar en el computador

```
node servidor-local.js
```

y abrir <http://localhost:5191>. El análisis por foto necesita que el backend esté
desplegado; el resto funciona igual en local.

## Publicar

Cada push a `main` dispara dos cosas:

1. GitHub Actions compila el APK y lo deja en el release `ultimo` del repositorio, en un
   enlace fijo que se puede abrir desde el celular.
2. Vercel publica la web.

## Lo que hay que saber del backend

El análisis vive en el backend que ya tienes en Render (`madera-backend`), compartido con
XiloScan y BioScan. Dos cosas importan:

- **La cuota.** El nivel gratuito de Gemini da 20 consultas diarias por modelo, y el
  backend rota entre 8. Si NutriFoto no tiene su propia `GEMINI_API_KEY_COMIDA`, esas
  ~160 consultas se reparten entre las tres apps.
- **CORS.** NutriFoto es la primera app web que llama a ese backend; XiloScan y BioScan
  son nativas y no pasan por CORS. Si algún día el análisis deja de funcionar en la web
  pero el `/health` responde desde el navegador, mirar ahí.

Para comprobar el estado del análisis desde cualquier parte:

```
curl.exe -s https://madera-backend.onrender.com/health
```

En la respuesta, `apps.nutrifoto` dice cuántos modelos quedan con cuota y si la app tiene
clave propia.

## Lo que todavía no está

Las funciones de recetas y planificación (sugerir qué cocinar con lo que queda del día o
con los ingredientes que hay en casa, planificador semanal y lista de mercado) y el
escaneo de código de barras. Van en la siguiente iteración.
