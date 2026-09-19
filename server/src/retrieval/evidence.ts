import type { ResearchPage } from "./research.js";

export type EvidenceClaim = {
  claim: string;
  source_url: string;
  source_type: "company-primary" | "public-interview" | "other";
  evidence: string;
  confidence_basis: string;
  relevance?: number;
};

export type RankedEvidence = EvidenceClaim & { score: number };

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function dedupeEvidence(claims: EvidenceClaim[]): EvidenceClaim[] {
  const seen = new Set<string>();
  return claims.filter((claim) => {
    const key = `${claim.source_url}|${normalize(claim.claim)}|${normalize(claim.evidence)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function rankEvidence(claims: EvidenceClaim[], query = ""): RankedEvidence[] {
  const q = new Set(normalize(query).split(" ").filter(Boolean));
  return dedupeEvidence(claims)
    .map((claim) => {
      const text = normalize(`${claim.claim} ${claim.evidence}`);
      const overlap = q.size ? [...q].filter((token) => text.includes(token)).length / q.size : 0;
      const authority = claim.source_type === "company-primary" ? 4 : claim.source_type === "public-interview" ? 2 : 1;
      const explicit = /official|company page|documentation|careers/i.test(claim.confidence_basis) ? 2 : 0;
      const score = authority + explicit + overlap * 4 + Math.min(claim.evidence.length / 1000, 1);
      return { ...claim, score };
    })
    .sort((a, b) => b.score - a.score);
}

export function researchPagesToClaims(pages: ResearchPage[]): EvidenceClaim[] {
  return pages.map((page) => ({
    claim: page.title || "Company page evidence",
    source_url: page.url,
    source_type: "company-primary",
    evidence: page.text.slice(0, 1800),
    confidence_basis: "company primary page",
  }));
}

export function buildRankedEvidencePacket(claims: EvidenceClaim[], query = "", maxChars = 9000): string {
  const ranked = rankEvidence(claims, query);
  let used = 0;
  const blocks: string[] = [];
  const counters = { "company-primary": 0, "public-interview": 0, other: 0 };
  for (const item of ranked) {
    const block = [
      `[${item.source_type === "company-primary" ? "COMPANY_PRIMARY" : item.source_type === "public-interview" ? "PUBLIC_INTERVIEW" : "OTHER"}_${++counters[item.source_type]}]`,
      `Source type: ${item.source_type}`,
      `URL: ${item.source_url}`,
      `Claim: ${item.claim}`,
      `Evidence: ${item.evidence}`,
      `Confidence basis: ${item.confidence_basis}`,
    ].join("\n");
    if (used + block.length > maxChars) break;
    blocks.push(block);
    used += block.length;
  }
  return blocks.join("\n\n");
}

export type EvidenceConflict = { key: string; claims: EvidenceClaim[] };

export function detectEvidenceConflicts(claims: EvidenceClaim[]): EvidenceConflict[] {
  const groups = new Map<string, EvidenceClaim[]>();
  for (const claim of dedupeEvidence(claims)) {
    const key = normalize(claim.claim).split(" ").slice(0, 5).join(" ");
    if (!key) continue;
    const list = groups.get(key) ?? [];
    list.push(claim);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .filter(([, items]) => new Set(items.map((item) => normalize(item.evidence))).size > 1 && items.length > 1)
    .map(([key, items]) => ({ key, claims: items }));
}
