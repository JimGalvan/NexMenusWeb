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

// Paths that automated scanners constantly probe for. None of these are ever
// legitimate static assets in an Angular build, so we answer them with a plain
// 404 instead of leaking anything or falling through to the SPA index.html.
// Matching is done against a fully (recursively) percent-decoded, lower-cased,
// forward-slash-normalized pathname so encoded variants can't slip past.
const BLOCKED_PATTERNS = [
  /\/\.env\b/, //            .env, .env.save.1, .env.local, .env.production, ...
  /\/\.git(\/|$)/, //        .git/config and anything under .git/
  /\/\.(?!well-known\/)[^/]/, // any other dotfile/dotdir (.htaccess, .ssh, ...)
  /\bwp-admin\b/, //         WordPress admin probes
  /\bwp-login\b/, //         WordPress login probes
  /\.(?:ini|conf|config|cfg|bak|backup|old|sql|sqlite|db|pem|key|crt|p12|htaccess|htpasswd)$/, // config/secret/backup files
  /\.\./, //                 path-traversal attempts
];

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

// Safely turn an incoming request target into a URL object.
//
// We do NOT use `new URL(req.url, 'http://localhost')` (relative resolution):
// a request target beginning with "//" (e.g. "//.env.save.1" or
// "//%2f%2egit%2fconfig") is interpreted by the relative-URL parser as a
// *protocol-relative authority* — i.e. everything after "//" becomes the host.
// Encoded hosts like "%2f%2egit%2fconfig" then fail host validation and throw
// `TypeError: Invalid URL` (ERR_INVALID_URL), which previously crashed the
// process. By concatenating the raw target onto a fixed absolute origin we
// force it to be parsed as the URL *path*, and we still wrap the whole thing in
// try/catch so any other malformed target yields null instead of throwing.
function parseRequestUrl(req) {
  const raw = req.url || '/';
  try {
    const prefix = raw.startsWith('/') ? '' : '/';
    return new URL(`http://localhost${prefix}${raw}`);
  } catch {
    return null;
  }
}

// Returns true if the (decoded) pathname targets a sensitive/scanner path.
function isBlockedPath(pathname) {
  let decoded = pathname;
  try {
    // Recursively decode to defeat single- and double-encoded probes such as
    // "%2egit" or "%252e%252e". decodeURIComponent throws on malformed escapes
    // ("%", "%zz", ...), which are never valid asset paths -> treat as blocked.
    let previous;
    do {
      previous = decoded;
      decoded = decodeURIComponent(decoded);
    } while (decoded !== previous);
  } catch {
    return true;
  }

  // Normalize backslashes to forward slashes and lower-case so the patterns
  // only have to reason about one canonical form.
  const normalized = decoded.replace(/\\/g, '/').toLowerCase();
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(normalized));
}

function staticPathFor(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  // Strip every leading slash/backslash so "//foo" or "////foo" resolve like
  // "/foo" instead of escaping the dist directory, then re-check containment.
  const normalized = path.normalize(decoded).replace(/^([/\\])+/, '');
  const filePath = path.join(DIST_DIR, normalized);
  const relative = path.relative(DIST_DIR, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return filePath;
}

function requestHandler(req, res) {
  // Final safety net: nothing in here is allowed to throw out of the request
  // handler, because an uncaught throw in the 'request' event crashes Node.
  try {
    const requestUrl = parseRequestUrl(req);
    if (!requestUrl) {
      // Malformed request target (bad encoding, illegal characters, etc.).
      sendText(res, 400, 'Bad request.');
      return;
    }

    const qrMatch = requestUrl.pathname.match(/^\/r\/([^/]+)\/?$/);
    if ((req.method === 'GET' || req.method === 'HEAD') && qrMatch) {
      void handleQrRedirect(req, res, qrMatch[1]);
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      sendText(res, 405, 'Method not allowed.');
      return;
    }

    // Block sensitive/scanner paths before any filesystem or SPA handling.
    if (isBlockedPath(requestUrl.pathname)) {
      sendText(res, 404, 'Not found.');
      return;
    }

    const filePath = staticPathFor(requestUrl.pathname);
    if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      serveFile(res, filePath);
      return;
    }

    // SPA fallback: let Angular's client-side router handle unknown routes.
    serveFile(res, INDEX_FILE);
  } catch (error) {
    console.error('[request]', error);
    if (!res.headersSent) {
      sendText(res, 500, 'Internal server error.');
    } else {
      res.end();
    }
  }
}

if (require.main === module) {
  const server = http.createServer(requestHandler);

  // Malformed HTTP at the protocol level (bad request line/headers) fires
  // 'clientError' rather than reaching requestHandler. Respond with 400 and
  // close instead of letting the default behavior surface as noise/crashes.
  server.on('clientError', (err, socket) => {
    if (socket.writable) {
      socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
    }
  });

  server.listen(PORT, () => {
    console.log(`[server] listening on ${PORT}`);
  });
}

module.exports = {
  frontendOrigin,
  rewriteRedirectLocation,
  requestHandler,
  parseRequestUrl,
  isBlockedPath,
};
