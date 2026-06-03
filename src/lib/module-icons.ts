export const FALLBACK_ICON = "globe";

export function normalizeIconName(name: string | null | undefined): string {
  if (!name) return FALLBACK_ICON;
  const trimmed = name.trim();
  if (!trimmed) return FALLBACK_ICON;
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmed)) return trimmed;
  return trimmed
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Za-z])([0-9])/g, "$1-$2")
    .toLowerCase();
}
