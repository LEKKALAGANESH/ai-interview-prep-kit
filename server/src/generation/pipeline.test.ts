import test from "node:test";
import assert from "node:assert/strict";
import { generateInitialQuestionSet } from "./pipeline.js";
import type { LlmProvider } from "./provider.js";

test("generates each requirement through its appropriate category", async () => {
  const seen: string[] = [];
  const provider: LlmProvider = {
    async generate(request) {
      const match = request.userPrompt.match(/Question category: ([^\n]+)/);
      seen.push(match?.[1] ?? "");
      return { questions: [{ prompt: "Question", answer_outline: "Outline", difficulty: 2 }] };
    },
  };

  const questions = await generateInitialQuestionSet(
    [
      { id: "r1", text: "React", kind: "technical", priority: "must" },
      { id: "r2", text: "Mentoring", kind: "behavioural", priority: "must" },
      { id: "r3", text: "Distributed systems", kind: "domain", priority: "nice" },
    ],
    { provider },
  );

  assert.deepEqual(seen, ["technical", "behavioural", "system-design"]);
  assert.deepEqual(questions.map((q) => q.requirement_ids), [["r1"], ["r2"], ["r3"]]);
});
