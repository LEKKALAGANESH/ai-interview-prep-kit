# Sprint 3 — Production & Assessment Hardening (P2)

**Goal:** Turn the P0/P1 implementation into a reproducible, observable, assessment-ready production workflow without weakening deterministic application ownership.

| ID | P2 checklist item | Status | Definition of done |
|---|---|:---:|---|
| P2.1 | Clean-clone reproducibility | ⬜ | Fresh clone installs, tests, builds, and evaluates with documented commands. |
| P2.2 | Runtime CI evidence | ⬜ | Current assessment commit has successful CI evidence for test/build/evaluator workflows. |
| P2.3 | Five-case evaluator SLA | ⬜ | Five representative cases complete within 15 minutes including retries. |
| P2.4 | Durable idempotency verification | ⬜ | Duplicate requests remain coalesced across restarts/process boundaries for the selected persistence strategy. |
| P2.5 | Persistence recovery | ⬜ | Interrupted writes and restart recovery are tested without partial valid-state publication. |
| P2.6 | API contract integration suite | ⬜ | End-to-end API tests cover success, validation, research, LLM, persistence, duplicate, and timeout paths. |
| P2.7 | Security regression suite | ⬜ | SSRF, private-network, content-size, redirect, prompt-injection, and secret-exfiltration fixtures run automatically. |
| P2.8 | Retrieval freshness policy | ⬜ | Evidence freshness and stale-source handling are explicit and tested. |
| P2.9 | Evidence provenance persistence | ⬜ | Important generated claims retain source URL/type/evidence provenance where the product exposes research. |
| P2.10 | Prompt/version artifact persistence | ⬜ | Evaluations persist provider/model/prompt versions and quality metrics. |
| P2.11 | Provider failover drill | ⬜ | A provider failure exercises bounded fallback while preserving schema, coverage, and provenance. |
| P2.12 | Load/concurrency test | ⬜ | Concurrent generation, reads, edits, and practice updates are tested for race safety. |
| P2.13 | Large-JD performance | ⬜ | Large but valid JDs remain within documented latency/context limits. |
| P2.14 | Large-research performance | ⬜ | Evidence ranking and prompt budgeting remain bounded under maximum retrieval. |
| P2.15 | Accessibility regression | ⬜ | Keyboard, focus, semantic controls, responsive layouts, and screen-reader-critical flows are regression-tested. |
| P2.16 | Builder persistence regression | ⬜ | Edits, reorder, add/delete, scoped regeneration, and manual content survive reload and regeneration. |
| P2.17 | Practice persistence regression | ⬜ | Confidence, queue state, completion, and resume behavior survive reload/restart. |
| P2.18 | Appendix A/B conformance audit | ⬜ | Final persisted kits and evaluator output are mechanically checked against assessment contracts. |
| P2.19 | Documentation audit | ⬜ | README, checklist, architecture, env, evaluation, and security docs match current code. |
| P2.20 | Final submission audit | ⬜ | No known blocking failures, runtime evidence is attached, and assessment submission artifacts are reproducible. |

### P2 gate

P2 remains open until clean-clone/runtime evidence, evaluator SLA, security regression, persistence/idempotency verification, and final Appendix A/B audit are all complete.

---

# Sprint 2 — LLM Quality Optimization (P1)

**Goal:** Improve the quality, consistency, observability, and evaluation of generated interview kits after the P0 reliability/grounding foundation is stable.

> P1 items are intentionally separate from P0. Do not mark an item green from source inspection alone when the requirement calls for runtime or quality evidence.

