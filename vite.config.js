import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';

/*
 * Panel de administración local ("La escriba").
 * Este plugin SOLO existe con `npm run dev` (apply: 'serve'). En el build de
 * producción no hay endpoints ni código del panel: GitHub Pages solo recibe
 * el sitio estático. Los cambios se guardan en src/content/site.json y se
 * publican con git commit + git push.
 */

const ROOT = process.cwd();
const CONTENT = path.join(ROOT, 'src/content/site.json');
const UPLOADS = path.join(ROOT, 'public/uploads');
const BACKUPS = path.join(ROOT, '.admin-backups');
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.svg']);
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function run(cmd, args) {
  return new Promise((resolve) => {
    execFile(cmd, args, { cwd: ROOT, windowsHide: true, maxBuffer: 1e7 }, (err, stdout, stderr) => {
      resolve({ ok: !err, out: `${stdout || ''}${stderr || ''}`.trim() });
    });
  });
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('El archivo es demasiado grande'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(obj));
}

// Solo peticiones del propio navegador en esta máquina: bloquea otras IPs,
// DNS rebinding (Host) y peticiones cruzadas desde otras webs (Origin).
function isTrusted(req) {
  const ip = req.socket.remoteAddress || '';
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip)) return false;
  const host = (req.headers.host || '').replace(/:\d+$/, '');
  if (!LOCAL_HOSTS.has(host)) return false;
  const origin = req.headers.origin;
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.host) return false;
    } catch {
      return false;
    }
  }
  return req.headers['x-seshat-admin'] === '1';
}

function safeName(name) {
  const ext = path.extname(name).toLowerCase();
  const base = path
    .basename(name, ext)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'imagen';
  return { file: `${Date.now().toString(36)}-${base}${ext}`, ext };
}

async function gitInfo() {
  const repo = await run('git', ['rev-parse', '--is-inside-work-tree']);
  if (!repo.ok) return { repo: false, out: 'Esta carpeta todavía no es un repositorio git.' };
  const [branch, status, remote, log] = await Promise.all([
    run('git', ['rev-parse', '--abbrev-ref', 'HEAD']),
    run('git', ['status', '--short']),
    run('git', ['remote', '-v']),
    run('git', ['log', '-5', '--pretty=format:%h  %ad  %s', '--date=short']),
  ]);
  return { repo: true, branch: branch.out, status: status.out, remote: remote.out, log: log.out };
}

function seshatAdmin() {
  return {
    name: 'seshat-admin',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__admin', async (req, res) => {
        if (!isTrusted(req)) return send(res, 403, { error: 'Acceso solo desde esta máquina.' });
        try {
          const url = new URL(req.url, 'http://localhost');
          const route = `${req.method} ${url.pathname}`;

          if (route === 'GET /content') {
            return send(res, 200, JSON.parse(await fs.readFile(CONTENT, 'utf8')));
          }

          if (route === 'PUT /content') {
            const data = JSON.parse((await readBody(req, 2e6)).toString('utf8'));
            if (!data || !Array.isArray(data.projects) || !data.site) {
              return send(res, 400, { error: 'Contenido inválido: faltan "site" o "projects".' });
            }
            await fs.mkdir(BACKUPS, { recursive: true });
            const stamp = new Date().toISOString().replace(/[:.]/g, '-');
            await fs.copyFile(CONTENT, path.join(BACKUPS, `site-${stamp}.json`)).catch(() => {});
            await fs.writeFile(CONTENT, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
            return send(res, 200, { ok: true });
          }

          if (route === 'POST /upload') {
            const { file, ext } = safeName(url.searchParams.get('name') || 'imagen.png');
            if (!IMAGE_EXT.has(ext)) return send(res, 400, { error: 'Formato no permitido.' });
            const buf = await readBody(req, 10e6);
            await fs.mkdir(UPLOADS, { recursive: true });
            await fs.writeFile(path.join(UPLOADS, file), buf);
            return send(res, 200, { path: `uploads/${file}` });
          }

          if (route === 'GET /git') return send(res, 200, await gitInfo());

          if (route === 'POST /publish') {
            const body = JSON.parse((await readBody(req, 1e4)).toString('utf8') || '{}');
            const message = String(body.message || '').trim().slice(0, 200) || 'Actualiza contenido del sitio';
            const info = await gitInfo();
            if (!info.repo) return send(res, 400, { error: info.out });
            const steps = [];
            const add = await run('git', ['add', '--', 'src/content', 'public/uploads']);
            steps.push(['git add', add]);
            const commit = await run('git', ['commit', '-m', message, '--', 'src/content', 'public/uploads']);
            steps.push(['git commit', commit]);
            const nothing = !commit.ok && /nothing to commit|nada para hacer commit|no changes added/i.test(commit.out);
            if (!commit.ok && !nothing) return send(res, 200, { ok: false, steps });
            const push = await run('git', ['push']);
            steps.push(['git push', push]);
            return send(res, 200, { ok: push.ok, steps });
          }

          return send(res, 404, { error: 'Ruta no encontrada.' });
        } catch (e) {
          return send(res, 500, { error: e.message });
        }
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), seshatAdmin()],
  server: {
    host: 'localhost',
    watch: { ignored: ['**/.admin-backups/**'] },
  },
  build: { chunkSizeWarningLimit: 1000 },
});
