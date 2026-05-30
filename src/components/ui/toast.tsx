"use client";

import { Toaster as Sonner } from "sonner";

/** App-wide toaster — drop into the locale layout once. */
export function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="top-right"
      richColors
      toastOptions={{
        classNames: {
          toast:
            "rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card-hover))] text-[hsl(var(--foreground))] backdrop-blur-2xl",
        },
      }}
    />
  );
}

// Re-export the imperative API so call sites can do:
//   import { toast } from "@/components/ui/toast"
//   toast.success("Saved")
export { toast } from "sonner";
