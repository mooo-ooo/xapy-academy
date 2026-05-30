import { prisma } from "@/lib/db";

/**
 * Maps every admin action code to the kind of entity its `target` field
 * holds, so we can batch-fetch a human-readable name to show instead of
 * the raw cuid. Unknown codes default to "none" (target shown as-is).
 */
type TargetKind =
  | "user"
  | "article"
  | "module"
  | "tag"
  | "site"
  | "upload"
  | "locale"
  | "none";

const ACTION_TARGET_KIND: Record<string, TargetKind> = {
  USER_CREATE: "user",
  USER_ROLE_CHANGE: "user",
  USER_ACTIVATE: "user",
  USER_DEACTIVATE: "user",
  USER_PASSWORD_RESET: "user",
  USER_LANG_CHANGE: "user",
  USER_IMPERSONATE: "user",
  USER_DELETE: "user",
  USER_REGISTER: "user",
  MODULE_CREATE: "module",
  MODULE_UPDATE: "module",
  MODULE_DELETE: "module",
  MODULE_TRANSLATION_UPSERT: "module",
  MODULE_REORDER: "module",
  ARTICLE_CREATE: "article",
  ARTICLE_SOURCE_UPDATE_META: "article",
  ARTICLE_SOURCE_UPDATE_BODY: "article",
  ARTICLE_STATUS: "article",
  ARTICLE_TAGS_SET: "article",
  ARTICLE_STATS_UPDATE: "article",
  TAG_CREATE: "tag",
  TAG_TRANSLATION_UPSERT: "tag",
  TAG_TRENDING: "tag",
  TAG_DELETE: "tag",
  TRANSLATION_ASSIGN: "article",
  TRANSLATION_SAVE: "article",
  TRANSLATION_PENDING: "article",
  TRANSLATION_IN_PROGRESS: "article",
  TRANSLATION_REVIEW: "article",
  TRANSLATION_PUBLISHED: "article",
  SITE_SETTINGS_UPDATE: "site",
  UPLOAD: "upload",
  LOCALE_ADDED: "locale",
};

/** Stable list of all action codes (used for i18n key set). */
export const AUDIT_ACTIONS = Object.keys(ACTION_TARGET_KIND);

export type AuditLogRow = {
  id: string;
  actorId: string;
  action: string;
  target: string | null;
  meta: unknown;
  createdAt: Date;
};

export type EnrichedAuditEntry = AuditLogRow & {
  actorName: string;
  targetLabel: string;
  actionLabel: string;
};

/**
 * Resolves actor names + target names in one round-trip per entity type,
 * then runs each action code through the caller-supplied i18n lookup so
 * the UI shows e.g. "Anh A · Cập nhật tag cho bài · Delta explained"
 * instead of "ARTICLE_TAGS_SET · cmpjflfqz0033drywu7tcx17z".
 */
export async function enrichAuditEntries(
  entries: AuditLogRow[],
  actionLabel: (action: string) => string,
): Promise<EnrichedAuditEntry[]> {
  if (entries.length === 0) return [];

  const userIds = new Set<string>();
  const articleIds = new Set<string>();
  const moduleIds = new Set<string>();
  const tagIds = new Set<string>();

  for (const e of entries) {
    userIds.add(e.actorId);
    if (!e.target) continue;
    switch (ACTION_TARGET_KIND[e.action] ?? "none") {
      case "user":
        userIds.add(e.target);
        break;
      case "article":
        articleIds.add(e.target);
        break;
      case "module":
        moduleIds.add(e.target);
        break;
      case "tag":
        tagIds.add(e.target);
        break;
    }
  }

  const [users, articles, modules, tags] = await Promise.all([
    userIds.size > 0
      ? prisma.user.findMany({
          where: { id: { in: [...userIds] } },
          select: { id: true, name: true, email: true },
        })
      : Promise.resolve([]),
    articleIds.size > 0
      ? prisma.article.findMany({
          where: { id: { in: [...articleIds] } },
          include: {
            translations: {
              where: { locale: "en" },
              take: 1,
              select: { title: true },
            },
          },
        })
      : Promise.resolve([]),
    moduleIds.size > 0
      ? prisma.module.findMany({
          where: { id: { in: [...moduleIds] } },
          include: {
            translations: {
              where: { locale: "en" },
              take: 1,
              select: { name: true },
            },
          },
        })
      : Promise.resolve([]),
    tagIds.size > 0
      ? prisma.tag.findMany({
          where: { id: { in: [...tagIds] } },
          include: {
            translations: {
              where: { locale: "en" },
              take: 1,
              select: { name: true },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  const userMap = new Map(users.map((u) => [u.id, u.name ?? u.email]));
  const articleMap = new Map(
    articles.map((a) => [a.id, a.translations[0]?.title ?? a.id]),
  );
  const moduleMap = new Map(
    modules.map((m) => [m.id, m.translations[0]?.name ?? m.id]),
  );
  const tagMap = new Map(
    tags.map((t) => [t.id, t.translations[0]?.name ?? t.id]),
  );

  return entries.map((e) => {
    const kind = ACTION_TARGET_KIND[e.action] ?? "none";
    let targetLabel: string;
    if (!e.target) {
      targetLabel = "—";
    } else if (kind === "user") {
      targetLabel = userMap.get(e.target) ?? e.target;
    } else if (kind === "article") {
      targetLabel = articleMap.get(e.target) ?? e.target;
    } else if (kind === "module") {
      targetLabel = moduleMap.get(e.target) ?? e.target;
    } else if (kind === "tag") {
      targetLabel = tagMap.get(e.target) ?? e.target;
    } else {
      // site / upload / locale / none — already human-readable
      targetLabel = e.target;
    }

    return {
      ...e,
      actorName: userMap.get(e.actorId) ?? e.actorId,
      targetLabel,
      actionLabel: actionLabel(e.action),
    };
  });
}
