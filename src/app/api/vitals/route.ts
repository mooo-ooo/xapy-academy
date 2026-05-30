import { NextResponse } from "next/server";

/**
 * Web Vitals RUM sink. Receives `navigator.sendBeacon` payloads from
 * `WebVitalsReporter` (production only). For now it emits a structured
 * server log line — repoint the `console.log` at a real sink (Axiom /
 * Datadog / a `WebVital` table) when one exists.
 *
 * POST-only and under /api (robots-disallowed), so it's invisible to crawlers.
 */
export const runtime = "nodejs";

type VitalBody = {
  name?: unknown;
  value?: unknown;
  rating?: unknown;
  id?: unknown;
  navigationType?: unknown;
  path?: unknown;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as VitalBody;
    if (body && typeof body.name === "string") {
      // eslint-disable-next-line no-console
      console.log(
        `[rum] ${body.name} value=${String(body.value)} rating=${String(
          body.rating,
        )} path=${String(body.path ?? "")} nav=${String(
          body.navigationType ?? "",
        )}`,
      );
    }
  } catch {
    // Ignore malformed beacons — never throw on a fire-and-forget endpoint.
  }
  return new NextResponse(null, { status: 204 });
}
