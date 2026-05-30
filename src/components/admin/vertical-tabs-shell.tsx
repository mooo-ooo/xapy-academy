"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

/**
 * Reusable vertical-tabs layout for long admin forms: sidebar on the left
 * (collapses to a horizontal scroll bar on small screens), card-wrapped
 * content on the right. Each tab's content is `forceMount`-ed so any
 * internal forms stay intact when switching tabs.
 */
export function VerticalTabsShell({
  tabs,
  defaultValue,
}: {
  tabs: Array<{ key: string; label: string; content: React.ReactNode }>;
  defaultValue?: string;
}) {
  return (
    <Tabs
      orientation="vertical"
      defaultValue={defaultValue ?? tabs[0]?.key}
      className="flex flex-col gap-4 md:flex-row md:gap-6"
    >
      <TabsList className="flex h-auto w-full flex-row items-stretch justify-start gap-1 overflow-x-auto rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2 md:w-56 md:flex-col md:overflow-visible">
        {tabs.map((t) => (
          <TabsTrigger
            key={t.key}
            value={t.key}
            title={t.label}
            className="justify-start truncate rounded-lg px-3 py-2 text-left"
          >
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <div className="min-w-0 flex-1">
        {tabs.map((t) => (
          <TabsContent
            key={t.key}
            value={t.key}
            forceMount
            className="m-0 focus-visible:outline-none"
          >
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
              {t.content}
            </div>
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
}