| ID | P1 checklist item | Status | Definition of done |
|---|---|:---:|---|
| P1.1 | Explicit question-planning stage | 🟢 | Introduce an explicit application-owned question objective/plan before generation; each planned item has requirement, category, difficulty, and objective. |
| P1.2 | Category strategy | 🟢 | Deterministically choose category coverage from requirement kind/role context instead of relying only on free-form generation. |
| P1.3 | Context ranking | 🟢 | Rank research evidence by direct relevance, company authority, interview signal, freshness, source quality, and length before prompt assembly. |
| P1.4 | Evidence claim model | 🟢 | Represent important research claims with claim, source URL, source type, evidence, and confidence basis before LLM consumption. |
| P1.5 | Research deduplication | 🟢 | Deduplicate equivalent evidence/pages and avoid repeated context consuming prompt budget. |
| P1.6 | Research conflict handling | 🟢 | Detect conflicting company/interview evidence and prevent the model from silently choosing an unsupported claim. |
| P1.7 | Research-gap behavior | 🟢 | When evidence is missing, generate only what is supported by the JD/available evidence and explicitly avoid invented company-specific facts. |
| P1.8 | Question diversity checks | 🟢 | Detect near-duplicate questions within and across requirements/categories and regenerate only the affected items. |
| P1.9 | Difficulty calibration | 🟢 | Enforce documented difficulty semantics and verify that generated difficulty matches reasoning depth, not superficial wording. |
| P1.10 | Specificity/relevance validation | 🟢 | Add deterministic heuristics and semantic checks for requirement relevance, specificity, and answer usefulness. |
| P1.11 | Semantic LLM-as-judge evaluation | 🟢 | Add an independent judge for relevance, specificity, grounding, answer usefulness, difficulty fit, and diversity; judge never overrides deterministic contract/coverage. |
| P1.12 | Golden evaluation dataset | 🟢 | Add representative regression cases covering technical, behavioural, domain, thin JD, research gaps, injection, malformed output, and edge schedules. |
| P1.13 | Prompt regression evaluation | 🟢 | Record prompt version + model/provider and compare golden-case results across prompt changes. |
| P1.14 | Provider/model comparison | 🟡 | Comparison runner/workflow is implemented; execution still requires at least two configured providers. |
| P1.15 | Quality scorecard | 🟡 | Scorecard implementation exists; real-provider scorecard has not yet been reviewed from a completed golden run. |
| P1.16 | Cost/latency instrumentation | 🟡 | Stage timing/provider metadata plumbing is implemented; token/cost evidence depends on provider responses and has not yet been reviewed in a real-provider run. |
| P1.17 | Prompt-budget control | 🟢 | Bound evidence/context size and preserve the highest-value evidence when prompts approach provider limits. |
| P1.18 | Generation batching policy | 🟢 | Define and test batching boundaries so quality, latency, and provider limits remain predictable. |
| P1.19 | Repair quality gate | 🟢 | Require repaired questions to satisfy the same schema, relevance, grounding, diversity, and difficulty checks as first-pass questions. |
| P1.20 | Flashcard quality validation | 🟢 | Validate derived flashcards for answer usefulness, requirement traceability, and one-to-one source-question lineage. |
| P1.21 | Prompt fixture library | 🟢 | Add reusable fixtures for normal JD, thin JD, false premise, injection, malicious company page, misleading interview discussion, and malformed provider output. |
| P1.22 | Provider fallback quality policy | 🟢 | Define what happens when fallback providers produce materially different outputs; preserve contract/coverage and record provider provenance. |
| P1.23 | Generation observability | 🟢 | Extraction, research, planning, generation, repair, validation, and persistence now emit structured stage events through the pipeline observer. |
| P1.24 | P0 pin semantics | 🟢 | Added persisted `PinnedQuestionState` sidecar storage (`question_ids`, `updated_at`) without changing Appendix A kit shape; JSON and in-memory stores are covered by persistence tests. |
| P1.25 | Runtime quality gate | 🟡 | Run the golden suite and verify no P0 regression before promoting P1 changes. |

### P1 implementation evidence

- **Current-head CI verification:** 🟢 GitHub Actions run `35447853327` passed after the final build/test fixes. The workflow completed npm install, npm test, npm build, evaluator help, server start, and `/health` verification on commit `ec2faa913781ff4096f79680f0c8edd3626127f1`.
- Implemented: deterministic planning/category strategy, ranked evidence packets, claim model, deduplication/conflict detection, research-gap boundaries, diversity heuristics, difficulty calibration, deterministic quality checks, advisory semantic-judge interface, golden fixtures, regression/provider comparison primitives, quality scorecard, prompt-budget controls, batching primitives, observability, and provider-quality policy documentation.
- Remaining source/runtime work: executable prompt-regression/provider-comparison runners, full observer wiring across extraction/research/persistence, persisted pin semantics, and current-head runtime execution.
- Runtime statuses are intentionally 🟡 until the current GitHub Actions run or equivalent execution is observed.

