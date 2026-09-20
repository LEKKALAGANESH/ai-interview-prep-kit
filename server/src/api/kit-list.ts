import type { Kit } from "@trao/interview-prep-shared/kit.js";

export type KitSummary = {
  id: string;
  company: string;
  role: string;
  days: number;
  researched_at: string;
  requirements: number;
  must_haves: number;
  questions: number;
  flashcards: number;
  summary: string;
};

// Short card data for the "my kits" list; the full kit is only loaded when a card is opened.
export function summarizeKit(id: string, kit: Kit): KitSummary {
  const text = kit.company_brief.summary || kit.company_brief.what_they_do || "";
  return {
    id,
    company: kit.source.company,
    role: kit.role.title || kit.source.role,
    days: kit.schedule.days_available,
    researched_at: kit.source.researched_at,
    requirements: kit.role.requirements.length,
    must_haves: kit.role.requirements.filter((requirement) => requirement.priority === "must").length,
    questions: kit.questions.length,
    flashcards: kit.flashcards.length,
    summary: text.length > 180 ? `${text.slice(0, 177)}...` : text,
  };
}

export function summarizeKits(items: Array<{ id: string; kit: Kit }>): KitSummary[] {
  return items.map(({ id, kit }) => summarizeKit(id, kit)).sort((a, b) => b.researched_at.localeCompare(a.researched_at));
}
