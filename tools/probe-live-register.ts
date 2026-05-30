/**
 * Probe https://kiyotaka.ai for the register flow: find the register
 * link from the header, follow it, dump the form fields + OAuth buttons
 * + screenshot, and record every POST endpoint that fires on submit.
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const OUT = join(process.cwd(), "tools", "output", "live-register");

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    colorScheme: "dark",
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();

  const reqs: string[] = [];
  page.on("request", (r) => {
    if (
      r.method() !== "GET" ||
      r.url().includes("auth") ||
      r.url().includes("register") ||
      r.url().includes("sign")
    ) {
      reqs.push(`${r.method()} ${r.url()}`);
    }
  });

  // 1) Start at root, look for register link
  // Real app lives at chart.kiyotaka.ai — kiyotaka.ai is marketing only.
  await page.goto("https://chart.kiyotaka.ai/", {
    waitUntil: "networkidle",
    timeout: 45_000,
  });
  await page.screenshot({ path: join(OUT, "01-home.png"), fullPage: false });

  // Find all links/buttons with "register" / "sign up" text
  const candidates = await page.$$eval("a, button", (els) =>
    els
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        text: (el.textContent ?? "").trim().slice(0, 80),
        href: (el as HTMLAnchorElement).href ?? null,
      }))
      .filter((c) =>
        /register|sign\s*up|đăng\s*ký|create.*account/i.test(c.text),
      ),
  );
  console.log("\n=== Candidate register links ===");
  for (const c of candidates) console.log(`  [${c.tag}] "${c.text}"  → ${c.href ?? "(no href)"}`);

  // 2) Try common URLs directly
  const tryUrls = [
    "https://chart.kiyotaka.ai/register",
    "https://chart.kiyotaka.ai/sign-up",
    "https://chart.kiyotaka.ai/signup",
    "https://chart.kiyotaka.ai/auth/register",
    "https://chart.kiyotaka.ai/auth/signup",
    "https://chart.kiyotaka.ai/login",
  ];
  for (const u of tryUrls) {
    try {
      const resp = await page.goto(u, { waitUntil: "networkidle", timeout: 20_000 });
      console.log(`  ${u} → ${resp?.status() ?? "no-resp"} (final URL ${page.url()})`);
      if (resp && resp.ok() && page.url().includes("register")) break;
    } catch (e) {
      console.log(`  ${u} → ERROR ${(e as Error).message.slice(0, 80)}`);
    }
  }

  // 3) Dump whatever register page we landed on
  await page.screenshot({ path: join(OUT, "02-register.png"), fullPage: true });
  const formInfo = await page.evaluate(() => {
    const forms = Array.from(document.querySelectorAll("form")).map((f) => ({
      action: (f as HTMLFormElement).action,
      method: (f as HTMLFormElement).method,
      fields: Array.from(f.querySelectorAll("input, select, textarea")).map((el) => {
        const i = el as HTMLInputElement;
        return {
          name: i.name,
          type: i.type,
          placeholder: i.placeholder,
          required: i.required,
        };
      }),
    }));
    const oauthButtons = Array.from(document.querySelectorAll("button, a"))
      .map((el) => (el.textContent ?? "").trim())
      .filter((t) => /google|facebook|apple|github|x\.com|twitter|continue with/i.test(t))
      .slice(0, 10);
    return {
      url: location.href,
      title: document.title,
      forms,
      oauthButtons,
      h1: Array.from(document.querySelectorAll("h1, h2"))
        .map((el) => (el.textContent ?? "").trim())
        .slice(0, 5),
    };
  });

  await writeFile(
    join(OUT, "report.json"),
    JSON.stringify({ formInfo, requests: reqs }, null, 2),
    "utf8",
  );
  console.log("\n=== Register page ===");
  console.log(JSON.stringify(formInfo, null, 2));
  console.log("\n=== Auth-ish requests ===");
  for (const r of reqs) console.log(`  ${r}`);

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
