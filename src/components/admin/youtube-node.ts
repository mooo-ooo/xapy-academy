import { Node, mergeAttributes } from "@tiptap/react";
import { parseYouTubeId, youtubeEmbedSrc } from "@/lib/youtube";

type SerializerState = {
  write: (text: string) => void;
  closeBlock: (node: unknown) => void;
};
type SerializerNode = { attrs: { videoId: string; start: number | null } };

function soleAnchorHref(p: Element): string | null {
  const els = Array.from(p.childNodes).filter(
    (n) => !(n.nodeType === 3 && !(n.textContent ?? "").trim()),
  );
  const only = els[0];
  if (
    els.length === 1 &&
    only instanceof Element &&
    only.tagName === "A" &&
    only.getAttribute("href")
  ) {
    return only.getAttribute("href");
  }
  return null;
}

export const YoutubeEmbed = Node.create({
  name: "youtube",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      videoId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-youtube-video"),
        renderHTML: (attrs) =>
          attrs.videoId ? { "data-youtube-video": attrs.videoId } : {},
      },
      start: {
        default: null,
        parseHTML: (el) => {
          const v = el.getAttribute("data-start");
          return v ? Number(v) : null;
        },
        renderHTML: (attrs) =>
          attrs.start ? { "data-start": String(attrs.start) } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-youtube-video]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const videoId = node.attrs.videoId as string;
    const start = node.attrs.start as number | null;
    return [
      "div",
      mergeAttributes(HTMLAttributes, { class: "video-embed" }),
      [
        "iframe",
        {
          src: youtubeEmbedSrc(videoId, start ?? undefined),
          title: "YouTube video player",
          loading: "lazy",
          allow:
            "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
          allowfullscreen: "true",
          referrerpolicy: "strict-origin-when-cross-origin",
          frameborder: "0",
        },
      ],
    ];
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: SerializerState, node: SerializerNode) {
          const { videoId, start } = node.attrs;
          const url =
            `https://www.youtube.com/watch?v=${videoId}` +
            (start ? `&t=${start}` : "");
          state.write(url);
          state.closeBlock(node);
        },
        parse: {
          updateDOM(element: HTMLElement) {
            element.querySelectorAll("p").forEach((p) => {
              const candidate = soleAnchorHref(p) ?? (p.textContent ?? "").trim();
              const parsed = parseYouTubeId(candidate);
              if (!parsed) return;
              const div = element.ownerDocument.createElement("div");
              div.setAttribute("data-youtube-video", parsed.id);
              if (parsed.start) div.setAttribute("data-start", String(parsed.start));
              p.replaceWith(div);
            });
          },
        },
      },
    };
  },
});
