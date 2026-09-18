export type CleanPage = {
  title: string;
  text: string;
  links: string[];
};

export function cleanHtml(html: string): CleanPage {
  const title =
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";

  const links: string[] = [];
  const linkPattern = /<a\b[^>]*href=["']([^"'#]+)["'][^>]*>/gi;

  for (const match of html.matchAll(linkPattern)) {
    if (match[1]) links.push(match[1].trim());
  }

  let text = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();

  return {
    title,
    text,
    links: [...new Set(links)],
  };
}
