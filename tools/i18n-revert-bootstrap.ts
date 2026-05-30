/**
 * One-off bootstrap for the i18n revert:
 *
 * 1. Cleans `admin.uiStrings`, `admin.locales`, `admin.nav.localization`,
 *    `admin.nav.tabs.uiStrings` and `admin.nav.tabs.locales` from
 *    `messages/en.json` and `messages/vi.json` (the pages that used those
 *    keys were deleted).
 *
 * 2. Adds Phase-7 admin keys (Tags / Audit / DataTable chrome / Settings
 *    tabs / Article editTabs / Module reorder / preferredLang edit / etc.)
 *    to `messages/vi.json` with hand-written Vietnamese values, so /vi
 *    admin pages render fully in Vietnamese.
 *
 * 3. Scaffolds locale files for 8 additional common languages by copying
 *    the (cleaned) `en.json` — a starting point translators/devs edit by
 *    hand. Skips any locale that already exists.
 *
 * Idempotent — safe to re-run, but designed to run once after the revert.
 * Delete `tools/i18n-revert-bootstrap.ts` after running if you wish.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const MESSAGES = join(process.cwd(), "messages");

const CLEANUP_KEYS = [
  "admin.uiStrings",
  "admin.locales",
  "admin.nav.localization",
  "admin.nav.tabs.uiStrings",
  "admin.nav.tabs.locales",
];

const NEW_LANGS = ["es", "fr", "de", "ja", "ko", "zh", "pt", "ru"];

const VI_PHASE7: Record<string, string> = {
  // ---------- admin.nav ----------
  "admin.nav.content": "Nội dung",
  "admin.nav.audit": "Nhật ký kiểm tra",
  "admin.nav.tabs.articles": "Bài viết",
  "admin.nav.tabs.translations": "Bản dịch",
  "admin.nav.tabs.modules": "Chủ đề",
  "admin.nav.tabs.tags": "Tag",
  "admin.nav.tabs.general": "Chung",
  "admin.nav.tabs.branding": "Nhận diện",
  "admin.nav.tabs.seo": "SEO",
  "admin.nav.tabs.contact": "Liên hệ",

  // ---------- admin.table (DataTable chrome) ----------
  "admin.table.search": "Tìm kiếm…",
  "admin.table.all": "Tất cả",
  "admin.table.prev": "Trước",
  "admin.table.next": "Sau",
  "admin.table.pageOf": "Trang {page} / {total}",

  // ---------- admin.settings.tabs ----------
  "admin.settings.tabs.general": "Chung",
  "admin.settings.tabs.branding": "Nhận diện",
  "admin.settings.tabs.seo": "SEO",
  "admin.settings.tabs.contact": "Liên hệ",

  // ---------- admin.articles ----------
  "admin.articles.editTabs.content": "Nội dung",
  "admin.articles.editTabs.seo": "SEO & ảnh",
  "admin.articles.editTabs.tags": "Tag",
  "admin.articles.editTabs.translations": "Bản dịch",
  "admin.articles.table.views": "Lượt xem",
  "admin.articles.table.likes": "Lượt thích",
  "admin.articles.form.ogImageLabel": "Ảnh chia sẻ MXH (OG)",

  // ---------- admin.modules ----------
  "admin.modules.empty": "Chưa có chủ đề nào.",
  "admin.modules.reorder.up": "Đưa lên",
  "admin.modules.reorder.down": "Đưa xuống",

  // ---------- admin.users ----------
  "admin.users.empty": "Không có user khớp.",
  "admin.users.manageForm.langLabel": "Ngôn ngữ ưu tiên",
  "admin.users.manageForm.saveLang": "Lưu ngôn ngữ",
  "admin.users.manageForm.langUpdated": "Đã cập nhật ngôn ngữ",

  // ---------- admin.tags (entire namespace) ----------
  "admin.tags.title": "Tag",
  "admin.tags.subtitle":
    "Tag chủ đề điều khiển bộ lọc tìm kiếm và dải Trending trên trang chủ.",
  "admin.tags.newTag": "Tag mới",
  "admin.tags.backToTags": "Quay lại danh sách tag",
  "admin.tags.empty": "Chưa có tag nào.",
  "admin.tags.rowEdit": "Sửa",
  "admin.tags.trendingOn": "Trending",
  "admin.tags.trendingOff": "Tắt",
  "admin.tags.table.tag": "Tag",
  "admin.tags.table.translations": "Ngôn ngữ",
  "admin.tags.table.articles": "Bài viết",
  "admin.tags.table.trending": "Trending",
  "admin.tags.table.actions": "Hành động",
  "admin.tags.form.slugLabel": "Slug",
  "admin.tags.form.slugPlaceholder": "order-flow",
  "admin.tags.form.slugHint":
    "Chữ thường, số và dấu gạch ngang. Dùng trong URL và làm id ổn định.",
  "admin.tags.form.saveCreate": "Tạo tag",
  "admin.tags.form.createdToast": "Đã tạo tag",
  "admin.tags.new.title": "Tag mới",
  "admin.tags.new.subtitle":
    "Tạo tag, sau đó thêm tên hiển thị cho từng ngôn ngữ.",
  "admin.tags.edit.settings": "Cài đặt",
  "admin.tags.edit.translations": "Tên theo ngôn ngữ",
  "admin.tags.translationsForm.emptyTab": "trống",
  "admin.tags.translationsForm.nameLabel": "Tên",
  "admin.tags.translationsForm.namePlaceholder": "Order Flow",
  "admin.tags.translationsForm.saveButton": "Lưu {locale}",
  "admin.tags.translationsForm.savedToast": "Đã lưu {locale}",
  "admin.tags.delete.dialogTitle": "Xoá tag này?",
  "admin.tags.delete.dialogDesc":
    "Xoá tag và các bản dịch của nó. Không thể xoá tag đang được bài viết sử dụng.",
  "admin.tags.delete.cancel": "Huỷ",
  "admin.tags.delete.confirm": "Xoá",
  "admin.tags.delete.deleted": "Đã xoá tag",
  "admin.tags.articleTags.label": "Tag",
  "admin.tags.articleTags.save": "Lưu tag",
  "admin.tags.articleTags.saved": "Đã cập nhật tag",
  "admin.tags.articleTags.noneAvailable":
    "Chưa có tag. Hãy tạo tag ở mục Tag trước.",

  // ---------- admin.audit (entire namespace) ----------
  "admin.audit.title": "Nhật ký kiểm tra",
  "admin.audit.subtitle": "Mọi thay đổi của quản trị, mới nhất trên cùng.",
  "admin.audit.empty": "Chưa có mục kiểm tra nào.",
  "admin.audit.viewAll": "Xem tất cả",
  "admin.audit.table.actor": "Người thực hiện",
  "admin.audit.table.action": "Hành động",
  "admin.audit.table.target": "Đối tượng",
  "admin.audit.table.meta": "Chi tiết",
  "admin.audit.table.time": "Thời gian",
};

type Tree = Record<string, unknown>;

function isObj(v: unknown): v is Tree {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function deepSet(obj: Tree, dottedKey: string, value: string): void {
  const parts = dottedKey.split(".");
  let node: Tree = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!isObj(node[p])) node[p] = {};
    node = node[p] as Tree;
  }
  node[parts[parts.length - 1]] = value;
}

function deepDelete(obj: Tree, dottedKey: string): void {
  const parts = dottedKey.split(".");
  let node: Tree = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!isObj(node[p])) return;
    node = node[p] as Tree;
  }
  delete node[parts[parts.length - 1]];
}

function readJson(path: string): Tree {
  return JSON.parse(readFileSync(path, "utf-8")) as Tree;
}

function writeJson(path: string, data: Tree): void {
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

// Step 1: clean en.json
const enPath = join(MESSAGES, "en.json");
const en = readJson(enPath);
for (const key of CLEANUP_KEYS) deepDelete(en, key);
writeJson(enPath, en);
console.log(`[bootstrap] cleaned ${CLEANUP_KEYS.length} stale keys from en.json`);

// Step 2: update vi.json (clean + add Phase-7 keys)
const viPath = join(MESSAGES, "vi.json");
const vi = readJson(viPath);
for (const key of CLEANUP_KEYS) deepDelete(vi, key);
const viEntries = Object.entries(VI_PHASE7);
for (const [key, value] of viEntries) deepSet(vi, key, value);
writeJson(viPath, vi);
console.log(
  `[bootstrap] vi.json: cleaned ${CLEANUP_KEYS.length} stale + added ${viEntries.length} Phase-7 keys`,
);

// Step 3: scaffold new common languages from the (cleaned) en.json
let scaffolded = 0;
for (const code of NEW_LANGS) {
  const path = join(MESSAGES, `${code}.json`);
  if (existsSync(path)) {
    console.log(`[bootstrap] skip ${code}: ${code}.json already exists`);
    continue;
  }
  writeJson(path, en);
  scaffolded++;
  console.log(`[bootstrap] scaffolded ${code}.json from en.json`);
}
console.log(`[bootstrap] done. ${scaffolded}/${NEW_LANGS.length} new language files created.`);
