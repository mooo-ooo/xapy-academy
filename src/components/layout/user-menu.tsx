"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { LogOut, Settings, Shield, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import type { AppRole } from "@/lib/auth";

export function UserMenu({
  name,
  email,
  role,
}: {
  name: string | null;
  email: string;
  role: AppRole;
}) {
  const t = useTranslations("header");
  const [pending, startTransition] = useTransition();

  function onLogout() {
    startTransition(async () => {
      const form = new FormData();
      await fetch("/api/auth/logout?redirectTo=/", {
        method: "POST",
        body: form,
      });
      window.location.href = "/";
    });
  }

  const initials = (name || email).slice(0, 2).toUpperCase();

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={name ?? email}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--hover))] text-xs font-medium text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--hover))]"
        >
          {initials}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-56 overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card-hover))] p-1 text-sm text-[hsl(var(--foreground))] shadow-xl backdrop-blur-2xl"
        >
          <div className="px-3 py-2 text-xs">
            <div className="font-medium text-[hsl(var(--foreground))]">
              {name || email}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[hsl(var(--muted-foreground))]">
              <Shield size={12} />
              {role}
            </div>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-[hsl(var(--hover))]" />
          <DropdownMenu.Item
            asChild
            className="rounded-lg outline-none data-[highlighted]:bg-[hsl(var(--hover))]"
          >
            <a
              href="/account"
              className="flex cursor-pointer items-center gap-2 px-3 py-2"
            >
              <Settings size={14} /> {t("account")}
            </a>
          </DropdownMenu.Item>
          {role === "ADMIN" || role === "MODERATOR" || role === "CTV" ? (
            <DropdownMenu.Item
              asChild
              className="rounded-lg outline-none data-[highlighted]:bg-[hsl(var(--hover))]"
            >
              <a
                href="/admin"
                className="flex cursor-pointer items-center gap-2 px-3 py-2"
              >
                <UserRound size={14} /> Admin
              </a>
            </DropdownMenu.Item>
          ) : null}
          <DropdownMenu.Item
            onSelect={onLogout}
            disabled={pending}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 outline-none data-[highlighted]:bg-[hsl(var(--hover))] disabled:opacity-60"
          >
            <LogOut size={14} /> {t("logout")}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
