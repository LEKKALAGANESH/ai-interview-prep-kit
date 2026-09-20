import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryKitStore, UserScopedKitStore } from "../persistence/store.js";
import type { Kit } from "@trao/interview-prep-shared/kit.js";
import { handleBuilder } from "../api/builder.js";

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


test("users can only update and delete their own kits", async () => {
  const base = new InMemoryKitStore();
  const userA = new UserScopedKitStore(base, "usr_a");
  const userB = new UserScopedKitStore(base, "usr_b");

  await userA.save("kit_a", kit);
  await userB.save("kit_b", kit);

  const updated = structuredClone(kit);
  updated.source.company = "Updated by A";
  await userA.update("kit_a", updated);
  assert.equal((await userA.getById("kit_a"))?.source.company, "Updated by A");

  await assert.rejects(() => userA.update("kit_b", updated), /Unknown kit/);
  assert.equal((await userB.getById("kit_b"))?.source.company, "Example");

  assert.equal(await userA.delete("kit_b"), false);
  assert.ok(await userB.getById("kit_b"));
  assert.equal(await userA.delete("kit_a"), true);
  assert.equal(await userA.getById("kit_a"), null);
});


test("a user cannot regenerate another user's kit through the scoped builder API", async () => {
  const base = new InMemoryKitStore();
  const userA = new UserScopedKitStore(base, "usr_a");
  const userB = new UserScopedKitStore(base, "usr_b");

  await userB.save("kit_b", kit);

  const response = await handleBuilder(
    new Request("http://app.test/api/kits/kit_b", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "regenerate_question", question_id: "q1" }),
    }),
    userA,
    "kit_b",
  );

  assert.equal(response.status, 404);
  assert.equal((await userB.getById("kit_b"))?.questions.length, 0);
});
