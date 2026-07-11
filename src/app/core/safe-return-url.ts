/**
 * Only ever continue to an internal path after login/registration — a
 * returnUrl query param is attacker-controllable, so external and
 * protocol-relative URLs fall back to the app home.
 */
export function safeReturnUrl(returnUrl: string | null): string {
  if (returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//') && !returnUrl.includes('\\')) {
    return returnUrl;
  }
  return '/app';
}
