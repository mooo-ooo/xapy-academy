"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import { TextStyle, Color } from "@tiptap/extension-text-style";
import { Markdown } from "tiptap-markdown";

// tiptap-markdown's editor.storage.markdown isn't in @tiptap/core's type
type MarkdownStorage = { markdown: { getMarkdown(): string } };
import {
  Bold,
  Code,
  Code2,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Loader2,
  Palette,
  Quote,
  Video,
} from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { parseYouTubeId } from "@/lib/youtube";
import { YoutubeEmbed } from "@/components/admin/youtube-node";

/**
 * Controlled rich-text editor that reads/writes Markdown.
 *
 * - `value` is Markdown text; the editor parses it on mount.
 * - `onChange` fires on every doc change with the Markdown serialization.
 * - `readOnly` makes the editor display-only (used in side-by-side translate view).
 */
export function TiptapEditor({
  value,
  onChange,
  placeholder = "Write your article…",
  readOnly = false,
  className = "",
  accentColor = "",
}: {
  value: string;
  onChange?: (markdown: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
  accentColor?: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "tiptap-link" },
      }),
      Image.configure({ HTMLAttributes: { class: "tiptap-image" } }),
      TextStyle,
      Color,
      Placeholder.configure({ placeholder }),
      YoutubeEmbed,
      Markdown.configure({
        html: true,
        tightLists: true,
        bulletListMarker: "-",
        linkify: false,
        breaks: false,
      }),
    ],
    content: value,
    editable: !readOnly,
    immediatelyRender: false,
    onUpdate({ editor }) {
      if (onChange) {
        onChange((editor.storage as unknown as MarkdownStorage).markdown.getMarkdown());
      }
    },
    editorProps: {
      attributes: {
        class:
          "prose-academy min-h-[400px] max-w-none px-5 py-4 outline-none [&_.tiptap-link]:underline",
      },
    },
  });

  // Keep editor in sync when value changes externally
  useEffect(() => {
    if (!editor) return;
    const current = (editor.storage as unknown as MarkdownStorage).markdown.getMarkdown();
    if (current !== value) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  return (
    <div
      className={`rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--inset))] ${className}`}
      style={
        accentColor
          ? ({ "--article-accent": accentColor } as React.CSSProperties)
          : undefined
      }
    >
      {!readOnly && editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const btn = (active: boolean) =>
    active ? "bg-[hsl(var(--hover))] text-white" : "text-[hsl(var(--muted-foreground))]";

  const imageRef = useRef<HTMLInputElement>(null);
  const [uploading, startUpload] = useTransition();

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    startUpload(async () => {
      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data: { url?: string; error?: string } = await res.json();
        if (!res.ok || !data.url) {
          toast.error(data.error || "Upload failed");
          return;
        }
        const alt = file.name.replace(/\.[^.]+$/, "");
        editor.chain().focus().setImage({ src: data.url, alt }).run();
        toast.success("Image inserted");
      } catch {
        toast.error("Network error");
      } finally {
        if (imageRef.current) imageRef.current.value = "";
      }
    });
  }

  function promptImageUrl() {
    const url = window.prompt("Image URL", "https://");
    if (!url || url === "https://") return;
    editor.chain().focus().setImage({ src: url }).run();
  }

  function promptLink() {
    const previous = editor.getAttributes("link").href;
    const url = window.prompt("URL", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  function promptVideo() {
    const input = window.prompt("YouTube URL", "https://");
    if (!input) return;
    const parsed = parseYouTubeId(input);
    if (!parsed) {
      window.alert("Not a valid YouTube link.");
      return;
    }
    editor
      .chain()
      .focus()
      .insertContent({
        type: "youtube",
        attrs: { videoId: parsed.id, start: parsed.start ?? null },
      })
      .run();
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-[hsl(var(--border))] p-2">
      <ToolButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={btn(editor.isActive("heading", { level: 2 }))}
      >
        <Heading2 size={14} />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={btn(editor.isActive("heading", { level: 3 }))}
      >
        <Heading3 size={14} />
      </ToolButton>
      <Sep />
      <ToolButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={btn(editor.isActive("bold"))}
      >
        <Bold size={14} />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={btn(editor.isActive("italic"))}
      >
        <Italic size={14} />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={btn(editor.isActive("code"))}
      >
        <Code size={14} />
      </ToolButton>
      <Sep />
      <ToolButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={btn(editor.isActive("bulletList"))}
      >
        <List size={14} />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={btn(editor.isActive("orderedList"))}
      >
        <ListOrdered size={14} />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={btn(editor.isActive("blockquote"))}
      >
        <Quote size={14} />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={btn(editor.isActive("codeBlock"))}
      >
        <Code2 size={14} />
      </ToolButton>
      <Sep />
      <ColorMenu editor={editor} />
      <Sep />
      <ToolButton
        onClick={promptLink}
        title="Insert link"
        className={btn(editor.isActive("link"))}
      >
        <LinkIcon size={14} />
      </ToolButton>
      <ToolButton
        onClick={() => imageRef.current?.click()}
        title="Insert image (upload)"
        disabled={uploading}
      >
        {uploading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <ImageIcon size={14} />
        )}
      </ToolButton>
      <ToolButton onClick={promptImageUrl} title="Insert image by URL">
        <LinkIcon size={14} className="opacity-60" />
      </ToolButton>
      <ToolButton onClick={promptVideo} title="Embed YouTube video">
        <Video size={14} />
      </ToolButton>
      <input
        ref={imageRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif,image/gif,image/svg+xml"
        onChange={onPickImage}
        className="hidden"
      />
    </div>
  );
}

const TEXT_COLORS: { name: string; value: string }[] = [
  { name: "Emerald", value: "#34d399" },
  { name: "Sky", value: "#38bdf8" },
  { name: "Violet", value: "#a78bfa" },
  { name: "Amber", value: "#fbbf24" },
  { name: "Rose", value: "#fb7185" },
  { name: "Slate", value: "#94a3b8" },
];

function ColorMenu({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const active: string | undefined = editor.getAttributes("textStyle").color;

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function applyPreset(value: string) {
    editor.chain().focus().setColor(value).run();
    setOpen(false);
  }

  function applyLive(value: string) {
    editor.chain().setColor(value).run();
  }

  function clear() {
    editor.chain().focus().unsetColor().run();
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative">
      <Button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Text color"
        variant="ghost"
        size="sm"
        className={`h-7 w-7 p-0 ${
          active ? "text-white" : "text-[hsl(var(--muted-foreground))]"
        }`}
      >
        <Palette size={14} style={active ? { color: active } : undefined} />
      </Button>
      {open && (
        <div className="absolute left-0 top-9 z-20 w-44 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--inset))] p-2 shadow-lg">
          <div className="grid grid-cols-6 gap-1.5">
            {TEXT_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.name}
                onClick={() => applyPreset(c.value)}
                className={`h-6 w-6 rounded-md border transition-transform hover:scale-110 ${
                  active?.toLowerCase() === c.value.toLowerCase()
                    ? "border-white"
                    : "border-white/20"
                }`}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
          <label className="mt-2 flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
            <input
              type="color"
              defaultValue={active ?? "#34d399"}
              onChange={(e) => applyLive(e.target.value)}
              className="h-6 w-6 cursor-pointer rounded border border-white/20 bg-transparent p-0"
            />
            Custom
          </label>
          <button
            type="button"
            onClick={clear}
            className="mt-2 w-full rounded-md px-2 py-1 text-left text-xs text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--hover))] hover:text-white"
          >
            Remove color
          </button>
        </div>
      )}
    </div>
  );
}

function ToolButton({
  children,
  onClick,
  title,
  className = "",
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      title={title}
      variant="ghost"
      size="sm"
      disabled={disabled}
      className={`h-7 w-7 p-0 ${className}`}
    >
      {children}
    </Button>
  );
}

function Sep() {
  return <div className="mx-1 h-5 w-px bg-[hsl(var(--hover))]" />;
}
