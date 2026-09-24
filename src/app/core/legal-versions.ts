/**
 * Versions of the published legal documents, as ISO dates.
 *
 * These are the single source of truth for both the "Last updated" line the
 * legal pages print and the version recorded against an account at signup. The
 * two can never disagree, which is the whole point: the stored version is only
 * evidence if it names the text the user actually had on screen.
 *
 * Bump the date here whenever the corresponding page's wording changes.
 */
export const LEGAL_VERSIONS = {
  terms: '2026-08-04',
  privacy: '2026-09-23',
} as const;

/**
 * An ISO version rendered the way the legal pages display it, e.g.
 * "August 4, 2026". Formatted in UTC so the date shown never slips a day for
 * readers west of Greenwich.
 */
export function formatLegalVersion(version: string): string {
  return new Date(`${version}T00:00:00Z`).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
