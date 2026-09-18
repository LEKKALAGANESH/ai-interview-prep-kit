import { createHash } from "node:crypto";
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

export type RawRequirementExtraction = z.infer<typeof RawRequirementSchema>;
export type RawRoleExtraction = z.infer<typeof RawRoleExtractionSchema>;

export type RequirementEvidence = {
  requirement: RawRequirementExtraction;
  evidence: string;
  prioritySignal: "must" | "nice" | "none";
};

export function normalizeRequirementText(text: string): string {
  return text.trim().replace(/\s+/g, " ").replace(/[.;,]+$/, "");
}

function canonicalKey(text: string): string {
  return normalizeRequirementText(text).toLowerCase()
    .replace(/\bexperience (?:with|in)\b/g, "")
    .replace(/\bproficiency (?:in|with)\b/g, "")
    .replace(/\bknowledge of\b/g, "")
    .replace(/\bskills? (?:in|with)\b/g, "")
    .replace(/\s+/g, " ").trim();
}

function stableRequirementId(text: string): string {
  return `r_${createHash("sha256").update(canonicalKey(text)).digest("hex").slice(0, 10)}`;
}

function containsEvidence(jd: string, requirementText: string): boolean {
  const normalizedJd = jd.toLowerCase().replace(/\s+/g, " ");
  const normalizedRequirement = normalizeRequirementText(requirementText).toLowerCase();
  if (normalizedJd.includes(normalizedRequirement)) return true;
  const tokens = normalizedRequirement.replace(/[^a-z0-9+#.\-]+/g, " ").split(/\s+/).filter((t) => t.length >= 3);
  if (!tokens.length) return false;
  const hits = tokens.filter((token) => normalizedJd.includes(token)).length;
  return hits / tokens.length >= 0.7;
}

function inferPrioritySignal(jd: string, requirementText: string): "must" | "nice" | "none" {
  const normalized = jd.toLowerCase().replace(/\s+/g, " ");
  const text = normalizeRequirementText(requirementText).toLowerCase();
  const must = ["required", "mandatory", "essential", "must-have", "must have", "minimum"];
  const nice = ["preferred", "nice to have", "bonus", "plus", "desirable"];
  const sentences = normalized.split(/[.!?\n]+/);
  const sentence = sentences.find((s) => s.includes(text)) ?? "";
  if (must.some((signal) => sentence.includes(signal))) return "must";
  if (nice.some((signal) => sentence.includes(signal))) return "nice";
  return "none";
}

export function validateRequirementEvidence(jd: string, requirements: RawRequirementExtraction[]): RequirementEvidence[] {
  return requirements.map((requirement) => ({
    requirement: { ...requirement, text: normalizeRequirementText(requirement.text) },
    evidence: containsEvidence(jd, requirement.text) ? normalizeRequirementText(requirement.text) : "",
    prioritySignal: inferPrioritySignal(jd, requirement.text),
  })).filter((item) => item.evidence.length > 0);
}

export function applyPrioritySafeguards(jd: string, requirements: RawRequirementExtraction[]): RawRequirementExtraction[] {
  return validateRequirementEvidence(jd, requirements).map(({ requirement, prioritySignal }) => ({
    ...requirement,
    priority: prioritySignal === "must" ? "must" : prioritySignal === "nice" ? "nice" : requirement.priority,
  }));
}

export function normalizeRequirements(requirements: RawRequirementExtraction[]): Requirement[] {
  const seen = new Map<string, Requirement>();
  for (const item of requirements) {
    const text = normalizeRequirementText(item.text);
    if (!text) continue;
    const key = canonicalKey(text);
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, { id: stableRequirementId(text), text, kind: item.kind, priority: item.priority });
    } else if (existing.priority === "nice" && item.priority === "must") {
      existing.priority = "must";
    }
  }
  return [...seen.values()];
}

export function normalizeRoleExtraction(raw: RawRoleExtraction, jobDescription?: string): Role {
  const requirements = jobDescription ? applyPrioritySafeguards(jobDescription, raw.requirements) : raw.requirements;
  return {
    title: raw.title,
    seniority: raw.seniority,
    responsibilities: raw.responsibilities.map((value) => value.trim().replace(/\s+/g, " ")).filter(Boolean),
    requirements: normalizeRequirements(requirements),
  };
}