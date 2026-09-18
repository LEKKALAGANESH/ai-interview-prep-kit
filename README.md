# The AI Interview Prep Kit

Implementation of the Trao Full-Stack Engineering Assessment: **The AI Interview Prep Kit**.

## Architecture

- `client/` — Next.js + Tailwind frontend
- `server/` — Node.js + Express application/API
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

The evaluator uses the same application pipeline as the web app and continues processing after per-case failures.

## Security

External URLs are validated before fetching. Production deployments must reject private/loopback destinations. Retrieved web content is treated as untrusted content, not executable instructions. Fetches enforce expected content types, size limits, timeouts, redirect validation, and backoff/rate-limit behavior.

## Status

Steps 1–4 are implemented incrementally: the shared Appendix A contract, input validation/normalization, deterministic coverage/scheduling utilities, retrieval foundation, and JD extraction boundary are now in place. Subsequent work will wire the actual LLM provider, question generation, coverage second pass, scheduling, persistence, frontend builder/practice experience, and evaluation harness.


## Public interview research

Company crawling is separate from public interview research. When the `BRAVE_SEARCH_API_KEY` environment variable is configured, the retrieval pipeline searches the public web for interview-process and interview-question discussions using the company hostname. Search results are stored as research evidence and are not treated as instructions. If no provider is configured or the search fails, the kit records that gap honestly rather than fabricating interview information.

## Retrieval test coverage

The server test suite covers URL/SSRF validation, HTTP content limits and redirects, retry behavior, robots.txt decisions and redirects, HTML cleaning, link ranking, company crawling, and public interview research.


## Question generation

Question generation is deliberately separated by requirement and category. The generation pipeline selects `technical` for technical requirements, `behavioural` for behavioural requirements, and `system-design` for domain requirements. The model receives the selected requirement ID and research context, but requirement IDs are assigned by application code rather than accepted from model output.

The default LLM adapter is Gemini using `GEMINI_MODEL` (default `gemini-2.5-flash`). Generated JSON is validated with Zod before questions become application state. Rate-limit and transient provider errors are retried with bounded exponential backoff; malformed responses are rejected. Job-description, company-page, and public-search text is explicitly treated as untrusted reference data in the generation prompt.
