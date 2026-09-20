import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getMongoClient, getMongoCollection } from "./mongodb.js";
import type { Kit } from "@trao/interview-prep-shared/kit.js";
import { MongoKitStore } from "./mongodb-store.js";
import { MongoUserStore } from "../auth/mongodb-user-store.js";

const enabled = Boolean(process.env.MONGODB_URI?.trim());

test("MongoDB persistence contract", { skip: !enabled }, async (t) => {
  const userStore = new MongoUserStore();
  const email = `mongo-test-${randomUUID()}@example.test`;
  const user = await userStore.create(email, "test-hash");
  const loadedUser = await userStore.getById(user.id);
  assert.equal(loadedUser?.email, email);
  assert.equal((await userStore.getByEmail(email))?.id, user.id);

  const kitId = `mongo_test_${randomUUID()}`;
  const scopedId = `user:${user.id}:${kitId}`;
  const kit = {
    source: { company_url: "https://example.com", captured_at: new Date().toISOString() },
    company_brief: { company_name: "Example", industry: "Software", summary: "Test" },
    role: { title: "Engineer", requirements: [] },
    questions: [],
    flashcards: [],
    schedule: { days: 1, minutes: 0, items: [] },
    coverage: { covered_requirement_ids: [], uncovered_requirement_ids: [] },
  } as unknown as Kit;

  const store = new MongoKitStore();
  await store.save(scopedId, kit);
  assert.deepEqual(await store.getById(scopedId), kit);

  const updated = { ...kit, company_brief: { ...kit.company_brief, summary: "Updated" } };
  await store.update(scopedId, updated);
  assert.equal((await store.getById(scopedId))?.company_brief.summary, "Updated");

  const indexes = await (await getMongoCollection("kits")).indexes();
  assert.ok(indexes.some((index) => index.name === "user_kit_unique"));

  const otherUserId = `usr_${randomUUID()}`;
  assert.equal(await store.getById(`user:${otherUserId}:${kitId}`), null);

  assert.strictEqual(getMongoClient(), getMongoClient());

  assert.equal(await store.delete(scopedId), true);
  assert.equal(await store.getById(scopedId), null);

  await t.test("user uniqueness index rejects duplicate email", async () => {
    await assert.rejects(() => userStore.create(email, "test-hash-2"), /EMAIL_ALREADY_REGISTERED/);
  });
});
