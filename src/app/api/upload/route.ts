import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { randomBytes } from "node:crypto";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

/**
 * Authenticated image upload — writes files to `public/uploads/` and
 * returns the public URL. Any signed-in user can upload (avatars on
 * /account); ADMIN/CTV use it for article covers + branding too.
 *
 * Trade-offs:
 *  - Local disk; works in dev + single-server prod. For multi-instance
 *    deploys swap the body for `@vercel/blob` / S3 / Cloudinary —
 *    keep the same return shape.
 *  - Filename = random 8-byte hex + original extension. Safe; not
 *    user-controllable.
 *  - 5 MB ceiling; PNG / JPG / WEBP / AVIF / GIF / SVG allowed.
 *  - Every upload is audit-logged (action=UPLOAD, actor=userId); spot
 *    abuse there and deactivate the user.
 */

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/svg+xml",
]);

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `unsupported_type: ${file.type}` },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `too_large: ${file.size} > ${MAX_BYTES}` },
      { status: 413 },
    );
  }

  const ext = (extname(file.name) || "").toLowerCase().slice(0, 6);
  const safeExt = /^\.[a-z0-9]+$/.test(ext) ? ext : ".bin";
  const filename = `${randomBytes(8).toString("hex")}${safeExt}`;

  const dir = join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, filename), Buffer.from(await file.arrayBuffer()));

  const publicUrl = `/uploads/${filename}`;
  await logAudit({
    actorId: session.user.id,
    action: "UPLOAD",
    target: publicUrl,
    meta: { type: file.type, size: file.size, originalName: file.name },
  });

  return NextResponse.json({ ok: true, url: publicUrl });
}
