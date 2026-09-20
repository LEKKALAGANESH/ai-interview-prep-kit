export type BatchCase = { line: number; jd: string; company_url: string; days: number; error?: string };

// Minimal RFC 4180 reader: quoted fields may contain commas, quotes ("") and newlines.
function csvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; } else if (c === '"') quoted = false; else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = ""; rows.push(row); row = [];
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

function validate(line: number, jd: unknown, url: unknown, days: unknown, defaultDays: number): BatchCase {
  const text = typeof jd === "string" ? jd.trim() : "";
  const link = typeof url === "string" ? url.trim() : "";
  const n = days === undefined || days === "" ? defaultDays : Number(days);
  let error: string | undefined;
  if (!text) error = "Missing job description (jd).";
  else if (!/^https?:\/\/[^\s]+$/i.test(link)) error = "company_url must start with http:// or https://.";
  else if (!Number.isInteger(n) || n < 1 || n > 60) error = "days must be a whole number from 1 to 60.";
  return { line, jd: text, company_url: link, days: n, error };
}

// Accepts a JSON array of {jd, company_url, days?} or a CSV with those headers.
export function parseCases(text: string, defaultDays: number): BatchCase[] {
  const body = text.replace(/^\uFEFF/, "").trim();
  if (!body) throw new Error("The file is empty.");
  if (body.startsWith("[") || body.startsWith("{")) {
    const parsed: unknown = JSON.parse(body);
    if (!Array.isArray(parsed)) throw new Error("JSON must be an array of cases.");
    return parsed.map((c, i) => {
      const o = (c && typeof c === "object" ? c : {}) as Record<string, unknown>;
      return validate(i + 1, o.jd, o.company_url, o.days, defaultDays);
    });
  }
  const [header, ...rows] = csvRows(body);
  const col = (name: string) => header.map((h) => h.trim().toLowerCase()).indexOf(name);
  const [jd, url, days] = [col("jd"), col("company_url"), col("days")];
  if (jd < 0 || url < 0) throw new Error("CSV needs jd and company_url columns (days is optional).");
  return rows.map((r, i) => validate(i + 1, r[jd], r[url], days < 0 ? undefined : r[days], defaultDays));
}
