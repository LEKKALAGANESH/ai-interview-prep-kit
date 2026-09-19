# The AI Interview Prep Kit

Implementation of the Trao Full-Stack Engineering Assessment: **The AI Interview Prep Kit**.

## Architecture

- `client/` — Next.js + Tailwind frontend
- `server/` — Node.js HTTP application/API with separated retrieval, extraction, generation, scheduling, and persistence modules
- `shared/` — shared TypeScript contracts, validation, and Appendix A model
- `evaluation/` — mandatory `npm run evaluate -- --input <cases.json> --output <kits.json>` CLI
- `tests/` — cross-cutting automated tests

## Core pipeline

1. Validate and authenticate the user.
2. Extract structured requirements from the supplied job description.
3. Retrieve and clean individual company pages.
4. Discover/rank relevant site links instead of hard-coding hiring URLs.
5. Research public interview discussion where available.
6. Generate categorized questions with requirement IDs.
7. Run deterministic requirement coverage checks.
8. Generate missing questions in a second pass.
9. Build a deterministic N-day schedule.
10. Validate the complete Appendix A structure before persistence.
11. Support editing, reordering, adding/deleting, pinning, and scoped regeneration.
12. Track flashcard practice coverage/confidence.
13. Support multi-role batch evaluation.
14. Support selectable Gemini, OpenAI, Anthropic Claude, Groq, and local Ollama providers.

## JD extraction

The extraction boundary is deliberately separate from retrieval and later question generation.

```
pasted JD
  ↓
RoleExtractionProvider
  ↓
structured raw role
  ↓
Zod validation
  ↓
deterministic normalization
  ↓
Appendix A role
```

Requirements use the exact Appendix A fields:

- `id`
- `text`
- `kind`: `technical | behavioural | domain`
- `priority`: `must | nice`

Requirement IDs are assigned deterministically within a kit. Equivalent requirement wording is normalized conservatively, and a duplicate is upgraded to `must` if any occurrence is explicitly classified as must-have.

The extraction layer does not invent requirements for thin descriptions. Missing details remain missing. Job-description text is passed to the provider as data; instruction-like text inside a JD is not treated as an application instruction.

Provider output is validated before it becomes application state. Invalid structured output and provider failures become explicit extraction errors rather than unchecked TypeScript casts.

## Data integrity rules

- Every requirement has a stable ID.
- Every question references one or more requirement IDs.
- Must-have requirements must be covered before a kit is considered shippable.
- User-edited/user-added/pinned content survives scoped regeneration.
- Durations are integer minutes.
- Thin input produces a thin, honest kit; unsupported requirements or company facts are not fabricated.

## Evaluation

The required command is:

`npm run evaluate -- --input <cases.json> --output <kits.json>`

Step 10 is the mandatory batch evaluator. It must accept an array of cases containing `id`, `jd`, `company_url`, and `days`; run the same pipeline used by the application; use the requested day count; emit the Appendix B structure; and continue processing when an individual case fails. The evaluator must also cover the assessment's invalid/timeout URLs, thin JDs, missing hiring pages, absent public interview discussion, malformed model JSON, rate-limit/transient failures, duplicate cases, 1-day/60-day cases, and local company URLs with relative links.

## Security

External URLs are validated before fetching. Production deployments must reject private/loopback destinations. Retrieved web content is treated as untrusted content, not executable instructions. Fetches enforce expected content types, size limits, timeouts, redirect validation, and backoff/rate-limit behavior.

## Status

Steps 1–9 are implemented incrementally: the shared Appendix A contract, input validation/normalization, secure retrieval/research, JD extraction, LLM question generation, deterministic coverage, bounded second-pass repair, deterministic scheduling, final schema validation, durable persistence, idempotency, and raw-input API orchestration are in place.

The final verification checklist tracks runtime and clean-clone evidence separately from source-level implementation status. Step 10 evaluation work is now active while Step 9 remains tracked as 🟡 until the deferred test and final runtime/audit verification are resolved.

## Public interview research

Company crawling is separate from public interview research. When the `BRAVE_SEARCH_API_KEY` environment variable is configured, the retrieval pipeline searches the public web for interview-process and interview-question discussions using the company hostname. Search results are stored as research evidence and are not treated as instructions. If no provider is configured or the search fails, the kit records that gap honestly rather than fabricating interview information.

## Retrieval test coverage

