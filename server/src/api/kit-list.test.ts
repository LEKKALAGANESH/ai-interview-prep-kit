import test from "node:test";
import assert from "node:assert/strict";
import type { Kit } from "@trao/interview-prep-shared/kit.js";
import { InMemoryKitStore, UserScopedKitStore } from "../persistence/store.js";
import { summarizeKit, summarizeKits } from "./kit-list.js";

const fakeKit = (company: string, researchedAt: string, summary = "We build things."): Kit => ({
  source: { company, role: "Engineer", researched_at: researchedAt },
  company_brief: { summary, what_they_do: "" },
  role: { title: "Backend Engineer", requirements: [{ id: "r1", priority: "must" }, { id: "r2", priority: "nice" }] },
  questions: [{}, {}, {}],
  flashcards: [{}],
  schedule: { days_available: 5 },
} as unknown as Kit);

test("summarizeKit gives card data and truncates a long summary", () => {
  const card = summarizeKit("kit_1", fakeKit("Acme", "2026-09-20T00:00:00Z", "x".repeat(400)));
  assert.deepEqual({ ...card, summary: card.summary.length }, {
    id: "kit_1", company: "Acme", role: "Backend Engineer", days: 5, researched_at: "2026-09-20T00:00:00Z",
    requirements: 2, must_haves: 1, questions: 3, flashcards: 1, summary: 180,
  });
});

test("a user only lists their own kits, newest first", async () => {
  const base = new InMemoryKitStore();
  const alice = new UserScopedKitStore(base, "alice");
  const bob = new UserScopedKitStore(base, "bob");
  await alice.save("k_old", fakeKit("Old Co", "2026-09-01T00:00:00Z"));
  await alice.save("k_new", fakeKit("New Co", "2026-09-19T00:00:00Z"));
  await bob.save("k_bob", fakeKit("Bob Co", "2026-09-20T00:00:00Z"));

  const cards = summarizeKits(await alice.listForUser());
  assert.deepEqual(cards.map((card) => card.id), ["k_new", "k_old"]);
  assert.deepEqual(summarizeKits(await bob.listForUser()).map((card) => card.company), ["Bob Co"]);
});
