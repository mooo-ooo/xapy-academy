import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import GitHubSlugger from "github-slugger";

/**
 * Sanitize schema — defaultSchema + allow the class/style produced
 * by rehype-pretty-code on <pre>, <code>, <span>, plus the id added
 * by rehype-slug on headings.
 *
 * `clobberPrefix: ""` disables the default `user-content-` prefix on
 * IDs and `name`s. We need the heading `id` to match the slug stored
 * in our TOC entries verbatim — otherwise anchor jumps (#slug) and
 * the scroll-spy `document.getElementById(slug)` lookup both miss.
 * Safe here because MDX comes from admin/CTV (trusted authors), not
 * untrusted user input.
 */
const sanitizeSchema = {
  ...defaultSchema,
  clobberPrefix: "",
  attributes: {
    ...defaultSchema.attributes,
    "*": [
      ...(defaultSchema.attributes?.["*"] ?? []),
      "className",
      "style",
      "id",
    ],
    code: [
      ...(defaultSchema.attributes?.code ?? []),
      "className",
      "style",
      ["data-language"],
      ["data-theme"],
      ["data-line"],
      ["data-highlighted-line"],
      ["data-highlighted-chars"],
    ],
    pre: [
      ...(defaultSchema.attributes?.pre ?? []),
      "className",
      "style",
      ["data-language"],
      ["data-theme"],
    ],
    span: [
      ...(defaultSchema.attributes?.span ?? []),
      "className",
      "style",
      ["data-line"],
      ["data-highlighted-line"],
      ["data-highlighted-chars"],
    ],
    div: [
      ...(defaultSchema.attributes?.div ?? []),
      "className",
      "style",
      ["data-rehype-pretty-code-fragment"],
      ["data-rehype-pretty-code-title"],
    ],
  },
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "figure",
    "figcaption",
  ],
};

export type RenderedMdx = {
  content: React.ReactElement;
  toc: TocEntry[];
};

export type TocEntry = {
  depth: number; // 2 or 3
  slug: string;
  text: string;
  /** Hierarchical number ("1.0", "1.1", "2.0", "2.3", …) computed
   *  from document order — matches the kiyotaka TOC convention. */
  number: string;
};

/**
 * Server-side render an MDX string from the database. Returns the React
 * element to embed in a Server Component plus the heading TOC.
 */
export async function renderArticleMdx(source: string): Promise<RenderedMdx> {
  const toc = extractToc(source);

  const { content } = await compileMDX({
    source,
    options: {
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [
          rehypeSlug,
          [
            rehypeAutolinkHeadings,
            { behavior: "wrap", properties: { className: ["anchor"] } },
          ],
          [
            rehypePrettyCode,
            {
              theme: "github-dark-dimmed",
              keepBackground: true,
            },
          ],
          [rehypeSanitize, sanitizeSchema],
        ],
      },
    },
  });

  return { content, toc };
}

/**
 * Extract a flat TOC of H2 and H3 headings from a raw MDX string,
 * with each entry numbered hierarchically:
 *
 *   H2  → "1.0", "2.0", "3.0", …
 *   H3  → "1.1", "1.2", "2.1", …  (resets per H2)
 *
 * H3 entries that appear before any H2 are stripped — they don't
 * have a parent and would confuse the numbering.
 */
export function extractToc(source: string): TocEntry[] {
  const slugger = new GitHubSlugger();
  const lines = source.split("\n");
  const toc: TocEntry[] = [];
  let inFence = false;
  let major = 0;
  let minor = 0;
  for (const line of lines) {
    if (line.trimStart().startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!m) continue;
    const depth = m[1].length;
    const text = stripInlineMarkdown(m[2]);
    const slug = slugger.slug(text);
    if (depth === 2) {
      major += 1;
      minor = 0;
      toc.push({ depth, text, slug, number: `${major}.0` });
    } else if (depth === 3 && major > 0) {
      minor += 1;
      toc.push({ depth, text, slug, number: `${major}.${minor}` });
    }
  }
  return toc;
}

function stripInlineMarkdown(s: string): string {
  return s
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}
