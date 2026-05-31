import { join } from "node:path";

/**
 * Directory where admin/user-uploaded images are stored.
 *
 * Deliberately OUTSIDE `public/`: Next's static handler only serves files
 * that exist in `public/` at *build* time — files written there at runtime
 * (our uploads) are not served by `next start` and 404. So we store uploads
 * here and serve them via `app/uploads/[...path]/route.ts` instead.
 *
 * Override with `UPLOAD_DIR` (e.g. a mounted volume / shared disk). In the
 * Docker image `process.cwd()` is `/app`, so this resolves to `/app/uploads`
 * — keep the compose volume mounted there.
 */
export const UPLOAD_DIR =
  process.env.UPLOAD_DIR ?? join(process.cwd(), "uploads");

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

/** MIME type for a file extension (incl. the dot), or octet-stream. */
export function mimeForExt(ext: string): string {
  return MIME[ext.toLowerCase()] ?? "application/octet-stream";
}
