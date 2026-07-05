import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import type { Request, Response } from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();

// SSRF guard: SSR only accepts requests whose Host header matches one of
// these. Extra hosts (e.g. a Railway preview domain) can be added via the
// comma-separated ALLOWED_HOSTS env var. Proxy headers are trusted because
// the app always sits behind Railway's edge proxy in production.
const allowedHosts = [
  'nexmenus.com',
  'www.nexmenus.com',
  'localhost',
  ...(process.env['ALLOWED_HOSTS']?.split(',').map((h) => h.trim()).filter(Boolean) ?? []),
];

const angularApp = new AngularNodeAppEngine({
  allowedHosts,
  trustProxyHeaders: true,
});

// Paths that automated scanners constantly probe for. None of these are ever
// legitimate routes or assets, so answer with a plain 404 instead of leaking
// anything or spending an SSR render on them. Matching is done against a fully
// (recursively) percent-decoded, lower-cased, forward-slash-normalized
// pathname so encoded variants can't slip past.
const BLOCKED_PATTERNS = [
  /\/\.env\b/, //            .env, .env.save.1, .env.local, .env.production, ...
  /\/\.git(\/|$)/, //        .git/config and anything under .git/
  /\/\.(?!well-known\/)[^/]/, // any other dotfile/dotdir (.htaccess, .ssh, ...)
  /\bwp-admin\b/, //         WordPress admin probes
  /\bwp-login\b/, //         WordPress login probes
  /\.(?:ini|conf|config|cfg|bak|backup|old|sql|sqlite|db|pem|key|crt|p12|htaccess|htpasswd)$/, // config/secret/backup files
  /\.\./, //                 path-traversal attempts
];

function isBlockedPath(pathname: string): boolean {
  let decoded = pathname;
  try {
    // Recursively decode to defeat single- and double-encoded probes such as
    // "%2egit" or "%252e%252e". decodeURIComponent throws on malformed escapes
    // ("%", "%zz", ...), which are never valid paths -> treat as blocked.
    let previous;
    do {
      previous = decoded;
      decoded = decodeURIComponent(decoded);
    } while (decoded !== previous);
  } catch {
    return true;
  }
  const normalized = decoded.replace(/\\/g, '/').toLowerCase();
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(normalized));
}

function frontendOrigin(req: Request): string {
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

function rewriteRedirectLocation(req: Request, apiBaseUrl: string, location: string): string {
  const target = new URL(location, apiBaseUrl);
  return `${frontendOrigin(req)}${target.pathname}${target.search}${target.hash}`;
}

// QR-code short links: resolve /r/:id against the API and bounce the diner to
// the menu on this frontend's own origin.
async function handleQrRedirect(req: Request, res: Response, id: string): Promise<void> {
  const apiBaseUrl = (process.env['API_BASE_URL'] || '').replace(/\/$/, '');
  if (!apiBaseUrl) {
    res.status(500).type('text/plain').send('API_BASE_URL is required for QR redirects.');
    return;
  }

  try {
    const apiUrl = `${apiBaseUrl}/r/${encodeURIComponent(id)}/`;
    const apiRes = await fetch(apiUrl, { method: 'GET', redirect: 'manual' });
    const location = apiRes.headers.get('location');

    if (apiRes.status >= 300 && apiRes.status < 400 && location) {
      res.redirect(302, rewriteRedirectLocation(req, apiBaseUrl, location));
      return;
    }

    res
      .status(apiRes.status === 404 ? 404 : 502)
      .type('text/plain')
      .send('Menu redirect unavailable.');
  } catch (error) {
    console.error('[qr-redirect]', error);
    res.status(502).type('text/plain').send('Menu redirect unavailable.');
  }
}

app.get(/^\/r\/([^/]+)\/?$/, (req, res) => {
  void handleQrRedirect(req, res, req.params[0]);
});

app.use((req, res, next) => {
  if (isBlockedPath(req.path)) {
    res.status(404).type('text/plain').send('Not found.');
    return;
  }
  next();
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
