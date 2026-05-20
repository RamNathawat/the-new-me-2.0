import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { resolve, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIME = {
  '.html':'text/html','.css':'text/css','.js':'application/javascript',
  '.json':'application/json','.gltf':'model/gltf+json',
  '.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png',
  '.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff'
};

createServer((req, res) => {
  let url = req.url.split('?')[0];
  if (url === '/') url = '/index.html';
  const filePath = resolve(__dirname, '.' + url);
  // Try public dir too
  const publicPath = resolve(__dirname, 'public', '.' + url.replace(/^\//, ''));

  let target = filePath;
  if (!existsSync(filePath) && existsSync(publicPath)) target = publicPath;

  try {
    const data = readFileSync(target);
    const ext = extname(target);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(3000, '127.0.0.1', () => {
  console.log('🌿 The New Me 2.0 — http://localhost:3000');
});
