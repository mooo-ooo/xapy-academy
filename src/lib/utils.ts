import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * URL-safe slugifier. Handles Vietnamese diacritics + most European
 * accents by NFD-stripping combining marks, then lowercases, replaces
 * any non-alphanumeric run with a single dash, and trims edge dashes.
 *
 * Examples:
 *   slugify("Delta là gì: đọc dòng lệnh")  → "delta-la-gi-doc-dong-lenh"
 *   slugify("Order Flow / Footprints")     → "order-flow-footprints"
 *   slugify("VWAP — running average")      → "vwap-running-average"
 */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    // Strip combining marks (the diacritic part) and keep base letters
    .replace(/[̀-ͯ]/g, "")
    // Vietnamese đ/Đ has no combining mark — handle manually
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    // Collapse non-alphanumerics into a single dash
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}
