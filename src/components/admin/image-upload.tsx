"use client";

import { Loader2, Upload, X } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";

/**
 * Cover-image picker. Supports two input modes side-by-side:
 *   - Paste a URL (default)
 *   - Pick a file → POST to /api/upload → server writes to /uploads
 *     and returns the public path
 *
 * Always renders a hidden <input name={name}> so the parent form can
 * keep its FormData-based submit unchanged.
 */
export function ImageUpload({
  name,
  initial = "",
  label,
  placeholder = "https://… or upload a file",
}: {
  name: string;
  initial?: string;
  label?: string;
  placeholder?: string;
}) {
  const [url, setUrl] = useState(initial);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    startTransition(async () => {
      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data: { url?: string; error?: string } = await res.json();
        if (!res.ok || !data.url) {
          toast.error(data.error || "Upload failed");
          return;
        }
        setUrl(data.url);
        toast.success("Uploaded");
      } catch {
        toast.error("Network error");
      } finally {
        if (fileRef.current) fileRef.current.value = "";
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <span className="text-xs font-medium uppercase tracking-[0.6px] text-[hsl(var(--muted-foreground))]">
          {label}
        </span>
      )}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <Input
          name={name}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={placeholder}
          type="text"
          className="flex-1"
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif,image/gif,image/svg+xml"
          onChange={onPick}
          className="hidden"
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => fileRef.current?.click()}
          disabled={pending}
        >
          {pending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Upload size={14} />
          )}
          Upload
        </Button>
      </div>

      {url && (
        <div className="relative mt-2 inline-block overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-black/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="w-full h-full flex items-center justify-center">
            <img
              src={url}
              alt="Cover preview"
              className="block max-h-48 w-auto object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => setUrl("")}
            aria-label="Clear image"
            className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/90"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
