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

// Canonical host: 301 www.nexmenus.com -> nexmenus.com so Google doesn't
// index the site under two hostnames.
app.use((req, res, next) => {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '');
  if (host.toLowerCase() === 'www.nexmenus.com') {
    res.redirect(301, `https://nexmenus.com${req.originalUrl}`);
    return;
  }
  next();
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

// ---- sitemap ----

const SITE_URL = 'https://nexmenus.com';

// Static, always-present pages. Menu URLs are appended from the API.
const STATIC_SITEMAP_ENTRIES: { path: string; changefreq: string; priority: string }[] = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/ai-menu-generator', changefreq: 'weekly', priority: '0.9' },
  { path: '/blog', changefreq: 'monthly', priority: '0.5' },
  { path: '/blog/best-ai-menu-generator', changefreq: 'monthly', priority: '0.7' },
  { path: '/blog/how-to-make-free-digital-menu-for-your-restaurant', changefreq: 'monthly', priority: '0.7' },
  { path: '/blog/how-to-make-free-qr-code-menu-for-your-restaurant', changefreq: 'monthly', priority: '0.7' },
  { path: '/blog/how-to-start-restaurant-california', changefreq: 'monthly', priority: '0.7' },
  { path: '/blog/how-to-print-menus-for-restaurants', changefreq: 'monthly', priority: '0.7' },
  { path: '/blog/how-to-create-a-restaurant-menu', changefreq: 'monthly', priority: '0.7' },
  { path: '/pricing', changefreq: 'monthly', priority: '0.8' },
  { path: '/terms', changefreq: 'yearly', priority: '0.2' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.2' },
];

const SITEMAP_TTL_MS = 60 * 60 * 1000;
let sitemapCache: { xml: string; expires: number } | null = null;

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function buildSitemap(): Promise<string> {
  const urls = STATIC_SITEMAP_ENTRIES.map(
    (e) =>
      `  <url>\n    <loc>${SITE_URL}${e.path}</loc>\n` +
      `    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`,
  );

  // Menu pages come from the API; if it's unreachable the sitemap simply
  // degrades to the static pages rather than failing the request.
  const apiBaseUrl = (process.env['API_BASE_URL'] || '').replace(/\/$/, '');
  if (apiBaseUrl) {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/public/menus/slugs`, {
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) {
        const menus = (await res.json()) as { slug: string; updatedAt?: string }[];
        for (const menu of menus) {
          if (!menu.slug) continue;
          const lastmod = menu.updatedAt ? `    <lastmod>${menu.updatedAt.slice(0, 10)}</lastmod>\n` : '';
          urls.push(
            `  <url>\n    <loc>${SITE_URL}/m/${xmlEscape(encodeURIComponent(menu.slug))}</loc>\n` +
              `${lastmod}    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`,
          );
        }
      } else {
        console.error('[sitemap] slug feed returned', res.status);
      }
    } catch (error) {
      console.error('[sitemap]', error);
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

app.get('/sitemap.xml', (req, res) => {
  void (async () => {
    if (!sitemapCache || sitemapCache.expires < Date.now()) {
      sitemapCache = { xml: await buildSitemap(), expires: Date.now() + SITEMAP_TTL_MS };
    }
    res.type('application/xml').setHeader('Cache-Control', 'public, max-age=3600').send(sitemapCache.xml);
  })();
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
