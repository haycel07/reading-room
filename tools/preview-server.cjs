// Static development/test server. No provider proxy, credentials, or Codex execution.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../dist');
const types = {'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.wasm':'application/wasm'};
function createPreviewServer() {
  return http.createServer((req, res) => {
    let relative;
    try { relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
    catch { res.writeHead(400).end(); return; }
    const file = path.resolve(root, '.' + (relative === '/' ? '/index.html' : relative));
    if (!file.startsWith(root + path.sep) || !['GET','HEAD'].includes(req.method)) { res.writeHead(403).end(); return; }
    fs.stat(file, (error, stat) => {
      if (error || !stat.isFile()) { res.writeHead(404).end(); return; }
      res.writeHead(200, {'Content-Type':types[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
      if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
    });
  });
}
if (require.main === module) {
  const port = Number(process.env.PORT || 38751);
  createPreviewServer().listen(port, '127.0.0.1', () => console.log('Static reader: http://127.0.0.1:' + port));
}
module.exports = {createPreviewServer};
