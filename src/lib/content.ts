import TurndownService from "turndown";
import { marked } from "marked";

function makeTurndown(): TurndownService {
  const td = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "*",
  });
  td.addRule("oembed", {
    filter: (node) => node.nodeName === "OEMBED",
    replacement: (_content, node) => {
      const url = (node as HTMLElement).getAttribute("url");
      return url ? `\n\n${url}\n\n` : "";
    },
  });
  td.keep(["table", "thead", "tbody", "tr", "th", "td"]);
  return td;
}

export function htmlToMarkdown(html: string): string {
  if (!html) return "";
  return makeTurndown().turndown(html).trim();
}

export function markdownToHtml(md: string): string {
  if (!md) return "";
  return marked.parse(md, { async: false, gfm: true, breaks: false }) as string;
}
