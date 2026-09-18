import test from "node:test";
import assert from "node:assert/strict";
import { generateAndPersistKit } from "./service.js";
import { InMemoryKitStore } from "../persistence/store.js";
import type { Role } from "@trao/interview-prep-shared/kit.js";

const role: Role = {
  title: "Frontend Engineer",
  seniority: "Junior",
  responsibilities: ["Build interfaces"],
  requirements: [
    { id: "r1", text: "React", kind: "technical", priority: "must" },
  ],
};

const research = {
  company_url: "https://example.com/",
  pages: [{ url: "https://example.com/", title: "Home", text: "Company", links: [] }],
  robots: { checked: true, allowed: true, source: "https://example.com/robots.txt", reason: "allowed" },
  skipped: [],
  public_interview_research: {
    attempted: false,
    found: false,
    results: [],
    note: "No provider configured",
  },
};

test("generates, validates, and persists the complete kit", async () => {
  const store = new InMemoryKitStore();

  const result = await generateAndPersistKit(
    {
      job_description: "React frontend engineer",
      company_url: "https://example.com/",
      days_available: 2,
    },
    {
      role,
      company: "Example",
      companyBrief: {
        summary: "Example",
        what_they_do: "Software",
        sources: ["https://example.com/"],
      },
      research,
      provider: {
        async generate() {
          return {
            questions: [{
              prompt: "How do you build a React component?",
              answer_outline: "Discuss composition.",
              difficulty: 3,
            }],
          };
        },
      },
    },
    store,
  );

  assert.ok(result.id);
  assert.equal(result.kit.coverage.can_ship, undefined);
  assert.equal(result.kit.schedule.days.length, 2);

  const loaded = await store.getById(result.id);
  assert.deepEqual(loaded, result.kit);
});

test("does not persist when coverage cannot ship", async () => {
  const store = new InMemoryKitStore();

  await assert.rejects(
    generateAndPersistKit(
      {
        job_description: "React frontend engineer",
        company_url: "https://example.com/",
        days_available: 1,
      },
      {
        role: {
          ...role,
          requirements: [
            ...role.requirements,
            { id: "r2", text: "SQL", kind: "technical", priority: "must" },
          ],
        },
        company: "Example",
        companyBrief: {
          summary: "Example",
          what_they_do: "Software",
          sources: ["https://example.com/"],
        },
        research,
        provider: {
          async generate(request) {
            if (request.userPrompt.includes("Requirement: SQL")) {
              throw new Error("SQL unavailable");
            }
            return {
              questions: [{
                prompt: "React question",
                answer_outline: "Outline",
                difficulty: 2,
              }],
            };
          },
        },
        maxPasses: 1,
      },
      store,
    ),
  );

  assert.equal(await store.getById("https://example.com/|Frontend Engineer|23"), null);
});
