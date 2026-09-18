import { z } from "zod";
import type { Requirement, Role } from "./kit.js";

export const RawRequirementSchema = z.object({
  text: z.string().trim().min(1),
  kind: z.enum(["technical", "behavioural", "domain"]),
  priority: z.enum(["must", "nice"]),
});

export const RawRoleExtractionSchema = z.object({
  title: z.string().trim(),
  seniority: z.string().trim(),
  responsibilities: z.array(z.string().trim().min(1)),
  requirements: z.array(RawRequirementSchema),
});

export type RawRoleExtraction = z.infer<typeof RawRoleExtractionSchema>;

export function normalizeRequirementText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.;,]+$/, "");
}

function canonicalKey(text: string): string {
  return normalizeRequirementText(text)
    .toLowerCase()
    .replace(/\bexperience (?:with|in)\b/g, "")
    .replace(/\bproficiency (?:in|with)\b/g, "")
    .replace(/\bknowledge of\b/g, "")
    .replace(/\bskills? (?:in|with)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeRequirements(
  requirements: RawRequirementExtraction[],
): Requirement[] {
  const seen = new Map<string, Requirement>();

  for (const item of requirements) {
    const text = normalizeRequirementText(item.text);
    if (!text) continue;

    const key = canonicalKey(text);
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, {
        id: "",
        text,
        kind: item.kind,
        priority: item.priority,
      });
      continue;
    }

    if (existing.priority === "nice" && item.priority === "must") {
      existing.priority = "must";
    }
  }

  return [...seen.values()].map((requirement, index) => ({
    ...requirement,
    id: `r${index + 1}`,
  }));
}

export function normalizeRoleExtraction(raw: RawRoleExtraction): Role {
  return {
    title: raw.title,
    seniority: raw.seniority,
    responsibilities: raw.responsibilities
      .map((value) => value.trim().replace(/\s+/g, " "))
      .filter(Boolean),
    requirements: normalizeRequirements(raw.requirements),
  };
}
