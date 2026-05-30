import { jsonLdScript } from "@/lib/seo";

/**
 * Inline JSON-LD <script> Server Component. Use one instance per
 * schema object so search bots can pick them up independently.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdScript(data) }}
    />
  );
}
