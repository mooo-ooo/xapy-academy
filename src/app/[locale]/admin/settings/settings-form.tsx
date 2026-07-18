"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { ImageUpload } from "@/components/admin/image-upload";
import { FooterEditor } from "@/components/admin/footer-editor";
import { Loader2 } from "lucide-react";
import { updateSiteSettingAction } from "./actions";
import type { FooterConfig } from "@/lib/data/site";

type HeroEntry = { title?: string; tagline?: string };

type Initial = {
  siteName: string;
  tagline: string | null;
  logoUrl: string | null;
  logoUrlLight: string | null;
  logoUrlDark: string | null;
  faviconUrl: string | null;
  defaultOgImageUrl: string | null;
  defaultMetaDescription: string | null;
  contactEmail: string | null;
  twitterHandle: string | null;
  allowSelfSignup: boolean;
  signupRequiresApproval: boolean;
  supportedLocales: string[];
  publicLocale: string;
  heroImageUrl: string | null;
  heroTranslations: Record<string, HeroEntry>;
  footer: FooterConfig;
};

export function SettingsForm({
  initial,
  allLocales,
}: {
  initial: Initial;
  /** Every locale shipping in messages/*.json. Admin picks a subset. */
  allLocales: string[];
}) {
  // Locale state is React-controlled (not raw FormData) so we can
  // hide the publicLocale options that fall out of the supported set
  // as the admin ticks/un-ticks checkboxes.
  const [supported, setSupported] = useState<string[]>(initial.supportedLocales);
  const [publicLocale, setPublicLocale] = useState<string>(initial.publicLocale);
  const [heroTr, setHeroTr] = useState<Record<string, HeroEntry>>(
    initial.heroTranslations ?? {},
  );
  const [heroLocale, setHeroLocale] = useState<string>(initial.publicLocale);
  const [footer, setFooter] = useState<FooterConfig>(initial.footer);
  const [footerLocale, setFooterLocale] = useState<string>(
    initial.publicLocale,
  );
  const router = useRouter();
  const t = useTranslations("admin.settings");
  const [pending, startTransition] = useTransition();

  function setHeroField(field: keyof HeroEntry, value: string) {
    setHeroTr((prev) => ({
      ...prev,
      [heroLocale]: { ...prev[heroLocale], [field]: value },
    }));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateSiteSettingAction({
        siteName: String(fd.get("siteName") ?? ""),
        tagline: String(fd.get("tagline") ?? ""),
        logoUrl: String(fd.get("logoUrl") ?? ""),
        logoUrlLight: String(fd.get("logoUrlLight") ?? ""),
        logoUrlDark: String(fd.get("logoUrlDark") ?? ""),
        faviconUrl: String(fd.get("faviconUrl") ?? ""),
        defaultOgImageUrl: String(fd.get("defaultOgImageUrl") ?? ""),
        defaultMetaDescription: String(fd.get("defaultMetaDescription") ?? ""),
        contactEmail: String(fd.get("contactEmail") ?? ""),
        twitterHandle: String(fd.get("twitterHandle") ?? ""),
        allowSelfSignup: fd.get("allowSelfSignup") === "on",
        signupRequiresApproval: fd.get("signupRequiresApproval") === "on",
        supportedLocales: supported,
        publicLocale,
        heroImageUrl: String(fd.get("heroImageUrl") ?? ""),
        heroTranslations: heroTr,
        footerConfig: footer,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(t("saved"));
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">{t("tabs.general")}</TabsTrigger>
          <TabsTrigger value="branding">{t("tabs.branding")}</TabsTrigger>
          <TabsTrigger value="hero">{t("tabs.hero")}</TabsTrigger>
          <TabsTrigger value="footer">{t("tabs.footer")}</TabsTrigger>
          <TabsTrigger value="locales">{t("tabs.locales")}</TabsTrigger>
          <TabsTrigger value="seo">{t("tabs.seo")}</TabsTrigger>
          <TabsTrigger value="contact">{t("tabs.contact")}</TabsTrigger>
        </TabsList>

        {/*
          `forceMount` keeps every tab's content in the DOM (Radix sets
          `hidden` on inactive panels) so FormData still includes every
          field at submit time regardless of which tab is visible.
        */}
        <TabsContent value="general" forceMount className="space-y-6">
          <Section
            title={t("general.title")}
            description={t("general.description")}
          >
            <Field id="siteName" label={t("general.siteNameLabel")} required>
              <Input
                id="siteName"
                name="siteName"
                defaultValue={initial.siteName}
                required
                placeholder={t("general.siteNamePlaceholder")}
              />
            </Field>
            <Field
              id="tagline"
              label={t("general.taglineLabel")}
              hint={t("general.taglineHint")}
            >
              <Textarea
                id="tagline"
                name="tagline"
                rows={2}
                defaultValue={initial.tagline ?? ""}
                maxLength={280}
                placeholder={t("general.taglinePlaceholder")}
              />
            </Field>
          </Section>
          <Section
            title={t("signup.title")}
            description={t("signup.description")}
          >
            <CheckboxField
              name="allowSelfSignup"
              defaultChecked={initial.allowSelfSignup}
              label={t("signup.allowSelfSignupLabel")}
              hint={t("signup.allowSelfSignupHint")}
            />
            <CheckboxField
              name="signupRequiresApproval"
              defaultChecked={initial.signupRequiresApproval}
              label={t("signup.requiresApprovalLabel")}
              hint={t("signup.requiresApprovalHint")}
            />
          </Section>
        </TabsContent>

        <TabsContent value="branding" forceMount className="space-y-6">
          <Section
            title={t("branding.title")}
            description={t("branding.description")}
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Field
                id="logoUrlLight"
                label={t("branding.logoLightLabel")}
                hint={t("branding.logoLightHint")}
              >
                <ImageUpload
                  name="logoUrlLight"
                  initial={initial.logoUrlLight ?? ""}
                />
              </Field>
              <Field
                id="logoUrlDark"
                label={t("branding.logoDarkLabel")}
                hint={t("branding.logoDarkHint")}
              >
                <ImageUpload
                  name="logoUrlDark"
                  initial={initial.logoUrlDark ?? ""}
                />
              </Field>
            </div>
            <Field
              id="logoUrl"
              label={t("branding.logoUrlLabel")}
              hint={t("branding.logoFallbackHint")}
            >
              <ImageUpload name="logoUrl" initial={initial.logoUrl ?? ""} />
            </Field>
            <Field
              id="faviconUrl"
              label={t("branding.faviconUrlLabel")}
              hint={t("branding.faviconUrlHint")}
            >
              <ImageUpload
                name="faviconUrl"
                initial={initial.faviconUrl ?? ""}
              />
            </Field>
          </Section>
        </TabsContent>

        <TabsContent value="hero" forceMount className="space-y-6">
          <Section title={t("hero.title")} description={t("hero.description")}>
            <Field
              id="heroImageUrl"
              label={t("hero.imageLabel")}
              hint={t("hero.imageHint")}
            >
              <ImageUpload
                name="heroImageUrl"
                initial={initial.heroImageUrl ?? ""}
              />
            </Field>

            <div className="flex flex-col gap-1.5 md:max-w-xs">
              <Label htmlFor="heroLocale">{t("hero.localeLabel")}</Label>
              <select
                id="heroLocale"
                value={heroLocale}
                onChange={(e) => setHeroLocale(e.target.value)}
                className="h-10 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--inset))] px-3 text-sm text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent-emerald))]"
              >
                {supported.map((l) => (
                  <option key={l} value={l}>
                    {l.toUpperCase()} — {localeLabel(l)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                {t("hero.localeHint")}
              </p>
            </div>

            <Field id="heroTitle" label={t("hero.titleLabel")}>
              <Input
                id="heroTitle"
                value={heroTr[heroLocale]?.title ?? ""}
                onChange={(e) => setHeroField("title", e.target.value)}
                maxLength={200}
                placeholder={t("hero.titlePlaceholder")}
              />
            </Field>
            <Field id="heroTagline" label={t("hero.taglineLabel")}>
              <Textarea
                id="heroTagline"
                rows={2}
                value={heroTr[heroLocale]?.tagline ?? ""}
                onChange={(e) => setHeroField("tagline", e.target.value)}
                maxLength={400}
                placeholder={t("hero.taglinePlaceholder")}
              />
            </Field>
          </Section>
        </TabsContent>

        <TabsContent value="footer" forceMount className="space-y-6">
          <Section
            title={t("footer.title")}
            description={t("footer.description")}
          >
            <FooterEditor
              value={footer}
              onChange={setFooter}
              locale={footerLocale}
              onLocaleChange={setFooterLocale}
              locales={supported}
              labels={{
                enabled: t("footer.enabledLabel"),
                enabledHint: t("footer.enabledHint"),
                social: t("footer.socialLabel"),
                socialHint: t("footer.socialHint"),
                addSocial: t("footer.addSocial"),
                urlPlaceholder: t("footer.urlPlaceholder"),
                localeLabel: t("footer.localeLabel"),
                intro: t("footer.introLabel"),
                introPlaceholder: t("footer.introPlaceholder"),
                copyright: t("footer.copyrightLabel"),
                copyrightHint: t("footer.copyrightHint"),
                columns: t("footer.columnsLabel"),
                addColumn: t("footer.addColumn"),
                columnTitle: t("footer.columnTitlePlaceholder"),
                addLink: t("footer.addLink"),
                linkLabel: t("footer.linkLabelPlaceholder"),
                linkUrl: t("footer.linkUrlPlaceholder"),
              }}
            />
          </Section>
        </TabsContent>

        <TabsContent value="locales" forceMount className="space-y-6">
          <Section
            title={t("locales.title")}
            description={t("locales.description")}
          >
            <div className="flex flex-col gap-1.5">
              <Label>{t("locales.supportedLabel")}</Label>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {allLocales.map((l) => {
                  const checked = supported.includes(l);
                  const isLast = checked && supported.length === 1;
                  return (
                    <label
                      key={l}
                      className={
                        "flex items-center gap-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card-hover))] px-3 py-2 text-sm transition-colors " +
                        (isLast
                          ? "cursor-not-allowed opacity-60"
                          : "cursor-pointer hover:bg-[hsl(var(--hover))]")
                      }
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isLast}
                        onChange={(e) => {
                          setSupported((prev) => {
                            const next = e.target.checked
                              ? [...new Set([...prev, l])]
                              : prev.filter((x) => x !== l);
                            // Keep publicLocale in sync when it falls
                            // out of the supported set.
                            if (
                              !next.includes(publicLocale) &&
                              next.length > 0
                            ) {
                              setPublicLocale(next[0]);
                            }
                            return next;
                          });
                        }}
                        className="h-4 w-4 accent-[hsl(var(--accent-emerald))]"
                      />
                      <span className="font-mono text-xs uppercase text-[hsl(var(--muted-foreground))]">
                        {l}
                      </span>
                      <span className="text-[hsl(var(--foreground))]">
                        {localeLabel(l)}
                      </span>
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                {t("locales.supportedHint")}
              </p>
            </div>

            <div className="flex flex-col gap-1.5 md:max-w-xs">
              <Label htmlFor="publicLocale">
                {t("locales.publicLocaleLabel")}
              </Label>
              <select
                id="publicLocale"
                value={publicLocale}
                onChange={(e) => setPublicLocale(e.target.value)}
                className="h-10 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--inset))] px-3 text-sm text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent-emerald))]"
              >
                {supported.map((l) => (
                  <option key={l} value={l}>
                    {l.toUpperCase()} — {localeLabel(l)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                {t("locales.publicLocaleHint")}
              </p>
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="seo" forceMount className="space-y-6">
          <Section title={t("tabs.seo")}>
            <Field
              id="defaultMetaDescription"
              label={t("general.defaultMetaDescriptionLabel")}
              hint={t("general.defaultMetaDescriptionHint")}
            >
              <Textarea
                id="defaultMetaDescription"
                name="defaultMetaDescription"
                rows={3}
                defaultValue={initial.defaultMetaDescription ?? ""}
                maxLength={320}
                placeholder={t("general.defaultMetaDescriptionPlaceholder")}
              />
            </Field>
            <Field
              id="defaultOgImageUrl"
              label={t("branding.defaultOgImageUrlLabel")}
              hint={t("branding.defaultOgImageUrlHint")}
            >
              <ImageUpload
                name="defaultOgImageUrl"
                initial={initial.defaultOgImageUrl ?? ""}
              />
            </Field>
          </Section>
        </TabsContent>

        <TabsContent value="contact" forceMount className="space-y-6">
          <Section
            title={t("contact.title")}
            description={t("contact.description")}
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Field
                id="contactEmail"
                label={t("contact.emailLabel")}
                hint={t("contact.emailHint")}
              >
                <Input
                  id="contactEmail"
                  name="contactEmail"
                  type="email"
                  defaultValue={initial.contactEmail ?? ""}
                  placeholder={t("contact.emailPlaceholder")}
                />
              </Field>
              <Field
                id="twitterHandle"
                label={t("contact.twitterLabel")}
                hint={t("contact.twitterHint")}
              >
                <Input
                  id="twitterHandle"
                  name="twitterHandle"
                  defaultValue={initial.twitterHandle ?? ""}
                  placeholder={t("contact.twitterPlaceholder")}
                />
              </Field>
            </div>
          </Section>
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-4 z-10 flex items-center justify-end gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card-hover))] p-4 backdrop-blur">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 size={14} className="animate-spin" />}
          {t("save")}
        </Button>
      </div>
    </form>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold uppercase tracking-[0.6px] text-[hsl(var(--muted-foreground))]">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

/** Human-readable English name for a locale, e.g. "en" → "English". */
function localeLabel(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

function CheckboxField({
  name,
  defaultChecked,
  label,
  hint,
}: {
  name: string;
  defaultChecked: boolean;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card-hover))] p-4 transition-colors hover:bg-[hsl(var(--hover))]">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 accent-[hsl(var(--accent-emerald))]"
      />
      <span className="flex flex-col gap-1">
        <span className="text-sm font-medium text-[hsl(var(--foreground))]">
          {label}
        </span>
        {hint && (
          <span className="text-xs text-[hsl(var(--muted-foreground))]">
            {hint}
          </span>
        )}
      </span>
    </label>
  );
}

function Field({
  id,
  label,
  hint,
  required,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      {children}
      {hint && (
        <p className="text-xs text-[hsl(var(--muted-foreground))]">{hint}</p>
      )}
    </div>
  );
}
