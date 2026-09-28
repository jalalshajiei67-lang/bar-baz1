/**
 * Name matching for the search boxes. Safe to import from client components.
 */

/** Folds the spellings a phone keyboard mixes up, so "علي" finds "علی". */
export function searchable(text: string): string {
  return text
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[‌\s]+/g, "")
    .toLowerCase();
}

/** Whether `name` contains `query`, ignoring those spelling differences. */
export function matches(name: string, query: string): boolean {
  return searchable(name).includes(searchable(query));
}
