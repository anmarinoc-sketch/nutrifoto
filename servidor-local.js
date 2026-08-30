// Servidor estático mínimo para probar la app en el navegador antes de compilar el APK.
// Se usa con:  node servidor-local.js
const http = require('http'), fs = require('fs'), path = require('path');
const TIPOS = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8', '.png':'image/png',
};
http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  const archivo = path.join(__dirname, 'www', rel === '/' ? 'index.html' : rel);
  fs.readFile(archivo, (err, data) => {
    if (err) { res.writeHead(404); return res.end('no encontrado'); }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(archivo)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(5191, () => console.log('NutriFoto en http://localhost:5191'));