### P1 status summary

| Area | Status |
|---|:---:|
| P1 checklist definition | 🟢 |
| P1 implementation | 🟢 source-level; P1.24 remains 🟡 |
| P1 runtime verification | 🟢 current CI run `35447784502` |
| P1 quality-gate verification | 🟡 golden suite/semantic thresholds not yet executed |

### P1 runtime verification

- Runtime/build verification: 🟢 current-head CI passed on commit `e86f54b2d4711f40801dfef6ba440ec6517a0eb5` (GitHub Actions run `35448768895`).
- Evaluator runtime: 🟡 CLI smoke and prompt-regression execution pass in CI; the full golden dataset still needs a configured real provider.
- Quality-gate verification: 🟡 source-level gates and golden fixtures are present, but the full golden evaluation with real provider output has not yet been executed and reviewed.

### P1 completion gate

- No P0 regression.
- Deterministic contract/coverage/scheduling remains application-owned.
- Semantic evaluation is advisory and cannot make invalid kits shippable.
- Golden cases pass the agreed quality thresholds.
- Provider/prompt changes are measurable and reproducible.
- Runtime evidence is recorded before P1 items are marked 🟢.

---

# Sprint 1 — LLM Quality & Reliability (P0)

**Goal:** Make the LLM path grounded, requirement-aware, schema-valid, deterministic at the application boundary, resilient to provider failures, and safe against untrusted reference data.

| ID | P0 item | Status | Evidence |
|---|---|:---:|---|
| S1.1 | Audit existing LLM pipeline against the research docs | 🟢 | Existing extraction → research → generation → coverage → repair → schedule → validation flow reviewed. |
| S1.2 | Harden requirement extraction | 🟢 | Zod boundary, deterministic IDs, conservative dedupe, JD evidence/priority safeguards, thin-input behavior. |
| S1.3 | Centralize prompt architecture | 🟢 | Added `server/src/generation/prompts.ts`; extraction and question generation now use dedicated prompt builders. |
| S1.4 | Ground generation in source-labeled research evidence | 🟢 | Added `buildResearchEvidencePacket()`; company pages and public discussion are explicitly separated and URL-labeled. |
| S1.5 | Requirement-first question planning | 🟢 | Generation iterates one requirement at a time and assigns category/requirement IDs in application code. |
| S1.6 | Schema-validated question generation | 🟢 | Generated output passes `GeneratedQuestionBatchSchema`; IDs are application-owned; malformed output is rejected. |
| S1.7 | Deterministic coverage | 🟢 | `checkCoverage()` owns coverage and shippability; invalid references are non-coverage. |
| S1.8 | Bounded coverage repair | 🟢 | Second pass targets only uncovered requirements and preserves successful first-pass questions. |
| S1.9 | Preserve user edits during scoped regeneration | 🟡 | Scoped regeneration preserves non-scoped/manual content; no separate persisted `pinned` field exists in Appendix A. |
| S1.10 | Flashcard generation from validated questions | 🟢 | Flashcards are now deterministically derived from final validated questions. |
| S1.11 | Provider reliability | 🟢 | Provider abstraction, 60s request timeout, rate-limit/transient classification, bounded exponential retry, malformed-response rejection. |
| S1.12 | Security / prompt-injection boundary | 🟢 | JD/web/search data is untrusted; centralized prompts prohibit instruction following from reference data; SSRF/content limits remain enforced. |

### P0 verification status

