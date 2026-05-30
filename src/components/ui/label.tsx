"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

type LabelProps = React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & {
  /**
   * Mark this field as required — appends a red asterisk after the
   * label text. Visual cue only; the actual `required` attribute is
   * still set on the underlying input/select.
   */
  required?: boolean;
};

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  LabelProps
>(({ className, required, children, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      "text-xs font-medium uppercase tracking-[0.6px] text-[hsl(var(--muted-foreground))] peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
      className,
    )}
    {...props}
  >
    {children}
    {required && (
      <span
        aria-hidden="true"
        className="ml-0.5 text-red-400"
        title="Required"
      >
        *
      </span>
    )}
  </LabelPrimitive.Root>
));
Label.displayName = "Label";
