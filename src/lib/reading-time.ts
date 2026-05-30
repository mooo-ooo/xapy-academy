/**
 * Compute reading time in minutes from MDX/Markdown body.
 *
 * Strips code fences, inline code, links/headings/blockquotes/list
 * markers before counting words. Floors below 1 to 1 so a one-liner
 * still reads "1 min" — never "0 min".
 *
 * 200 wpm is the conventional reading-speed assumption used by Medium,
 * Hashnode, dev.to. Keeps numbers comparable to the target site.
 */
export function countWordsInMdx(bodyMdx: string): number {
  if (!bodyMdx) return 0;

  const stripped = bodyMdx
    .replace(/```[\s\S]*?```/g, " ") // fenced code
    .replace(/`[^`]+`/g, " ") // inline code
    .replace(/\!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links → keep label
    .replace(/^#{1,6}\s+/gm, "") // heading hashes
    .replace(/^[>\-*+]\s+/gm, "") // blockquote / bullet markers
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/<[^>]+>/g, " ");

  return stripped.trim().split(/\s+/).filter(Boolean).length;
}

export function computeReadingTimeMinutes(bodyMdx: string): number {
  if (!bodyMdx) return 1;
  return Math.max(1, Math.ceil(countWordsInMdx(bodyMdx) / 200));
}
