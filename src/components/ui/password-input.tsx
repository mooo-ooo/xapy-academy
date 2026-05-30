"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  /** Aria-labels for the show / hide toggle button. Required for a11y. */
  showLabel: string;
  hideLabel: string;
};

/**
 * Password field with an eye / eye-off toggle on the right edge.
 * Mirrors the shared `Input` styling so it drops in everywhere — the
 * only difference is the trailing icon button and the controlled
 * `type` state. Keep this client-only since visibility is per-user.
 */
export const PasswordInput = React.forwardRef<HTMLInputElement, Props>(
  ({ className, showLabel, hideLabel, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);
    return (
      <div className="relative">
        <input
          {...props}
          ref={ref}
          type={visible ? "text" : "password"}
          className={cn(
            "flex h-10 w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--inset))] pl-3 pr-10 text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))] transition-colors focus:border-[hsl(var(--accent-emerald))] disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
          className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-md text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--hover))] hover:text-[hsl(var(--foreground))]"
        >
          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";
