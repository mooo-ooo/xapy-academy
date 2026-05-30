import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { routing } from "@/i18n/routing";

const bodySchema = z.object({
  locale: z.enum(routing.locales as unknown as [string, ...string[]]),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_locale" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { preferredLang: parsed.data.locale },
  });

  return NextResponse.json({ ok: true, locale: parsed.data.locale });
}
