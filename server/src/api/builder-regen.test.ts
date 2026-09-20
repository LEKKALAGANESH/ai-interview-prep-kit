import test from "node:test";
import assert from "node:assert/strict";
import type { Kit } from "@trao/interview-prep-shared/kit.js";
import { handleBuilder } from "./builder.js";
import { handlePins } from "./pins.js";
import { createGenerationJob, getGenerationJob } from "./generation-job.js";
import { InMemoryKitStore, UserScopedKitStore } from "../persistence/store.js";

const kit = (): Kit => ({
  source: { company: "Example", company_url: "https://example.com/", role: "Engineer", location: "", jd_chars: 10, researched_at: "2026-01-01T00:00:00.000Z", pages_used: [] },
  company_brief: { summary: "Old", what_they_do: "Old", sources: [] },
  role: { title: "Engineer", seniority: "junior", responsibilities: [], requirements: [{ id: "r1", text: "React", kind: "technical", priority: "must" }] },
  questions: [
    { id: "q_r1_technical_1", requirement_ids: ["r1"], category: "technical", prompt: "Mine", answer_outline: "A", difficulty: 1, origin: "edited" },
    { id: "q_r1_technical_2", requirement_ids: ["r1"], category: "technical", prompt: "Gen", answer_outline: "A", difficulty: 1 },
  ],
  flashcards: [],
  schedule: { days_available: 1, days: [{ day: 1, focus: "React", question_ids: ["q_r1_technical_1", "q_r1_technical_2"], minutes: 20 }] },
  coverage: { uncovered_requirement_ids: [], passes: 1 },
});

const patch = (body: unknown) => new Request("http://x/", { method: "PATCH", body: JSON.stringify(body) });
const pin = (id: string) => new Request("http://x/", { method: "POST", body: JSON.stringify({ question_id: id }) });

test("category regeneration validates input and never modifies the kit without a provider", async () => {
  const store = new InMemoryKitStore();
  await store.save("k", kit());
  const bad = await handleBuilder(patch({ type: "regenerate_category", category: "nope" }), store, "k");
  assert.equal(bad.status, 400);
  delete process.env.GEMINI_API_KEY;
  delete process.env.LLM_PROVIDER;
  const res = await handleBuilder(patch({ type: "regenerate_category", category: "technical", provider: "gemini" }), store, "k");
  assert.equal(res.status, 503);
  assert.equal((await store.getById("k"))?.questions[0].prompt, "Mine");
});

test("brief and schedule regeneration only touch their own section", async () => {
  const store = new InMemoryKitStore();
  await store.save("k", kit());
  const brief = await handleBuilder(patch({ type: "regenerate_brief" }), store, "k");
  const afterBrief = (await brief.json() as { kit: Kit }).kit;
  assert.match(afterBrief.company_brief.summary, /intentionally thin/);
  assert.equal(afterBrief.questions[0].prompt, "Mine");
  const sched = await handleBuilder(patch({ type: "regenerate_schedule" }), store, "k");
  const afterSched = (await sched.json() as { kit: Kit }).kit;
  assert.equal(afterSched.questions.length, 2);
  assert.equal(afterSched.schedule.days.length, 1);
  assert.equal(afterSched.company_brief.summary, afterBrief.company_brief.summary);
});

test("pins live on the kit and survive an edit", async () => {
  const store = new InMemoryKitStore();
  await store.save("k", kit());
  const pinned = await handlePins(pin("q_r1_technical_2"), store, "k");
  assert.deepEqual((await pinned.json() as { pinned: { question_ids: string[] } }).pinned.question_ids, ["q_r1_technical_2"]);
  const edited = await handleBuilder(patch({ type: "edit_question", question_id: "q_r1_technical_2", prompt: "Changed" }), store, "k");
  const q = (await edited.json() as { kit: Kit }).kit.questions[1];
  assert.equal(q.pinned, true);
  assert.equal(q.origin, "edited");
});

test("another user cannot read, modify or pin a kit", async () => {
  const base = new InMemoryKitStore();
  await new UserScopedKitStore(base, "usr_a").save("k", kit());
  const b = new UserScopedKitStore(base, "usr_b");
  assert.equal((await handleBuilder(patch({ type: "regenerate_schedule" }), b, "k")).status, 404);
  assert.equal((await handleBuilder(new Request("http://x/"), b, "k")).status, 404);
  assert.equal((await handlePins(pin("q_r1_technical_2"), b, "k")).status, 404);
});

test("duplicate in-flight submit returns the same job and other users cannot poll it", async () => {
  const deps = {
    store: new InMemoryKitStore(),
    fetchImpl: (async () => new Response("<html><title>Ex</title><body>Ex</body></html>", { headers: { "content-type": "text/html" } })) as typeof fetch,
    llmProvider: { generate: () => new Promise<never>(() => {}) }, // never settles: the job stays in flight
  };
  const submit = (user: string) => createGenerationJob(
    new Request("http://x/", { method: "POST", body: JSON.stringify({ jd: "Senior engineer. React and Node required for this role.", company_url: "https://example.com/", days: 3 }) }),
    deps,
    user,
  );
  const first = await (await submit("usr_a")).json() as { id: string };
  const second = await (await submit("usr_a")).json() as { id: string };
  assert.equal(second.id, first.id);
  assert.notEqual((await (await submit("usr_b")).json() as { id: string }).id, first.id);
  assert.equal(getGenerationJob(first.id, "usr_a").status, 200);
  assert.equal(getGenerationJob(first.id, "usr_b").status, 404);
});