- **Source-level implementation:** 🟢 for 11/12 items; S1.9 remains 🟡 only for the missing explicit persisted pin concept.
- **Runtime verification of the new Sprint 1 commits:** 🟢 — GitHub Actions run `35447784502` passed `npm install`, all workspace tests, all workspace builds, evaluator CLI help, server start, and `/health`.
- **New tests added:** centralized prompt safety, source-labeled research evidence, deterministic flashcard derivation.
- **P0 gate:** runtime verification is now 🟢. S1.9 remains 🟡 because explicit persisted pin semantics are still not represented in Appendix A.
- **P1 started:** source-level P1 implementation is now active below; P0 is not being declared runtime-green prematurely.

---

# AI Interview Prep Kit — Master Checklist

## Steps 1–10 — Current Checklist

**Repository:** `LEKKALAGANESH/ai-interview-prep-kit`  
**Status:** Step 10 evaluator implementation is complete at source level; runtime/performance verification remains pending. One Step 9 CI test failure remains intentionally deferred.

### Step 9 Checklist

| # | Step 9 item | Status |
|---:|---|:---:|
| 1 | Input validation | 🟢 |
| 2 | Input normalization | 🟢 |
| 3 | Research | 🟢 |
| 4 | Extraction | 🟢 |
| 5 | Question generation | 🟢 |
| 6 | Coverage Pass 1 | 🟢 |
| 7 | Coverage Repair Pass 2 | 🟢 |
| 8 | Deterministic scheduling | 🟢 |
| 9 | Final `KitSchema` validation | 🟢 |
| 10 | Persistence interface | 🟢 |
| 11 | Persistence implementation | 🟢 |
| 12 | Pipeline → persistence | 🟢 |
| 13 | API request schema | 🟢 |
| 14 | API success response | 🟢 |
| 15 | Structured API errors | 🟢 |
| 16 | Missing LLM credentials handling | 🟢 |
| 17 | Retrieval failure handling | 🟢 |
| 18 | LLM rate-limit/transient handling | 🟢 |
| 19 | Malformed model-output handling | 🟢 |
| 20 | Partial-generation failure handling | 🟢 |
| 21 | Duplicate-trigger/idempotency protection | 🟢 |
| 22 | Don't persist invalid kits | 🟢 |
| 23 | Persist source metadata | 🟢 |
| 24 | Persist company brief | 🟢 |
| 25 | Persist role/requirements | 🟢 |
| 26 | Persist questions | 🟢 |
| 27 | Persist flashcards | 🟢 |
| 28 | Persist schedule | 🟢 |
| 29 | Persist coverage | 🟢 |
| 30 | Persist research metadata | 🟢 |
| 31 | Successful pipeline integration test | 🟢 |
| 32 | Invalid-input API test | 🟢 |
| 33 | Research failure test | 🟢 |
| 34 | Generation failure test | 🟢 |
| 35 | Final invalid-kit test | 🟢 |
| 36 | Persistence failure test | 🟢 |
| 37 | Duplicate-trigger test | 🟢 |
| 38 | 1-day integration test | 🟢 |
| 39 | 60-day integration test | 🟢 |
| 40 | Preserve Steps 1–8 | 🟢 |
| 41 | README documentation | 🟢 |
| 42 | `.env.example` audit | 🟢 |
| 43 | No secrets committed | 🟢 |
| 44 | Runtime execution | 🟡 |
| 45 | Repository audit GREEN | 🟡 |

### Step 9 verification note

The latest CI verification reached the server test suite with **one remaining known test failure**. The failure is intentionally deferred and will be fixed later. Therefore Step 9 is tracked as 🟡 rather than falsely marking the full verification gate green.

## Step 10 — Mandatory Batch Evaluator

