# AI Interview Prep Kit — Master Checklist

## Steps 1–9 — Current Checklist



**Repository:** `LEKKALAGANESH/ai-interview-prep-kit`  
**Status:** Implementation complete; runtime execution remains unverified through the available GitHub integration.

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

## Implementation notes

### Items 1–9
The shared Appendix A contract, input validation/normalization, secure retrieval/research, JD extraction, LLM question generation, deterministic coverage, bounded second-pass repair, deterministic scheduling, and final `KitSchema` validation are implemented.

### Items 10–22
The backend has a `KitStore` abstraction, in-memory storage for tests, and a durable JSON-backed store. Request IDs are deterministic from normalized company URL, JD, and requested days. Existing requests are reused, and concurrent identical requests are coalesced/locked. Invalid or unshippable kits are rejected before persistence.

### Items 23–30
The assembled kit persists source metadata, company brief, role/requirements, questions, flashcards, schedule, coverage, and researched page metadata according to the Appendix A structure.

### Items 31–39
Integration and edge-case tests have been added for successful generation, invalid input, research failure, generation failure, final invalid kits, persistence failure, duplicate triggers, 1-day schedules, and 60-day schedules.

### Item 40
Steps 1–8 remain integrated with Step 9.

### Items 41–43
README and environment documentation were updated. Secrets are excluded through `.gitignore`; `.env.example` contains placeholders only.

### Item 44 — Runtime execution
A Node 20 GitHub Actions workflow is committed. It installs dependencies, runs shared/server tests, starts the server, and checks `/health`. The available GitHub integration did not expose a completed workflow run/status, so runtime success is intentionally **not** claimed.

### Item 45 — Repository audit
The final audit remains 🟡 solely because runtime execution (item 44) is unverified. Once a real CI run completes successfully, this item can be moved to 🟢.

## Important architectural status

The API now accepts raw `jd`, `company_url`, and `days` and routes them through:

```
API request
  ↓
validation
  ↓
normalization
  ↓
company research
  ↓
JD extraction
  ↓
question generation
  ↓
coverage pass 1
  ↓
coverage repair pass 2
  ↓
deterministic schedule
  ↓
final KitSchema validation
  ↓
durable persistence
```

The durable persistence implementation is JSON-file based and intended for the current single-node backend slice. The storage abstraction allows a production database implementation to replace it later.

## Step 9 gate

**Do not start Step 10 until:**
1. CI/runtime verification has produced an actual successful run.
2. Item 44 is changed from 🟡 to 🟢.
3. Item 45 is changed from 🟡 to 🟢.
4. The repository audit confirms no regressions in Steps 1–9.

**Current gate:** 🟡 — waiting only on observable runtime verification.


---

# Remaining Assessment Checklists

> These are the remaining assessment requirements to track. They are not marked complete until implemented and verified.

## Step 10 — Mandatory Batch Evaluator

| # | Checklist | Status |
|---:|---|:---:|
| 10.1 | Create evaluation package | ⬜ |
| 10.2 | Implement the mandatory evaluate command | ⬜ |
| 10.3 | Accept array cases with id, jd, company_url, days | ⬜ |
| 10.4 | Use the same pipeline as the app | ⬜ |
| 10.5 | Use requested days | ⬜ |
| 10.6 | Emit Appendix B output | ⬜ |
| 10.7 | Continue after individual case failures | ⬜ |
| 10.8 | Support invalid/404/timeout URLs | ⬜ |
| 10.9 | Support thin JDs and missing hiring pages | ⬜ |
| 10.10 | Support no public interview discussion | ⬜ |
| 10.11 | Handle invalid model JSON | ⬜ |
| 10.12 | Handle LLM rate-limit/transient failures | ⬜ |
| 10.13 | Handle duplicate company/JD cases | ⬜ |
| 10.14 | Handle 1-day and 60-day cases | ⬜ |
| 10.15 | Support local company URLs and relative links | ⬜ |
| 10.16 | Document environment variables | ⬜ |
| 10.17 | Verify 5 cases under 15 minutes including retries | ⬜ |
| 10.18 | Add evaluator tests | ⬜ |

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

## Step 12 — Practice Mode

| # | Checklist | Status |
|---:|---|:---:|
| 12.1 | One flashcard/question at a time | ⬜ |
| 12.2 | Reveal answer | ⬜ |
| 12.3 | Capture confidence | ⬜ |
| 12.4 | Show coverage | ⬜ |
| 12.5 | Persist practice results | ⬜ |
| 12.6 | Surface low-confidence items in next session | ⬜ |
| 12.7 | Keyboard-accessible controls | ⬜ |
| 12.8 | Add practice tests | ⬜ |

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
| 10 | Mandatory evaluator | ⬜ |
| 11 | Builder | ⬜ |
| 12 | Practice mode | ⬜ |
| 13 | Frontend | ⬜ |
| 14 | Backend hardening | ⬜ |
| 15 | Final verification | ⬜ |

**Gate:** Do not start Step 10 until Step 9 runtime verification and final audit are green.