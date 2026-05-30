/**
 * Real-like smoke. Validates the server-backed flow we just shipped.
 *
 * 1. Guest GET /api/likes/:id  → liked:false, isAuthenticated:false
 * 2. Guest POST /api/likes/:id → 401 unauthorized
 * 3. Authed POST → liked:true, count bumps by 1
 * 4. Authed POST again (same user) → idempotent: liked:true, count unchanged
 * 5. Authed DELETE → liked:false, count back down
 * 6. Authed DELETE again → idempotent: count unchanged at the new value
 */

import { chromium, type APIRequestContext } from "playwright";
import { PrismaClient } from "@prisma/client";

const BASE = "http://localhost:3000";
const ADMIN_EMAIL = "admin@academy.local";
const ADMIN_PASSWORD = process.env.SMOKE_PASSWORD ?? "";
if (!ADMIN_PASSWORD) {
  console.error("Set SMOKE_PASSWORD.");
  process.exit(2);
}

let failed = 0;
function check(label: string, ok: boolean, extra = "") {
  console.log(`${ok ? "✓" : "✗"} ${label}${extra ? " — " + extra : ""}`);
  if (!ok) failed++;
}

async function loginAsAdmin(req: APIRequestContext) {
  // Pull CSRF token first.
  const csrf = await req.get(`${BASE}/api/auth/csrf`);
  const csrfBody = (await csrf.json()) as { csrfToken: string };
  const form = new URLSearchParams({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    csrfToken: csrfBody.csrfToken,
    callbackUrl: `${BASE}/en/academy`,
    json: "true",
  });
  const resp = await req.post(
    `${BASE}/api/auth/callback/credentials`,
    {
      data: form.toString(),
      headers: { "content-type": "application/x-www-form-urlencoded" },
    },
  );
  if (resp.status() >= 400) {
    throw new Error(
      `login failed ${resp.status()}: ${await resp.text().catch(() => "")}`,
    );
  }
}

async function findArticleId(): Promise<string> {
  // Query DB directly — the article id isn't rendered into HTML by
  // default, and that's fine. The smoke runs as a node script so
  // Prisma is just sitting here.
  const prisma = new PrismaClient();
  try {
    const tr = await prisma.articleTranslation.findUnique({
      where: { locale_slug: { locale: "en", slug: "delta-explained" } },
      select: { articleId: true },
    });
    if (!tr) throw new Error("delta-explained article missing — re-seed");
    return tr.articleId;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const browser = await chromium.launch();

  // Guest context
  const guest = await browser.newContext();
  const articleId = await findArticleId();
  check("Resolved article id from HTML", articleId.length > 10, articleId);

  // 1. Guest GET
  const g1 = await guest.request.get(`${BASE}/api/likes/${articleId}`);
  const g1Data = (await g1.json()) as {
    liked: boolean;
    likeCount: number;
    isAuthenticated: boolean;
  };
  check("Guest GET ok 200", g1.status() === 200, String(g1.status()));
  check("Guest GET liked=false", g1Data.liked === false);
  check(
    "Guest GET isAuthenticated=false",
    g1Data.isAuthenticated === false,
  );
  const initialCount = g1Data.likeCount;

  // 2. Guest POST → 401
  const g2 = await guest.request.post(`${BASE}/api/likes/${articleId}`);
  check("Guest POST = 401", g2.status() === 401, String(g2.status()));

  // Authed context
  const authed = await browser.newContext();
  await loginAsAdmin(authed.request);

  // Reset to a known state: ensure not currently liked
  await authed.request.delete(`${BASE}/api/likes/${articleId}`);
  const baseRes = await authed.request.get(`${BASE}/api/likes/${articleId}`);
  const baseCount = ((await baseRes.json()) as { likeCount: number }).likeCount;

  // 3. Authed POST
  const a1 = await authed.request.post(`${BASE}/api/likes/${articleId}`);
  const a1Data = (await a1.json()) as { liked: boolean; likeCount: number };
  check("Authed POST 200", a1.status() === 200);
  check("Authed POST liked=true", a1Data.liked === true);
  check(
    "Authed POST count = base+1",
    a1Data.likeCount === baseCount + 1,
    `${a1Data.likeCount} vs ${baseCount}+1`,
  );

  // 4. Idempotent re-POST
  const a2 = await authed.request.post(`${BASE}/api/likes/${articleId}`);
  const a2Data = (await a2.json()) as { liked: boolean; likeCount: number };
  check("Re-POST 200", a2.status() === 200);
  check(
    "Re-POST count unchanged (idempotent)",
    a2Data.likeCount === a1Data.likeCount,
    `${a2Data.likeCount} === ${a1Data.likeCount}`,
  );

  // 5. Authed DELETE
  const d1 = await authed.request.delete(`${BASE}/api/likes/${articleId}`);
  const d1Data = (await d1.json()) as { liked: boolean; likeCount: number };
  check("Authed DELETE 200", d1.status() === 200);
  check("Authed DELETE liked=false", d1Data.liked === false);
  check(
    "Authed DELETE count back to base",
    d1Data.likeCount === baseCount,
    `${d1Data.likeCount} === ${baseCount}`,
  );

  // 6. Idempotent re-DELETE
  const d2 = await authed.request.delete(`${BASE}/api/likes/${articleId}`);
  const d2Data = (await d2.json()) as { likeCount: number };
  check("Re-DELETE 200", d2.status() === 200);
  check(
    "Re-DELETE count unchanged (idempotent)",
    d2Data.likeCount === d1Data.likeCount,
  );

  await browser.close();
  console.log(
    failed === 0 ? "\n[smoke] ALL PASS" : `\n[smoke] ${failed} FAILED`,
  );
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
