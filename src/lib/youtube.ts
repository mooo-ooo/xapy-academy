export type ParsedYouTube = {
  id: string;
  start?: number;
};

const ID_RE = /^[A-Za-z0-9_-]{11}$/;
const YT_HOSTS = new Set([
  "youtube.com",
  "youtube-nocookie.com",
  "youtu.be",
]);

export function parseYouTubeId(raw: string): ParsedYouTube | null {
  let s = raw.trim();
  if (!s) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) {
    s = `https://${s.replace(/^\/+/, "")}`;
  }

  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;

  const host = u.hostname.replace(/^(www\.|m\.)/, "");
  if (!YT_HOSTS.has(host)) return null;

  let id: string | null = null;
  if (host === "youtu.be") {
    id = u.pathname.split("/")[1] ?? null;
  } else if (u.pathname === "/watch") {
    id = u.searchParams.get("v");
  } else {
    const m = /^\/(?:embed|shorts|live|v)\/([^/?#]+)/.exec(u.pathname);
    if (m) id = m[1];
  }

  if (!id || !ID_RE.test(id)) return null;

  const start = parseStartSeconds(
    u.searchParams.get("t") ?? u.searchParams.get("start"),
  );
  return start != null ? { id, start } : { id };
}

function parseStartSeconds(value: string | null): number | undefined {
  if (!value) return undefined;
  if (/^\d+$/.test(value)) return Number(value);
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value);
  if (!m || (!m[1] && !m[2] && !m[3])) return undefined;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

export function youtubeEmbedSrc(id: string, start?: number): string {
  const base = `https://www.youtube-nocookie.com/embed/${id}`;
  return start && start > 0 ? `${base}?start=${start}` : base;
}

export function isYouTubeUrl(raw: string): boolean {
  return parseYouTubeId(raw) !== null;
}
