/**
 * Parse admin list `searchParams` into a Prisma-ready slice + the echo used
 * by the <DataTable> shell. Domain `where` is built by each page; this only
 * handles pagination, sort, and the raw search term.
 */

export type SearchParams = Record<string, string | string[] | undefined>;

export type ListQueryConfig = {
  /** Sort keys the UI may request; anything else falls back to defaultSort. */
  sortable: readonly string[];
  defaultSort: string;
  defaultDir?: "asc" | "desc";
  pageSize?: number;
};

export type ParsedListQuery = {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
  sort: string;
  dir: "asc" | "desc";
  q: string;
  orderBy: Record<string, "asc" | "desc">;
  /** Flattened single-valued echo of the incoming params (for URL building). */
  raw: Record<string, string>;
};

function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export function buildListQuery(
  sp: SearchParams,
  cfg: ListQueryConfig,
): ParsedListQuery {
  const pageSize = cfg.pageSize ?? 20;
  const pageRaw = parseInt(first(sp.page), 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  const sortReq = first(sp.sort);
  const sort = cfg.sortable.includes(sortReq) ? sortReq : cfg.defaultSort;
  const dirReq = first(sp.dir);
  const dir: "asc" | "desc" =
    dirReq === "asc" || dirReq === "desc" ? dirReq : (cfg.defaultDir ?? "desc");

  const q = first(sp.q).trim();

  const raw: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) {
    const val = first(v);
    if (val) raw[k] = val;
  }

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
    sort,
    dir,
    q,
    orderBy: { [sort]: dir },
    raw,
  };
}
