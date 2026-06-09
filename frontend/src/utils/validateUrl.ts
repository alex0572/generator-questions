/** Проверяет адрес сайта, включая кириллические домены (.рф и т.д.). */
export function isValidSiteAddress(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || /\s/.test(trimmed)) return false;

  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const { hostname } = new URL(withScheme);
    return hostname.includes(".");
  } catch {
    return /^[^\s/]+\.[^\s/]+/.test(trimmed);
  }
}
