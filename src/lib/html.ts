import { unified } from "unified";
import rehypeParse from "rehype-parse";
import rehypeStringify from "rehype-stringify";
import rehypeSlug from "rehype-slug";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import type { Schema } from "hast-util-sanitize";
import { parseYouTubeId, youtubeEmbedSrc } from "@/lib/youtube";
import type { TocEntry } from "@/lib/mdx";
import type { Root } from "hast";

type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

function hastText(node: HastNode): string {
  if (node.type === "text") return node.value ?? "";
  if (!node.children) return "";
  let out = "";
  for (const child of node.children) out += hastText(child);
  return out;
}

function classList(node: HastNode): string[] {
  const c = node.properties?.className;
  if (Array.isArray(c)) return c as string[];
  if (typeof c === "string") return c.split(/\s+/);
  return [];
}

function youtubeEmbedNode(id: string, start?: number): HastNode {
  return {
    type: "element",
    tagName: "div",
    properties: { className: ["video-embed"] },
    children: [
      {
        type: "element",
        tagName: "iframe",
        properties: {
          src: youtubeEmbedSrc(id, start),
          title: "YouTube video player",
          loading: "lazy",
          allow:
            "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
          allowFullScreen: true,
          referrerPolicy: "strict-origin-when-cross-origin",
        },
        children: [],
      },
    ],
  };
}

function oembedUrl(node: HastNode): string | null {
  if (node.tagName === "oembed" && typeof node.properties?.url === "string") {
    return node.properties.url as string;
  }
  for (const c of node.children ?? []) {
    const u = oembedUrl(c);
    if (u) return u;
  }
  return null;
}

function soleParagraphYouTube(node: HastNode): string | null {
  if (node.tagName !== "p") return null;
  const els = (node.children ?? []).filter(
    (c) => !(c.type === "text" && (c.value ?? "").trim() === ""),
  );
  if (els.length === 1) {
    const only = els[0];
    if (
      only.type === "element" &&
      only.tagName === "a" &&
      typeof only.properties?.href === "string"
    ) {
      return only.properties.href as string;
    }
  }
  return hastText(node).trim() || null;
}

function rehypeYouTube() {
  const walk = (node: HastNode) => {
    const children = node.children;
    if (!children) return;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child.type !== "element") continue;

      const isMediaFigure =
        child.tagName === "figure" && classList(child).includes("media");
      if (isMediaFigure || child.tagName === "oembed") {
        const url = oembedUrl(child);
        const parsed = url ? parseYouTubeId(url) : null;
        if (parsed) {
          children[i] = youtubeEmbedNode(parsed.id, parsed.start);
          continue;
        }
      }

      if (child.tagName === "p") {
        const candidate = soleParagraphYouTube(child);
        const parsed = candidate ? parseYouTubeId(candidate) : null;
        if (parsed) {
          children[i] = youtubeEmbedNode(parsed.id, parsed.start);
          continue;
        }
      }

      walk(child);
    }
  };
  return (tree: Root) => walk(tree as unknown as HastNode);
}

function rehypeCollectToc(toc: TocEntry[]) {
  let major = 0;
  let minor = 0;
  const walk = (node: HastNode) => {
    if (node.type === "element" && (node.tagName === "h2" || node.tagName === "h3")) {
      const depth = node.tagName === "h2" ? 2 : 3;
      const slug =
        typeof node.properties?.id === "string"
          ? (node.properties.id as string)
          : "";
      const text = hastText(node).trim();
      if (slug && text) {
        if (depth === 2) {
          major += 1;
          minor = 0;
          toc.push({ depth, text, slug, number: `${major}.0` });
        } else if (major > 0) {
          minor += 1;
          toc.push({ depth, text, slug, number: `${major}.${minor}` });
        }
      }
    }
    for (const c of node.children ?? []) walk(c);
  };
  return (tree: Root) => walk(tree as unknown as HastNode);
}

const sanitizeSchema: Schema = {
  ...defaultSchema,
  clobberPrefix: "",
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "figure",
    "figcaption",
    "iframe",
    "u",
    "s",
    "mark",
    "label",
  ],
  attributes: {
    ...defaultSchema.attributes,
    "*": [
      ...(defaultSchema.attributes?.["*"] ?? []),
      "className",
      "style",
      "id",
    ],
    iframe: [
      "src",
      "title",
      "allow",
      "allowfullscreen",
      "allowFullScreen",
      "loading",
      "referrerpolicy",
      "referrerPolicy",
      "frameborder",
      "width",
      "height",
      "className",
      "style",
    ],
    img: [
      ...(defaultSchema.attributes?.img ?? []),
      "src",
      "alt",
      "width",
      "height",
      "className",
      "style",
    ],
    a: [...(defaultSchema.attributes?.a ?? []), "target", "rel", "className"],
    code: [
      ...(defaultSchema.attributes?.code ?? []),
      "className",
      "style",
      ["data-language"],
      ["data-theme"],
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
    ],
    input: [
      ...(defaultSchema.attributes?.input ?? []),
      "checked",
      "className",
    ],
  },
};

export async function renderArticleHtml(
  html: string,
): Promise<{ html: string; toc: TocEntry[] }> {
  const toc: TocEntry[] = [];
  const file = await unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeSlug)
    .use(() => rehypeCollectToc(toc))
    .use(rehypeYouTube)
    .use(rehypePrettyCode, {
      theme: "github-dark-dimmed",
      keepBackground: true,
    })
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeStringify)
    .process(html || "");
  return { html: String(file), toc };
}
