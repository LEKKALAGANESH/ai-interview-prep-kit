# AI Interview Prep Kit

Turn a job description and a company website into a personalised, requirement-traced interview preparation kit: categorised questions, flashcards, an N-day study plan, and practice tracking.

Built for the Trao Full-Stack Engineering Assessment.

![Overview](docs/screenshots/01-overview-company-brief.png)

## Features

- **Structured JD extraction**: requirements with stable IDs, a `kind` (technical, behavioural, domain) and a `priority` (must, nice).
- **Company research**: secure page retrieval, link ranking and optional public interview research, all stored with provenance.
- **Requirement-traced questions**: every question points to one or more requirement IDs.
- **Deterministic coverage engine**: finds uncovered requirements and runs a bounded second pass to fill the gaps. The LLM never decides whether coverage exists.
- **Deterministic study plan**: exactly N days (1-60), 10 minutes per question.
- **Editable kit**: edit, add, delete, reorder, pin, move between days, and regenerate a single question. Pinned and edited content survives regeneration.
- **Flashcards and practice mode** with per-requirement practice coverage.
- **Multiple LLM providers**: Gemini, OpenAI, Anthropic Claude, Groq, and local Ollama.
- **Batch evaluation CLI** that keeps going when a single case fails.

## Screenshots

### Overview

Company brief, coverage score, role requirements with coverage status, and research provenance.

| | |
|---|---|
| ![Company brief](docs/screenshots/01-overview-company-brief.png) | ![Coverage and requirements](docs/screenshots/02-overview-coverage-and-requirements.png) |
| ![Requirements list](docs/screenshots/03-overview-requirements-list.png) | ![Uncovered requirements and provenance](docs/screenshots/04-overview-uncovered-and-provenance.png) |

### Question bank

Edit answers in place, pin questions, assign days, and regenerate a single question. Saves are transactional, so a failed API write keeps your local draft.

| | |
|---|---|
| ![Question bank](docs/screenshots/05-question-bank.png) | ![Edit a question](docs/screenshots/06-question-bank-edit-question.png) |
| ![Day assignment](docs/screenshots/07-question-bank-day-assignment.png) | ![Behavioural question](docs/screenshots/08-question-bank-behavioural.png) |
| ![Technical question](docs/screenshots/09-question-bank-technical.png) | ![Last question](docs/screenshots/10-question-bank-last-question.png) |

### Flashcards

Cards are derived from the validated question set, so they keep requirement lineage.

| | |
|---|---|
| ![Flashcards](docs/screenshots/11-flashcards.png) | ![Flashcard grid](docs/screenshots/12-flashcards-grid.png) |

![Reveal answer](docs/screenshots/13-flashcards-reveal-answer.png)

### Study plan and practice

| | |
|---|---|
| ![Study plan](docs/screenshots/14-study-plan.png) | ![Practice session](docs/screenshots/15-practice-session.png) |

## Architecture

```
client/       Next.js + Tailwind frontend
server/       Node.js HTTP API: retrieval, extraction, generation, scheduling, persistence
shared/       TypeScript contracts, Zod validation, Appendix A model
evaluation/   Batch evaluation CLI and quality/regression tooling
docs/         Design notes, research, hardening policy, screenshots
```

### Pipeline

1. Validate and normalise the request (`jd`, `company_url`, `days`).
2. Retrieve and clean company pages; rank relevant links instead of hard-coding hiring URLs.
3. Research public interview discussion when a search key is configured.
4. Extract requirements from the JD (validated with Zod, then normalised).
5. Generate questions per requirement and category.
6. Run the deterministic coverage check and repair only the missing requirements (bounded second pass).
7. Build the N-day schedule.
8. Validate the full Appendix A structure, then persist. A kit is never saved before it passes validation and shippable coverage.

### Design decisions

- **Untrusted input**: JD text, company pages and search results are passed to the model as reference data, never as instructions.
- **Validated output**: model JSON is checked against a schema before it becomes application state. Requirement IDs are assigned by application code, not accepted from the model.
- **Honest output**: thin input gives a thin kit. Missing requirements or company facts are not invented, and gaps are recorded.
- **Idempotent generation**: the request ID is derived from the normalised URL, JD and day count. Identical requests are coalesced, and the durable JSON store uses atomic writes with cross-process locks.
- **Secure fetching**: URL and SSRF validation, content-type and size limits, timeouts, redirect validation, robots.txt handling, and bounded retry with backoff.

## Getting started

Requires Node.js 20 or newer.

```bash
npm install
cp .env.example .env      # add at least one provider key
npm run dev:server        # API on http://localhost:$PORT
npm run dev               # frontend on http://localhost:3000
```

### Configuration

| Variable | Purpose |
|---|---|
| `LLM_PROVIDER` | `gemini`, `openai`, `anthropic`, `groq` or `ollama` |
| `LLM_MODEL` | Override the default model for the chosen provider |
| `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GROQ_API_KEY` | Provider credentials (server-side only, never sent to the browser) |
| `OLLAMA_BASE_URL`, `OLLAMA_MODEL` | Local Ollama setup |
| `BRAVE_SEARCH_API_KEY` | Enables public interview research |
| `KIT_STORE_FILE` | Kit store path (default `.data/kits.json`) |
| `PORT` | API port |

Default models (checked 2026-09-19): Gemini `gemini-3.6-flash`, OpenAI `gpt-5.5`, Anthropic `claude-sonnet-5`, Groq `openai/gpt-oss-120b`, Ollama `llama3.1:8b`.

## API

- `POST /api/kits`: generate a kit from `{ jd, company_url, days }`
- Kit builder and practice routes for editing, regeneration and practice tracking
- `GET /health`

Missing credentials, unusable company retrieval, extraction failures and unshippable coverage are returned as structured errors.

## Testing and evaluation

```bash
npm test                                                     # all workspaces
npm run evaluate -- --input <cases.json> --output <kits.json>
```

The evaluator reads an array of `{ id, jd, company_url, days }` cases, runs the same pipeline as the app, and writes the Appendix B output. It covers invalid and timing-out URLs, thin JDs, missing hiring pages, absent interview discussion, malformed model JSON, rate limits, duplicate cases, 1-day and 60-day plans, and local URLs with relative links. See `evaluation/README.md`.

Further commands: `npm run regression`, `npm run quality` and `npm run provider-compare` (in `evaluation/`).

## Documentation

- [Assessment process](docs/START_TO_END_ASSESSMENT_PROCESS.md)
- [Production hardening](docs/p2-production-hardening.md)
- [UI/UX research](docs/ui-ux-research.md)
- [LLM research notes](docs/llm-research/README.md)
- [Verification checklist](CHECKLIST.md)