The server test suite covers URL/SSRF validation, HTTP content limits and redirects, retry behavior, robots.txt decisions and redirects, HTML cleaning, link ranking, company crawling, and public interview research.

## Question generation

Question generation is deliberately separated by requirement and category. Prompt construction is centralized in `server/src/generation/prompts.ts` with explicit versions (`role-extraction:v1`, `question-generation:v1`) so prompt changes are reviewable and regression-testable. The generation pipeline selects `technical` for technical requirements, `behavioural` for behavioural requirements, and `system-design` for domain requirements. The model receives the selected requirement ID and a source-labeled research evidence packet, but requirement IDs are assigned by application code rather than accepted from model output. Company-primary pages and public interview discussion are explicitly labeled; public discussion is never presented as verified company policy.

The default LLM adapter is Gemini using `GEMINI_MODEL` (default `gemini-3.6-flash`). The current UI/server provider defaults are Gemini `gemini-3.6-flash`, OpenAI `gpt-5.5`, Anthropic `claude-sonnet-5`, Groq `openai/gpt-oss-120b`, and local Ollama `llama3.1:8b`. The application can also select OpenAI, Anthropic Claude, Groq, or local Ollama through the server-side provider configuration; provider API keys are never sent by the browser. Generated JSON is validated with Zod before questions become application state. Flashcards are then derived deterministically from the final validated question set, so the flashcard layer does not introduce a second unsupported generation path. Rate-limit and transient provider errors are retried with bounded exponential backoff; malformed responses are rejected. Job-description, company-page, and public-search text is explicitly treated as untrusted reference data in the generation prompt.

## Coverage engine

Coverage is deterministic application logic. It compares generated question `requirement_ids` against extracted requirement IDs, separates uncovered `must` and `nice` requirements, rejects invalid references as non-coverage, preserves requirement ordering, and exposes `can_ship`. Initial generation immediately runs this coverage check; the complete question pipeline then uses uncovered requirements for a bounded second pass. Only missing requirements are regenerated, successful first-pass questions are preserved, and final coverage is re-checked after the repair pass. Persistent generation failures are recorded per requirement/pass and a kit remains non-shippable when a must-have requirement is still uncovered. The LLM is never asked to decide whether coverage exists.

## Deterministic scheduling

The Step 8 scheduler consumes the final Step 7 question set and the extracted requirements. It validates the requested 1–60 day range, orders questions deterministically by requirement priority and difficulty, distributes question IDs across exactly the requested number of days, derives each day's focus from the assigned requirement text, and calculates integer minutes at 10 minutes per question. Scheduling does not regenerate or mutate questions, so Step 7 coverage is preserved.

## Production hardening

P2 hardening policies and reproducibility commands are documented in `docs/p2-production-hardening.md`. The durable JSON store uses atomic writes and cross-process request locks for a single shared store path. Research pages receive retrieval freshness timestamps, and source-level research claims are persisted in a provenance sidecar without changing Appendix A. Retrieval/security regressions and Appendix A/B conformance checks run in the automated test suite.

## Persistence and idempotency

Kit persistence uses a `KitStore` abstraction with both in-memory and durable JSON-backed implementations. Each normalized generation request receives a deterministic ID derived from the normalized company URL, job description, and requested study days. The service checks for an existing kit before generation and coalesces concurrent identical requests in one process; the durable store also serializes file writes with an atomic lock and survives process restarts. Persistence errors propagate instead of being reported as successful generation, and a kit is never saved before final validation and shippable coverage checks pass.

## Raw-input application pipeline

The API now owns the application pipeline boundary: a validated request containing only `jd`, `company_url`, and `days` is normalized, researched, extracted through the configured LLM, converted into a deterministic company brief from retrieved evidence, passed through question generation and coverage repair, scheduled, schema-validated, and persisted. Missing LLM credentials, unusable company retrieval, extraction failures, and unshippable coverage are returned as structured API errors.

The Node runtime exposes `POST /api/kits`, kit builder/practice routes, and `GET /health`. The default durable store path is `.data/kits.json`, configurable with `KIT_STORE_FILE`.

## Current provider model defaults — September 2026

These defaults were refreshed against the providers' current model documentation on 2026-09-19. Override them with `LLM_MODEL` or the provider-specific environment variables when needed. Gemini uses `gemini-3.6-flash`; OpenAI uses `gpt-5.5`; Anthropic uses `claude-sonnet-5`; Groq uses `openai/gpt-oss-120b`; Ollama uses `llama3.1:8b`.
