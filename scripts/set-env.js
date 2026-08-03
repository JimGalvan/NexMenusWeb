// Generates src/environments/environment.prod.ts from build-time env vars.
// Runs automatically before `npm run build` (via the "prebuild" hook), so on
// Railway you only need to set API_BASE_URL, SUPPORT_EMAIL (and optionally
// API_VERSION) in the service variables. The values get baked into the
// production bundle.
//
// Locally, if API_BASE_URL and SUPPORT_EMAIL are unset they fall back to ''
// (the current default), so running `npm run build` without vars produces no
// git churn.

const fs = require('fs');
const path = require('path');

const apiBaseUrl = process.env.API_BASE_URL ?? '';
const menuBuilderApiBaseUrl = process.env.MENU_BUILDER_API_BASE_URL ?? apiBaseUrl;
const apiVersion = process.env.API_VERSION ?? 'v1';
const apiVersionV2 = process.env.API_VERSION_V2 ?? 'v2';
const supportEmail = process.env.SUPPORT_EMAIL ?? '';
const upgradeUrl = process.env.UPGRADE_URL ?? '';

const target = path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts');

const contents = `export const apiVersion1 = ${JSON.stringify(apiVersion)};
export const apiVersion2 = ${JSON.stringify(apiVersionV2)};

export const environment = {
  production: true,
  apiBaseUrl: ${JSON.stringify(apiBaseUrl)},
  menuBuilderApiBaseUrl: ${JSON.stringify(menuBuilderApiBaseUrl)},
  apiVersion: apiVersion1,
  apiVersionV2: apiVersion2,
  supportEmail: ${JSON.stringify(supportEmail)},
  upgradeUrl: ${JSON.stringify(upgradeUrl)},
};
`;

fs.writeFileSync(target, contents);
console.log(
  `[set-env] wrote ${path.relative(process.cwd(), target)} (apiBaseUrl='${apiBaseUrl}', apiVersion='${apiVersion}', apiVersionV2='${apiVersionV2}', supportEmail='${supportEmail}', upgradeUrl='${upgradeUrl || '(mailto fallback)'}')`,
);
