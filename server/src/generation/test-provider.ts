import type { LlmProvider } from "./provider.js";

export type FakeQuestion = { prompt: string; answer_outline: string; difficulty: number };
export const fakeQuestion = (prompt = "question", difficulty = 2): FakeQuestion => ({ prompt, answer_outline: "outline", difficulty });

// Fake for batched generation. Each provider call is one category batch; `calls` records the requirement ids of every call.
// `answer` returns questions, null to omit that requirement from the reply, or throws to fail the whole call.
export function batchProvider(
  answer: (id: string, text: string, callNumber: number) => FakeQuestion[] | null,
  calls: string[][] = [],
): LlmProvider {
  return {
    async generate(request) {
      const entries = [...request.userPrompt.matchAll(/Requirement ID: (\S+) \| Requirement: (.+?) \| kind:/g)];
      calls.push(entries.map((entry) => entry[1]));
      const items = entries.flatMap(([, id, text]) => {
        const questions = answer(id, text, calls.length);
        return questions ? [{ requirement_id: id, questions }] : [];
      });
      return { items };
    },
  };
}
