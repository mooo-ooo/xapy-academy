"use client";

import { useRef } from "react";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  ClassicEditor,
  Essentials,
  Paragraph,
  Heading,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Subscript,
  Superscript,
  FontSize,
  FontFamily,
  FontColor,
  FontBackgroundColor,
  Highlight,
  Alignment,
  Indent,
  IndentBlock,
  Link,
  AutoLink,
  LinkImage,
  List,
  ListProperties,
  TodoList,
  BlockQuote,
  CodeBlock,
  HorizontalLine,
  Image,
  ImageToolbar,
  ImageCaption,
  ImageStyle,
  ImageResize,
  ImageUpload,
  ImageInsert,
  AutoImage,
  MediaEmbed,
  Table,
  TableToolbar,
  TableProperties,
  TableCellProperties,
  TableCaption,
  TableColumnResize,
  FindAndReplace,
  SpecialCharacters,
  SpecialCharactersEssentials,
  SourceEditing,
  GeneralHtmlSupport,
  ShowBlocks,
  Fullscreen,
  WordCount,
  Autoformat,
  RemoveFormat,
  PasteFromOffice,
  type EditorConfig,
  type FileLoader,
  type Editor,
} from "ckeditor5";
import "ckeditor5/ckeditor5.css";

type UploadResponse = { url?: string; error?: string };

class XapyUploadAdapter {
  private loader: FileLoader;
  private controller: AbortController;

  constructor(loader: FileLoader) {
    this.loader = loader;
    this.controller = new AbortController();
  }

  async upload(): Promise<{ default: string }> {
    const file = await this.loader.file;
    if (!file) throw new Error("No file");
    const data = new FormData();
    data.append("file", file);
    const res = await fetch("/api/upload", {
      method: "POST",
      body: data,
      signal: this.controller.signal,
    });
    const json: UploadResponse = await res.json();
    if (!res.ok || !json.url) {
      throw new Error(json.error || "Upload failed");
    }
    return { default: json.url };
  }

  abort() {
    this.controller.abort();
  }
}

const TEXT_COLORS = [
  { color: "#34d399", label: "Emerald" },
  { color: "#38bdf8", label: "Sky" },
  { color: "#a78bfa", label: "Violet" },
  { color: "#fbbf24", label: "Amber" },
  { color: "#fb7185", label: "Rose" },
  { color: "#94a3b8", label: "Slate" },
  { color: "#ffffff", label: "White" },
  { color: "#000000", label: "Black" },
];

export function CkEditor({
  value,
  onChange,
  placeholder = "Write your article…",
  readOnly = false,
  accentColor = "",
}: {
  value: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  accentColor?: string;
}) {
  const wordCountRef = useRef<HTMLDivElement>(null);

  const config: EditorConfig = {
    licenseKey: "GPL",
    placeholder,
    ui: { viewportOffset: { top: 124 } },
    plugins: [
      Essentials,
      Paragraph,
      Heading,
      Bold,
      Italic,
      Underline,
      Strikethrough,
      Code,
      Subscript,
      Superscript,
      FontSize,
      FontFamily,
      FontColor,
      FontBackgroundColor,
      Highlight,
      Alignment,
      Indent,
      IndentBlock,
      Link,
      AutoLink,
      LinkImage,
      List,
      ListProperties,
      TodoList,
      BlockQuote,
      CodeBlock,
      HorizontalLine,
      Image,
      ImageToolbar,
      ImageCaption,
      ImageStyle,
      ImageResize,
      ImageUpload,
      ImageInsert,
      AutoImage,
      MediaEmbed,
      Table,
      TableToolbar,
      TableProperties,
      TableCellProperties,
      TableCaption,
      TableColumnResize,
      FindAndReplace,
      SpecialCharacters,
      SpecialCharactersEssentials,
      SourceEditing,
      GeneralHtmlSupport,
      ShowBlocks,
      Fullscreen,
      WordCount,
      Autoformat,
      RemoveFormat,
      PasteFromOffice,
    ],
    extraPlugins: [
      function UploadAdapterPlugin(editor) {
        editor.plugins.get("FileRepository").createUploadAdapter = (
          loader: FileLoader,
        ) => new XapyUploadAdapter(loader);
      },
    ],
    toolbar: {
      items: [
        "undo",
        "redo",
        "|",
        "sourceEditing",
        "showBlocks",
        "fullscreen",
        "findAndReplace",
        "|",
        "heading",
        "|",
        "fontSize",
        "fontFamily",
        "fontColor",
        "fontBackgroundColor",
        "|",
        "bold",
        "italic",
        "underline",
        "strikethrough",
        "subscript",
        "superscript",
        "code",
        "highlight",
        "removeFormat",
        "|",
        "alignment",
        "|",
        "link",
        "bulletedList",
        "numberedList",
        "todoList",
        "outdent",
        "indent",
        "|",
        "blockQuote",
        "codeBlock",
        "insertImage",
        "mediaEmbed",
        "insertTable",
        "horizontalLine",
        "specialCharacters",
      ],
      shouldNotGroupWhenFull: false,
    },
    heading: {
      options: [
        { model: "paragraph", title: "Paragraph", class: "ck-heading_paragraph" },
        {
          model: "heading2",
          view: "h2",
          title: "Heading 2",
          class: "ck-heading_heading2",
        },
        {
          model: "heading3",
          view: "h3",
          title: "Heading 3",
          class: "ck-heading_heading3",
        },
        {
          model: "heading4",
          view: "h4",
          title: "Heading 4",
          class: "ck-heading_heading4",
        },
      ],
    },
    fontSize: {
      options: [10, 12, 14, "default", 18, 20, 24, 28, 32],
      supportAllValues: true,
    },
    fontColor: { colors: TEXT_COLORS, columns: 8 },
    fontBackgroundColor: { colors: TEXT_COLORS, columns: 8 },
    list: {
      properties: { styles: true, startIndex: true, reversed: true },
    },
    htmlSupport: {
      allow: [
        { name: /^.*$/, styles: true, attributes: true, classes: true },
      ],
    },
    image: {
      toolbar: [
        "imageStyle:inline",
        "imageStyle:block",
        "imageStyle:side",
        "|",
        "toggleImageCaption",
        "imageTextAlternative",
        "linkImage",
        "|",
        "resizeImage",
      ],
    },
    table: {
      contentToolbar: [
        "tableColumn",
        "tableRow",
        "mergeTableCells",
        "tableProperties",
        "tableCellProperties",
        "toggleTableCaption",
      ],
    },
    link: {
      defaultProtocol: "https://",
      addTargetToExternalLinks: true,
    },
  };

  return (
    <div
      className="ckeditor-wrap"
      style={
        accentColor
          ? ({ "--article-accent": accentColor } as React.CSSProperties)
          : undefined
      }
    >
      <CKEditor
        editor={ClassicEditor}
        config={config}
        data={value}
        disabled={readOnly}
        onChange={(_evt, editor) => {
          onChange?.(editor.getData());
        }}
        onReady={(editor: Editor) => {
          const wordCount = editor.plugins.get(WordCount);
          const container = wordCountRef.current;
          if (container && wordCount.wordCountContainer) {
            container.replaceChildren(wordCount.wordCountContainer);
          }
        }}
      />
      <div
        ref={wordCountRef}
        className="mt-1 text-xs text-[hsl(var(--muted-foreground))]"
      />
    </div>
  );
}
