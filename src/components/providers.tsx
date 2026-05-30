"use client";

import { type ReactNode } from "react";
import { ThemeProvider } from "@/components/theme/theme-provider";

export function Providers({
  children,
  initialTheme,
}: {
  children: ReactNode;
  initialTheme: "dark" | "light";
}) {
  return (
    <ThemeProvider initialTheme={initialTheme}>{children}</ThemeProvider>
  );
}
