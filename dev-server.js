// Local preview: serves public/ and the api/ handlers the way Vercel does.
//   npm run dev                         -> sample data, no passcode
//   HUB_PASSCODE=test npm run dev       -> passcode gate on, still sample data
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const PORT = Number(process.env.PORT || 3000);
const ROOT = new URL('./public/', import.meta.url).pathname;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json',
};

http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  if (pathname.startsWith('/api/')) {
    try {
      const mod = await import(`./api/${pathname.slice(5).replace(/[^a-z-]/g, '')}.js`);
      return await mod.default(req, res);
    } catch {
      res.statusCode = 404;
      return res.end('Not found');
    }
  }
  const file = normalize(join(ROOT, pathname === '/' ? 'index.html' : pathname));
  if (!file.startsWith(ROOT)) { res.statusCode = 403; return res.end(); }
  try {
    const body = await readFile(file);
    res.setHeader('Content-Type', TYPES[extname(file)] || 'application/octet-stream');
    res.end(body);
  } catch {
    res.statusCode = 404;
    res.end('Not found');
  }
}).listen(PORT, () => console.log(`AI Hub on http://localhost:${PORT}`));
