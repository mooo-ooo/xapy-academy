"use client";

import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Select — API-compatible drop-in for the old Radix Select, but built on
 * Radix DropdownMenu with `modal={false}` so opening it does NOT engage
 * react-remove-scroll (no body scroll-lock, no scrollbar toggling, no
 * page shift). DropdownMenu still gives full keyboard nav + typeahead.
 *
 * Same surface as before:
 *   <Select value onValueChange>
 *     <SelectTrigger><SelectValue placeholder/></SelectTrigger>
 *     <SelectContent>
 *       <SelectItem value>label</SelectItem>
 *     </SelectContent>
 *   </Select>
 *
 * The selected item's label is resolved synchronously by walking the
 * children tree (so SelectValue shows the right label before the menu
 * has ever been opened — DropdownMenu unmounts its content when closed).
 */

type SelectCtx = {
  value?: string;
  onValueChange?: (value: string) => void;
  labels: Map<string, React.ReactNode>;
  disabled?: boolean;
};

const SelectContext = React.createContext<SelectCtx | null>(null);

function useSelectCtx(): SelectCtx {
  const ctx = React.useContext(SelectContext);
  if (!ctx) throw new Error("Select.* must be used within <Select>");
  return ctx;
}

/** Recursively collect value → label from <SelectItem> descendants. */
function collectLabels(
  children: React.ReactNode,
  map: Map<string, React.ReactNode>,
) {
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    const el = child as React.ReactElement<{
      value?: string;
      children?: React.ReactNode;
    }>;
    if (el.type === SelectItem && typeof el.props.value === "string") {
      map.set(el.props.value, el.props.children);
    } else if (el.props && el.props.children) {
      collectLabels(el.props.children, map);
    }
  });
}

export function Select({
  value,
  defaultValue,
  onValueChange,
  disabled,
  children,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const [internal, setInternal] = React.useState(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? value : internal;

  const labels = React.useMemo(() => {
    const map = new Map<string, React.ReactNode>();
    collectLabels(children, map);
    return map;
  }, [children]);

  const handleChange = React.useCallback(
    (next: string) => {
      if (!isControlled) setInternal(next);
      onValueChange?.(next);
    },
    [isControlled, onValueChange],
  );

  const ctx = React.useMemo<SelectCtx>(
    () => ({ value: current, onValueChange: handleChange, labels, disabled }),
    [current, handleChange, labels, disabled],
  );

  return (
    <SelectContext.Provider value={ctx}>
      <DropdownMenu.Root modal={false}>{children}</DropdownMenu.Root>
    </SelectContext.Provider>
  );
}

export const SelectGroup = DropdownMenu.Group;

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value, labels } = useSelectCtx();
  const label = value !== undefined ? labels.get(value) : undefined;
  return (
    <span className={cn(label == null && "text-[hsl(var(--muted-foreground))]")}>
      {label ?? placeholder ?? null}
    </span>
  );
}

export const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof DropdownMenu.Trigger>
>(({ className, children, disabled, ...props }, ref) => {
  const { disabled: ctxDisabled } = useSelectCtx();
  return (
  <DropdownMenu.Trigger
    ref={ref}
    disabled={disabled ?? ctxDisabled}
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--inset))] px-3 text-sm text-[hsl(var(--foreground))] outline-none transition-colors focus:border-[hsl(var(--accent-emerald))] disabled:cursor-not-allowed disabled:opacity-50 [&>span]:truncate",
      className,
    )}
    {...props}
  >
    {children}
    <ChevronDown size={16} className="ml-2 shrink-0 opacity-50" />
  </DropdownMenu.Trigger>
  );
});
SelectTrigger.displayName = "SelectTrigger";

export const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof DropdownMenu.Content>
>(({ className, children, sideOffset = 4, ...props }, ref) => (
  <DropdownMenu.Portal>
    <DropdownMenu.Content
      ref={ref}
      sideOffset={sideOffset}
      align="start"
      className={cn(
        "z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card-hover))] p-1 text-[hsl(var(--foreground))] shadow-xl backdrop-blur-2xl",
        className,
      )}
      {...props}
    >
      {children}
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
));
SelectContent.displayName = "SelectContent";

export function SelectItem({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = useSelectCtx();
  const selected = ctx.value === value;
  return (
    <DropdownMenu.Item
      onSelect={() => ctx.onValueChange?.(value)}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-md py-1.5 pl-8 pr-2 text-sm outline-none data-[highlighted]:bg-[hsl(var(--hover))] data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {selected && (
          <Check size={14} className="text-[hsl(var(--accent-emerald))]" />
        )}
      </span>
      {children}
    </DropdownMenu.Item>
  );
}
