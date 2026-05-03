/** Parse một dòng thành clip tin: URL | tiêu đề | preview — hoặc tab — hoặc chỉ URL. */

export type ParsedNewsLine = { url: string; title: string; preview?: string };

function hostTitle(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.slice(0, 40);
  }
}

export function parseNewsImportLine(line: string): ParsedNewsLine | null {
  const raw = line.trim();
  if (!raw || raw.startsWith("#")) return null;

  if (raw.includes("\t")) {
    const [u, t, p] = raw.split("\t").map((x) => x.trim());
    if (!u?.startsWith("http")) return null;
    try {
      new URL(u);
    } catch {
      return null;
    }
    return {
      url: u,
      title: t || hostTitle(u),
      preview: p || undefined,
    };
  }

  if (raw.includes("|")) {
    const parts = raw.split("|").map((x) => x.trim());
    const u = parts[0];
    if (!u?.startsWith("http")) return null;
    try {
      new URL(u);
    } catch {
      return null;
    }
    return {
      url: u,
      title: parts[1] || hostTitle(u),
      preview: parts[2] || undefined,
    };
  }

  if (!raw.startsWith("http")) return null;
  try {
    new URL(raw);
  } catch {
    return null;
  }
  return { url: raw, title: hostTitle(raw) };
}

export function parseNewsImportBlock(text: string, max = 80): ParsedNewsLine[] {
  const out: ParsedNewsLine[] = [];
  for (const line of text.split(/\r?\n/)) {
    const p = parseNewsImportLine(line);
    if (p) out.push(p);
    if (out.length >= max) break;
  }
  return out;
}
