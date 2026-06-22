// Generates src/environments/environment.prod.ts from build-time env vars.
// Runs automatically before `npm run build` (via the "prebuild" hook), so on
// Railway you only need to set API_BASE_URL (and optionally API_VERSION) in the
// service variables — the value gets baked into the production bundle.
//
// Locally, if API_BASE_URL is unset it falls back to '' (the current default),
// so running `npm run build` without the var produces no git churn.

const fs = require('fs');
const path = require('path');

const apiBaseUrl = process.env.API_BASE_URL ?? '';
const apiVersion = process.env.API_VERSION ?? 'v1';

const target = path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts');

const contents = `export const apiVersion1 = '${apiVersion}';

export const environment = {
  production: true,
  apiBaseUrl: '${apiBaseUrl}',
  apiVersion: apiVersion1,
};
`;

fs.writeFileSync(target, contents);
console.log(`[set-env] wrote ${path.relative(process.cwd(), target)} (apiBaseUrl='${apiBaseUrl}', apiVersion='${apiVersion}')`);
