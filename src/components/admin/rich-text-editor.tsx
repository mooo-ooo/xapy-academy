"use client";

import dynamic from "next/dynamic";

const CkEditor = dynamic(
  () => import("@/components/admin/ckeditor").then((m) => m.CkEditor),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[620px] rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--inset))] p-5 text-sm text-[hsl(var(--muted-foreground))]">
        Loading editor…
      </div>
    ),
  },
);

export function RichTextEditor(props: {
  value: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  accentColor?: string;
  className?: string;
}) {
  const { className = "", ...rest } = props;
  return (
    <div className={className}>
      <CkEditor {...rest} />
    </div>
  );
}
