export const apiVersion1 = 'v1';
export const apiVersion2 = 'v2';

export const environment = {
  production: false,
  // Empty so requests hit the relative /api path and are forwarded to the API
  // (http://localhost:8080) by the dev proxy in proxy.conf.json — avoids CORS.
  apiBaseUrl: 'http://localhost:8080',
  apiVersion: apiVersion1,
  apiVersionV2: apiVersion2,
  supportEmail: '',
};
