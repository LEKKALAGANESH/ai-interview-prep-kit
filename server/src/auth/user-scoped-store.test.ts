import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryKitStore, UserScopedKitStore } from "../persistence/store.js";
import type { Kit } from "@trao/interview-prep-shared/kit.js";

const kit = {
  source: {company:"Example",company_url:"https://example.com",role:"Engineer",location:"",jd_chars:10,researched_at:"2026-01-01T00:00:00.000Z",pages_used:[]},
  company_brief: {summary:"Example",what_they_do:"Example",sources:[]},
  role: {title:"Engineer",seniority:"Junior",responsibilities:[],requirements:[]},
  questions: [],
  flashcards: [],
  schedule: {days_available:1,days:[{day:1,focus:"",question_ids:[],minutes:0}]},
  coverage: {uncovered_requirement_ids:[],passes:2},
} as Kit;

test("user-scoped stores cannot read another user's kit", async () => {
  const base = new InMemoryKitStore();
  const userA = new UserScopedKitStore(base, "usr_a");
  const userB = new UserScopedKitStore(base, "usr_b");

  await userA.save("kit_same", kit);
  assert.ok(await userA.getById("kit_same"));
  assert.equal(await userB.getById("kit_same"), null);
});
