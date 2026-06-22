const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const PORT = Number(process.env.PORT || 3000);
const DIST_DIR = path.join(__dirname, 'dist', 'NexMenus', 'browser');
const INDEX_FILE = path.join(DIST_DIR, 'index.html');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
};

function frontendOrigin(req) {
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

function rewriteRedirectLocation(req, apiBaseUrl, location) {
  const target = new URL(location, apiBaseUrl);
  return `${frontendOrigin(req)}${target.pathname}${target.search}${target.hash}`;
}

async function handleQrRedirect(req, res, id) {
  const apiBaseUrl = (process.env.API_BASE_URL || '').replace(/\/$/, '');
  if (!apiBaseUrl) {
    sendText(res, 500, 'API_BASE_URL is required for QR redirects.');
    return;
  }

  try {
    const apiUrl = `${apiBaseUrl}/r/${encodeURIComponent(id)}/`;
    const apiRes = await fetch(apiUrl, { method: 'GET', redirect: 'manual' });
    const location = apiRes.headers.get('location');

    if (apiRes.status >= 300 && apiRes.status < 400 && location) {
      redirect(res, rewriteRedirectLocation(req, apiBaseUrl, location));
      return;
    }

    sendText(res, apiRes.status === 404 ? 404 : 502, 'Menu redirect unavailable.');
  } catch (error) {
    console.error('[qr-redirect]', error);
    sendText(res, 502, 'Menu redirect unavailable.');
  }
}

function redirect(res, location) {
  res.writeHead(302, {
    Location: location,
    'Cache-Control': 'no-store',
  });
  res.end();
}

function sendText(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(body);
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
  });
  fs.createReadStream(filePath).pipe(res);
}

function staticPathFor(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const normalized = path.normalize(decoded).replace(/^([/\\])+/, '');
  const filePath = path.join(DIST_DIR, normalized);
  const relative = path.relative(DIST_DIR, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return filePath;
}

function requestHandler(req, res) {
  const requestUrl = new URL(req.url || '/', 'http://localhost');
  const qrMatch = requestUrl.pathname.match(/^\/r\/([^/]+)\/?$/);

  if ((req.method === 'GET' || req.method === 'HEAD') && qrMatch) {
    void handleQrRedirect(req, res, qrMatch[1]);
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendText(res, 405, 'Method not allowed.');
    return;
  }

  const filePath = staticPathFor(requestUrl.pathname);
  if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    serveFile(res, filePath);
    return;
  }

  serveFile(res, INDEX_FILE);
}

if (require.main === module) {
  http.createServer(requestHandler).listen(PORT, () => {
    console.log(`[server] listening on ${PORT}`);
  });
}

module.exports = { frontendOrigin, rewriteRedirectLocation, requestHandler };

