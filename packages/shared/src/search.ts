/**
 * Normalizes a search term the same way the DB fills `searchText` (lower + unaccent),
 * so "Hóa học", "hoa hoc" and "HOA HỌC" all match. Collapses spaces; returns '' for blank input.
 */
export function normalizeSearch(term: string): string {
  return term
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Words to match against `searchText`, each as " word" so it matches the start of a word
 * ("hoa" finds "Hóa học", not "khóa học"). LIKE wildcards are escaped. All words must match.
 */
export function searchWords(term: string): string[] {
  return normalizeSearch(term)
    .split(' ')
    .filter(Boolean)
    .slice(0, 8)
    .map((word) => ` ${word.replace(/[\\%_]/g, '\\$&')}`);
}

/** "Hóa học 10" -> "hoa-hoc-10": suggested slug for categories, subjects and courses. */
export function toSlug(text: string): string {
  return normalizeSearch(text)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
