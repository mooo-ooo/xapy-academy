"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";

// tiptap-markdown's editor.storage.markdown isn't in @tiptap/core's type
type MarkdownStorage = { markdown: { getMarkdown(): string } };
import {
  Bold,
  Code,
  Code2,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Video,
} from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
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
}: {
  value: string;
  onChange?: (markdown: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "tiptap-link" },
      }),
      Placeholder.configure({ placeholder }),
      YoutubeEmbed,
      Markdown.configure({
        html: false,
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
          "prose-academy min-h-[400px] max-w-none px-5 py-4 outline-none [&_.tiptap-link]:text-emerald-400 [&_.tiptap-link]:underline",
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
    >
      {!readOnly && editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const btn = (active: boolean) =>
    active ? "bg-[hsl(var(--hover))] text-white" : "text-[hsl(var(--muted-foreground))]";

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
      <ToolButton
        onClick={promptLink}
        title="Insert link"
        className={btn(editor.isActive("link"))}
      >
        <LinkIcon size={14} />
      </ToolButton>
      <ToolButton onClick={promptVideo} title="Embed YouTube video">
        <Video size={14} />
      </ToolButton>
    </div>
  );
}

function ToolButton({
  children,
  onClick,
  title,
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  className?: string;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      title={title}
      variant="ghost"
      size="sm"
      className={`h-7 w-7 p-0 ${className}`}
    >
      {children}
    </Button>
  );
}

function Sep() {
  return <div className="mx-1 h-5 w-px bg-[hsl(var(--hover))]" />;
}
