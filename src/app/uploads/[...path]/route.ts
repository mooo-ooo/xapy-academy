import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { UPLOAD_DIR, mimeForExt } from "@/lib/uploads";

/**
 * Serves admin/user-uploaded images from `UPLOAD_DIR`.
 *
 * Why a route handler instead of `public/`: `next start` does not serve
 * files added to `public/` after build, so runtime uploads 404. We store
 * them outside `public/` (lib/uploads.ts) and stream them here. URLs stay
 * `/uploads/<name>`, so existing DB values keep working unchanged.
 */
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  const base = resolve(UPLOAD_DIR);
  const abs = resolve(base, (path ?? []).join("/"));

  // Path-traversal guard: the resolved path must stay inside UPLOAD_DIR.
  if (abs !== base && !abs.startsWith(base + sep)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const info = await stat(abs);
    if (!info.isFile()) return new Response("Not found", { status: 404 });

    const ext = extname(abs).toLowerCase();
    const headers: Record<string, string> = {
      "content-type": mimeForExt(ext),
      // Filenames are random hex (content never changes under a name).
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    };
    // Neutralize scripts inside user-uploaded SVGs if opened directly.
    if (ext === ".svg") {
      headers["content-security-policy"] =
        "default-src 'none'; style-src 'unsafe-inline'; sandbox";
    }

    return new Response(await readFile(abs), { headers });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
