"use client";

import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { normalizeIconName } from "@/lib/module-icons";

export function ModuleIcon({
  name,
  size = 16,
  strokeWidth = 2,
  className,
}: {
  name: string | null | undefined;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <DynamicIcon
      name={normalizeIconName(name) as IconName}
      size={size}
      strokeWidth={strokeWidth}
      className={className}
    />
  );
}