| # | Checklist | Status |
|---:|---|:---:|
| 10.1 | Create evaluation package | 🟢 |
| 10.2 | Implement the mandatory `evaluate` command | 🟢 |
| 10.3 | Accept array cases with `id`, `jd`, `company_url`, `days` | 🟢 |
| 10.4 | Use the same pipeline as the app | 🟢 |
| 10.5 | Use requested `days` | 🟢 |
| 10.6 | Emit Appendix B output | 🟢 |
| 10.7 | Continue after individual case failures | 🟢 |
| 10.8 | Support invalid/404/timeout URLs | 🟢 |
| 10.9 | Support thin JDs and missing hiring pages | 🟢 |
| 10.10 | Support no public interview discussion | 🟢 |
| 10.11 | Handle invalid model JSON | 🟢 |
| 10.12 | Handle LLM rate-limit/transient failures | 🟢 |
| 10.13 | Handle duplicate company/JD cases | 🟢 |
| 10.14 | Handle 1-day and 60-day cases | 🟢 |
| 10.15 | Support local company URLs and relative links | 🟢 |
| 10.16 | Document environment variables | 🟢 |
| 10.17 | Verify 5 cases under 15 minutes including retries | 🟡 |
| 10.18 | Add evaluator tests | 🟢 |

### Step 10 implementation notes

- `evaluation/` now contains the evaluator package, CLI, evaluator service, and tests.
- The CLI contract is exactly `npm run evaluate -- --input <cases.json> --output <kits.json>`.
- Input is validated with the shared `EvaluationInputSchema`, normalized with the shared input normalizer, and processed case-by-case.
- Each case calls `generateKitFromInput`, the same application pipeline used by the API.
- Requested `days` are passed through unchanged.
- Output is validated against the shared Appendix B-oriented `EvaluationOutputSchema`.
- A case failure becomes `status: "failed"` with structured `code` and `message`; later cases continue.
- Local company URLs are enabled only through the evaluator's explicit `allowLocalhost` option; normal application behavior remains restricted.
- Existing server pipeline behavior supplies the invalid URL, retrieval, thin-JD, missing-public-discussion, malformed-model-output, rate-limit/transient, duplicate/idempotency, and 1/60-day handling.
- Evaluator tests cover successful batch processing, requested day counts, per-case failure continuation, and duplicate case-ID rejection.
- Item 10.17 remains 🟡 because the evaluator has not yet been runtime-measured against five real cases under the 15-minute requirement.

## Step 11 — Builder / Editing

| # | Checklist | Status |
|---:|---|:---:|
| 11.1 | Display generated kit | ⬜ |
| 11.2 | Inline edit questions/answers | ⬜ |
| 11.3 | Reorder questions | ⬜ |
| 11.4 | Move questions between days | ⬜ |
| 11.5 | Add and delete questions | ⬜ |
| 11.6 | Preserve manual edits during scoped regeneration | ⬜ |
| 11.7 | Persist builder changes | ⬜ |
| 11.8 | Loading/error states | ⬜ |
| 11.9 | Keyboard accessibility | ⬜ |
| 11.10 | Responsive laptop/mobile UI | ⬜ |
| 11.11 | Add builder tests | ⬜ |

### Step 11 implementation notes

- Added shared builder operations for question editing, reordering/moving, adding, deleting, and scoped regeneration.
- Builder edits preserve question IDs and validate the resulting kit against `KitSchema`.
- Schedule minutes are recalculated deterministically at 10 minutes per question.
- Coverage is recalculated after edits so deleting the only question covering a requirement exposes that requirement again.
- Added persistent `KitStore.update()` support for in-memory and durable JSON storage.
- Added `GET /api/kits/:id` for reload/display and `PATCH /api/kits/:id` for builder edits.
- Added a responsive Next.js builder screen with loading/error states, inline question/answer editing, add/delete controls, and keyboard-operable reorder controls.
- Scoped regeneration is represented by a shared operation that only replaces the requested question IDs, preserving all non-scoped/manual content.
- Item 11.20 remains 🟡 until the new builder test suite is observed passing in CI/runtime.

## Step 12 — Practice Mode

