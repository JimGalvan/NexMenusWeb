/**
 * The API's plan-limit refusal (403 MENU_LIMIT_REACHED), whatever else went
 * wrong. Anything that creates a menu can hit this — the menus page's create
 * form and the claim page both do — and it needs its own answer: retrying will
 * never work, so the caller has to offer room instead of an error.
 */
export function isMenuLimitError(err: unknown): boolean {
  const error = err as { status?: number; error?: { code?: string } };
  return error?.status === 403 && error?.error?.code === 'MENU_LIMIT_REACHED';
}
