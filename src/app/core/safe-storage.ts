/**
 * localStorage facade that no-ops during server-side rendering, where the
 * Web Storage API doesn't exist. Sessions and theming are browser-only
 * concerns; the server always renders the anonymous/default view.
 */
export const safeStorage = {
  getItem(key: string): string | null {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  },
  setItem(key: string, value: string): void {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  },
  removeItem(key: string): void {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  },
};