| # | Checklist | Status |
|---:|---|:---:|
| 12.1 | Display one flashcard/question at a time | 🟢 |
| 12.2 | Show question before answer | 🟢 |
| 12.3 | Reveal answer on user action | 🟢 |
| 12.4 | Record confidence after answering | 🟢 |
| 12.5 | Support confidence levels consistently | 🟢 |
| 12.6 | Track practiced question IDs | 🟢 |
| 12.7 | Track covered requirements during practice | 🟢 |
| 12.8 | Show current practice progress | 🟢 |
| 12.9 | Move to next question | 🟢 |
| 12.10 | Prevent invalid/out-of-range question navigation | 🟢 |
| 12.11 | Prioritize low-confidence questions for the next session | 🟢 |
| 12.12 | Persist practice/confidence state | 🟢 |
| 12.13 | Resume practice after reload | 🟢 |
| 12.14 | Handle completed practice sessions | 🟢 |
| 12.15 | Handle empty/no-question kits gracefully | 🟢 |
| 12.16 | Loading states | 🟢 |
| 12.17 | Error states | 🟢 |
| 12.18 | Keyboard accessibility | 🟢 |
| 12.19 | Responsive laptop/mobile UI | 🟢 |
| 12.20 | Add practice-mode tests | 🟡 |

### Step 12 implementation notes

- Added shared practice state and deterministic queue logic.
- Practice presents one generated question at a time, with answer reveal and low / medium / high confidence capture.
- Practice records question IDs and derives requirement coverage from practiced questions.
- Completed sessions can start a new session; low-confidence questions are prioritized by the next queue.
- Practice state is persisted separately from the generated kit so reloads retain results.
- Added GET /api/kits/:id/practice and POST /api/kits/:id/practice.
- Added responsive practice UI with loading/error handling and keyboard-operable native buttons.
- Empty kits and completed sessions are handled explicitly.
- Practice tests cover confidence recording/completion, low-confidence prioritization, and requirement coverage.
- Item 12.20 remains 🟡 until the new practice test suite is observed passing in CI/runtime.

## Step 13 — Frontend Application

| # | Checklist | Status |
|---:|---|:---:|
| 13.1 | Create Next.js frontend package | 🟢 |
| 13.2 | Configure Tailwind CSS | 🟢 |
| 13.3 | Build JD / company URL / days input flow | 🟢 |
| 13.4 | Connect frontend to backend API | 🟢 |
| 13.5 | Generation loading / progress state | 🟢 |
| 13.6 | Structured error UI | 🟢 |
| 13.7 | Render requirements, coverage, questions and schedule | 🟢 |
| 13.8 | Integrate Builder and Practice Mode | 🟢 |
| 13.9 | Responsive design | 🟢 |
| 13.10 | Keyboard / accessibility support | 🟢 |
| 13.11 | Add frontend tests | 🟡 |

### Step 13 implementation notes

- Completed the Next.js frontend package and added the Tailwind CSS v4/PostCSS configuration.
- Added the primary JD, company URL, and 1–60 day generation flow using the existing backend API.
- Added existing-kit loading by persisted kit ID.
- Added generation/loading progress and structured API error presentation.
- Rendered role/company information, requirements, coverage, questions, schedule, Builder, and Practice Mode in one responsive application flow.
- Added keyboard-operable native controls and visible focus states.
- Added frontend validation tests for preparation days and the generation payload.
- Item 13.11 remains 🟡 until the frontend test suite and production build are observed passing in CI/runtime.

## Step 14 — Backend Hardening

| # | Checklist | Status |
|---:|---|:---:|
| 14.1 | Separate retrieval/extraction/generation/scheduling/persistence | 🟢 |
| 14.2 | Validate requests and generated kits before save | 🟢 |
| 14.3 | Persist enough state for reload | 🟢 |
| 14.4 | Structured errors | 🟢 |
| 14.5 | Handle long-running generation safely | 🟢 |
| 14.6 | Handle partial failure | 🟢 |
| 14.7 | Handle duplicate triggers | 🟢 |
| 14.8 | Harden idempotency/request locking | 🟢 |
| 14.9 | Add API/server integration coverage | 🟡 |

### Step 14 implementation notes

