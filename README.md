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

External URLs are validated before fetching. Production deployments must reject private/loopback destinations. Retrieved web content is treated as untrusted content, not executable instructions. Fetches enforce expected content types, size limits, timeouts, and backoff/rate-limit behavior.

## Status

The repository foundation is being implemented incrementally. Subsequent commits will add the shared assessment contract, deterministic coverage/scheduling utilities, backend pipeline, frontend builder/practice experience, and evaluation harness.
