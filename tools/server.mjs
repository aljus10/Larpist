import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const automaticPort = process.argv[2] === undefined;
let port = Number(process.argv[2] || 8765);
const lastPort = automaticPort ? port + 20 : port;
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json', '.csv':'text/csv; charset=utf-8', '.txt':'text/plain; charset=utf-8', '.webp':'image/webp', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.ttf':'font/ttf', '.glb':'model/gltf-binary', '.mp3':'audio/mpeg', '.wav':'audio/wav' };

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, `http://127.0.0.1:${port}`).pathname);
    const path = resolve(root, '.' + pathname, pathname.endsWith('/') ? 'index.html' : '');
    if (path !== root && !path.startsWith(root + sep)) { response.writeHead(403).end(); return; }
    const info = await stat(path);
    if (!info.isFile()) { response.writeHead(404).end(); return; }
    const content = await readFile(path);
    response.writeHead(200, { 'Content-Type': mime[extname(path).toLowerCase()] || 'application/octet-stream', 'Content-Length': content.length, 'Cache-Control':'no-store' });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch { response.writeHead(404).end('File not found'); }
});

server.on('error', error => {
  if (error.code === 'EADDRINUSE' && automaticPort && port < lastPort) {
    process.stdout.write(`Port ${port} is busy. Trying ${port + 1}...\n`);
    port += 1;
    server.listen(port, '127.0.0.1');
    return;
  }
  process.stderr.write(error.code === 'EADDRINUSE'
    ? `Port ${port} is already in use. Close the previous server or run: node tools/server.mjs ${port + 1}\n`
    : `The local server could not start: ${error.message}\n`);
  process.exitCode = 1;
});
server.on('listening', () => {
  const url = `http://127.0.0.1:${port}/`;
  process.stdout.write(`EarthTune Studio is running at ${url}\nKeep this window open (you can minimize it). Close it to stop the server.\nIf your browser does not open, copy the URL above into Chrome or Opera.\n`);
  if (process.platform === 'win32' && automaticPort) {
    execFile('cmd.exe', ['/d', '/c', 'start', '""', url], { windowsHide: true }, error => {
      if (error) process.stderr.write(`Could not open the browser automatically. Open ${url} manually.\n`);
    });
  }
});
server.listen(port, '127.0.0.1');
