# Generation Strategy

## Target architecture
JD
→ role extraction
→ requirement normalization
→ company/site research
→ evidence normalization
→ question planning
→ category + requirement generation
→ deterministic coverage
→ bounded repair
→ flashcards
→ deterministic schedule
→ Appendix A validation
→ persistence

## Why staged generation
The assessment output is highly structured. A single LLM call has too many simultaneous responsibilities.

Staging makes each operation smaller, cheaper, independently testable, independently retryable, easier to evaluate, safer against prompt injection and easier to debug.

## Requirement-first generation
The unit of generation should be a requirement, not the whole job.

For each requirement:
1. choose category;
2. create objective;
3. generate candidate;
4. validate;
5. attach requirement ID in application code.

## Context selection
Do not send every retrieved page to every question.

Rank context by:
1. direct relevance to requirement;
2. same-origin/company authority;
3. hiring/interview signal;
4. freshness when relevant;
5. source quality;
6. content length.

Provide only evidence needed for the question.

## Generation batches
Recommended default:
- requirement extraction: one call;
- company research extraction: batched by source/research topic;
- question planning: one compact call or small batches;
- question generation: small requirement batches;
- repair: uncovered requirements only;
- flashcards: derived from validated questions.

Adjust batch size to provider token limits.

## Diversity
Track semantic or lexical duplication.

Questions are suspiciously similar when they:
- test the same requirement;
- use the same task framing;
- expect the same answer outline;
- differ only in nouns.

Regenerate only the duplicate candidate.

## Difficulty
Appendix A difficulty is 1–3.

Suggested semantics:
- 1: direct understanding/application;
- 2: practical reasoning/trade-offs;
- 3: multi-step reasoning, debugging, architecture or nuanced trade-offs.

Difficulty should be grounded in the requirement.

## Coverage loop
generate
→ deterministic coverage
→ must uncovered?
→ if yes, repair only missing requirements
→ coverage again.

Bound the repair loop. Record per-requirement failure. Never loop forever.

## Quality hierarchy
1. schema validity;
2. requirement fidelity;
3. coverage;
4. groundedness;
5. specificity;
6. diversity;
7. difficulty;
8. stylistic polish.

A polished generic question is still a poor question.

## Company-fit generation
Company-fit questions must be evidence-driven. If research says nothing reliable about company values, product, role context or hiring process, do not manufacture specifics.

The assessment permits partial research when gaps are recorded honestly.

## Flashcards
Derive flashcards from final validated questions and answer outlines to prevent contradictory independent generation.

## Scheduling
Keep scheduling deterministic:
- validate 1–60 days;
- distribute final question IDs;
- derive focus from requirements;
- assign integer minutes;
- preserve exactly the requested number of days.

The LLM must not mutate the schedule.

## Provider reliability
Adapters expose a common result/error contract.

Retry only transient/rate-limit failures. Do not blindly retry invalid credentials, malformed requests or repeated schema-invalid responses.

Use bounded exponential backoff and provider-aware pacing.

## Cost controls
Track:
- input tokens;
- output tokens;
- call count;
- retry count;
- latency;
- provider/model;
- prompt version.

A quality improvement that multiplies calls without measurable benefit should not be accepted.

## Persistence boundary
Never persist a partially validated kit as successful.

Persist only after schema validation, valid question references, schedule integrity, coverage decision, required source fields and generation completion policy.

## Current implementation alignment
The repository already states that question generation is separated by requirement/category, IDs are application-owned, coverage is deterministic, repair is bounded, JSON is Zod-validated, and providers include Gemini/OpenAI/Anthropic/Groq/Ollama.

Sprint 1 should improve prompts and evaluation around those boundaries rather than replace them.
