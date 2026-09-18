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
| 13.1 | Create Next.js frontend package | ⬜ |
| 13.2 | Configure Tailwind | ⬜ |
| 13.3 | Build JD/company URL/days input flow | ⬜ |
| 13.4 | Connect frontend to backend API | ⬜ |
| 13.5 | Generation loading/progress state | ⬜ |
| 13.6 | Structured error UI | ⬜ |
| 13.7 | Render requirements, coverage, questions and schedule | ⬜ |
| 13.8 | Integrate Builder and Practice Mode | ⬜ |
| 13.9 | Responsive design | ⬜ |
| 13.10 | Keyboard/accessibility support | ⬜ |
| 13.11 | Add frontend tests | ⬜ |

## Step 14 — Backend Hardening

| # | Checklist | Status |
|---:|---|:---:|
| 14.1 | Separate retrieval/extraction/generation/scheduling/persistence | ⬜ |
| 14.2 | Validate requests and generated kits before save | ⬜ |
| 14.3 | Persist enough state for reload | ⬜ |
| 14.4 | Structured errors | ⬜ |
| 14.5 | Handle long-running generation safely | ⬜ |
| 14.6 | Handle partial failure | ⬜ |
| 14.7 | Handle duplicate triggers | ⬜ |
| 14.8 | Harden idempotency/request locking | ⬜ |
| 14.9 | Add API/server integration coverage | ⬜ |

## Step 15 — Final Repository & Assessment Verification

| # | Checklist | Status |
|---:|---|:---:|
| 15.1 | Root npm install works from clean clone | ⬜ |
| 15.2 | Root npm test works | ⬜ |
| 15.3 | Root npm run build works | ⬜ |
| 15.4 | Mandatory evaluator command works | ⬜ |
| 15.5 | Five evaluation cases under 15 minutes | ⬜ |
| 15.6 | GitHub Actions covers full repository | ⬜ |
| 15.7 | No secrets committed | ⬜ |
| 15.8 | README matches actual architecture | ⬜ |
| 15.9 | Appendix A verified | ⬜ |
| 15.10 | Appendix B verified | ⬜ |
| 15.11 | Edge cases verified | ⬜ |
| 15.12 | Security/SSRF/content-size checks verified | ⬜ |
| 15.13 | Steps 1–14 regression check | ⬜ |
| 15.14 | Final clean-clone audit | ⬜ |
| 15.15 | Final submission readiness | ⬜ |

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
| 9 | Backend pipeline/persistence/API | 🟡 |
| 10 | Mandatory evaluator | 🟡 Active |
| 11 | Builder | 🟡 Active |
| 12 | Practice mode | ⬜ |
| 13 | Frontend | ⬜ |
| 14 | Backend hardening | ⬜ |
| 15 | Final verification | ⬜ |

**Working rule:** The known Step 9 test failure is deferred; Step 10 can proceed, but Step 9 remains 🟡 until that failure and the final runtime/audit verification are resolved.
