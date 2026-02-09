// Shared slugify utility (SSR-safe, pure function)
// - Normalizes to NFD, strips diacritics, lowercases, trims
// - Replaces non [a-z0-9] with hyphens, collapses multiple hyphens
// - Trims leading/trailing hyphens
export function slugify(input: string | undefined | null): string {
  const value = (input ?? '').toString();
  if (!value) return '';
  let v = value
    .normalize('NFD')
    // Remove combining diacritical marks
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  // Replace non-alphanumeric with hyphens
  v = v.replace(/[^a-z0-9]+/g, '-');
  // Collapse multiple hyphens
  v = v.replace(/-+/g, '-');
  // Trim hyphens at ends
  v = v.replace(/^-+|-+$/g, '');
  return v;
}
export function normalizeName(input: string | undefined | null): string {
  const value = (input ?? '').toString();
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