- Kept retrieval, extraction, generation, scheduling/coverage, assembly, and persistence as separate modules; the application orchestrator composes them without merging responsibilities.
- Request input is validated with the shared input schema before normalization and generation.
- Final kits pass KitSchema validation and the must-have coverage gate before persistence; failed assembly never calls store.save().
- Durable JSON persistence uses atomic temp-file + rename writes; practice state is persisted separately, and in-memory practice state is now correctly isolated from the durable-store implementation.
- Added explicit server request/header timeouts suitable for the assessment's long-running generation path.
- Added a 60-second bounded Gemini request timeout, with timeout failures treated as transient/retryable by the existing generation retry layer.
- Partial generation remains best-effort per requirement, records generation errors, and the final shippability gate prevents incomplete must-have coverage from being persisted.
- Duplicate generation requests are coalesced in-process and protected by per-kit request locks; durable locks now scope to the deterministic kit ID instead of serializing unrelated requests.
- Added backend hardening integration coverage for structured validation errors, validated persistence/reload, and concurrent identical-request idempotency.
- Added provider abstraction for Gemini, OpenAI, Anthropic Claude, Groq, and local Ollama; provider/model selection is optional and backward-compatible with the assessment evaluator.
- Added provider adapter tests and a smooth animated frontend provider selector; API keys remain server-side.
- Item 14.9 remains 🟡 until the integration suite is observed passing in CI/runtime; no local test execution is being claimed.

## Step 15 — Final Repository & Assessment Verification

| # | Checklist | Status |
|---:|---|:---:|
| 15.1 | Root npm install works from clean clone | 🟢 |
| 15.2 | Root npm test works | 🟢 |
| 15.3 | Root npm run build works | 🟡 |
| 15.4 | Mandatory evaluator command works | 🟢 |
| 15.5 | Five evaluation cases under 15 minutes | 🟡 |
| 15.6 | GitHub Actions covers full repository | 🟢 |
| 15.7 | No secrets committed | 🟢 |
| 15.8 | README matches actual architecture | 🟢 |
| 15.9 | Appendix A verified | 🟢 |
| 15.10 | Appendix B verified | 🟢 |
| 15.11 | Edge cases verified | 🟡 |
| 15.12 | Security/SSRF/content-size checks verified | 🟢 |
| 15.13 | Steps 1–14 regression check | 🟢 |
| 15.14 | Final clean-clone audit | 🟡 |
| 15.15 | Final submission readiness | 🟡 |

### Step 15 verification notes

- The reported server failure was traced to a test that incorrectly expected an uncovered nice requirement to remain uncovered after repair. The generation pipeline now repairs all uncovered requirements, while can_ship still gates only uncovered must requirements.
- The reported frontend build failure was caused by the local Question type omitting the canonical category field. The frontend type now matches KitSchema.
- Root workspace builds previously stopped because server, shared, and evaluation had no build scripts or TypeScript configs. Each package now has a strict tsc --noEmit build/typecheck target.
- Added a five-case evaluator fixture at evaluation/cases.example.json. Use an actual filename in PowerShell; <cases.json> is placeholder notation and is interpreted as shell syntax.
- CI now installs and verifies the full workspace with root npm install, npm test, npm run build, evaluator CLI help, and server health.
- CI runtime evidence now confirms 15.1–15.4 and 15.13 on the current head. Items 15.5, 15.11, 15.14, and 15.15 remain yellow pending the actual five-case evaluator SLA, broader edge-case run, final clean-clone audit, and final submission gate.

## Overall Progress

| Step | Area | Status |
|---:|---|:---:|
| 1 | Canonical contract | 🟢 |
| 2 | Input validation/normalization | 🟢 |
| 3 | Secure research/retrieval | 🟢 |
| 4 | JD extraction | 🟢 |
| 5 | Question generation | 🟢 |
| 6 | Coverage | 🟢 |
| 7 | Coverage repair | 🟢 |
| 8 | Scheduling | 🟢 |
| 9 | Backend pipeline/persistence/API | 🟢 |
| 10 | Mandatory evaluator | 🟡 Active |
| 11 | Builder | 🟡 Active |
| 12 | Practice mode | 🟢 |
| 13 | Frontend | 🟡 Active |
| 14 | Backend hardening | 🟡 Active |
| 15 | Final verification | 🟡 Active |

**Working rule:** The known Step 9 test failure is deferred; Step 10 can proceed, but Step 9 remains 🟡 until that failure and the final runtime/audit verification are resolved.
