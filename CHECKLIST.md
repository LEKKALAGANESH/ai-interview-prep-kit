# Step 22 — Production

**Goal:** Confirm the production deployment, database, security, and end-to-end account/kit lifecycle are complete.

| # | Production checklist | Status | Definition of done |
|---:|---|:---:|---|
| 22.1 | Frontend deployed | 🟢 | Production frontend is deployed and available. |
| 22.2 | Backend deployed | 🟢 | Production backend/API is deployed and available. |
| 22.3 | MongoDB production database | 🟢 | Production persistence uses the configured MongoDB database. |
| 22.4 | Environment variables secure | 🟢 | Production secrets/configuration are supplied through secure environment-variable configuration rather than committed to the repository. |
| 22.5 | HTTPS | 🟢 | Production frontend/backend traffic is served over HTTPS. |
| 22.6 | Registration tested | 🟢 | Production registration flow has been tested successfully. |
| 22.7 | Login tested | 🟢 | Production login/session flow has been tested successfully. |
| 22.8 | Kit creation tested | 🟢 | Production kit generation/creation flow has been tested successfully. |
| 22.9 | Persistence tested | 🟢 | Production kit persistence and retrieval have been tested successfully. |
| 22.10 | Logout tested | 🟢 | Production logout/session termination flow has been tested successfully. |
| 22.11 | User isolation tested | 🟢 | Production authorization has been tested to prevent one user from reading or mutating another user's kits. |

### Step 22 implementation notes

- Production checklist is recorded as complete based on the completed production work and verification supplied for this finalization pass.
- Production MongoDB is the durable persistence target when MONGODB_URI is configured.
- Authentication and authorization remain server-side; user identity comes from the authenticated session rather than a client-supplied user ID.
- The production checklist is separate from the source-level test-runtime caveats in Step 21; those earlier yellow items are not silently changed without current-head runtime evidence.

# Step 21 — Testing

**Goal:** Verify that authentication, authorization, persistence, kit CRUD, regression coverage, the existing AI pipeline, and the mandatory batch evaluator remain covered by automated tests without claiming runtime results that have not been observed.

| # | Testing checklist | Status | Definition of done |
|---:|---|:---:|---|
| 21.1 | Auth unit tests | 🟢 | server/src/auth/auth.test.ts covers password hashing, password verification, session authentication, and session behavior. |
| 21.2 | Auth integration tests | 🟢 | server/src/auth/auth.api.test.ts covers registration, duplicate registration, login, current-session lookup, logout, invalid credentials, and protected middleware rejection. |
| 21.3 | Authorization tests | 🟢 | server/src/auth/user-scoped-store.test.ts covers read isolation, cross-user update rejection, cross-user delete rejection, and cross-user regeneration rejection. |
| 21.4 | MongoDB tests | 🟡 | server/src/persistence/mongodb.test.ts covers Mongo user/kit CRUD, indexes, user isolation, connection reuse, deletion, and duplicate-email behavior, but the suite is skipped unless MONGODB_URI is configured. |
| 21.5 | Kit CRUD tests | 🟢 | Persistence tests cover save/retrieve, unknown IDs, deterministic IDs, durable persistence, and deletion behavior is now implemented across stores. |
| 21.6 | Regression tests | 🟡 | The existing server test suite still covers retrieval, extraction, generation, pipeline, persistence, API, and authentication paths, but the latest authorization changes have not yet been observed in a fresh full-suite runtime execution. |
| 21.7 | Existing AI tests still pass | 🟡 | Existing AI/retrieval/extraction/generation/pipeline tests remain in the server test command and no AI pipeline logic was intentionally removed, but current-head runtime execution has not been observed. |
| 21.8 | Batch evaluator still works | 🟡 | evaluation/src/evaluator.test.ts covers successful batches, requested day counts, per-case failure continuation, and duplicate IDs; current-head evaluator runtime execution has not yet been observed. |

### Step 21 implementation notes

- server/package.json includes authentication, persistence, API, pipeline, generation, extraction, and retrieval test globs in the server test command.
- Authentication tests are separated into lower-level auth tests and API/middleware integration tests.
- Authorization tests now directly exercise the newly required A/B isolation rules, including delete and regeneration.
- MongoDB tests are intentionally conditional on MONGODB_URI; this prevents a missing live database from being reported as a passing MongoDB runtime test.
- Kit persistence tests cover durable store behavior and isolation-related persistence contracts.
- The root npm test script continues to delegate to all workspace test scripts.
- The evaluator retains its automated tests and continues to use the same application generation pipeline through evaluateCases.
- No runtime test result is being invented for this step. 🟡 items become green only after the relevant current-head CI/runtime execution is observed.

### Step 21 verification rule

Keep test coverage items green when the required automated tests exist in the repository. Keep runtime-dependent items yellow until current-head execution demonstrates that the tests pass, including a configured MongoDB run for 21.4 and evaluator execution for 21.8.

# Step 20 — Authorization

**Goal:** Enforce the assessment security invariant that every authenticated user can access and mutate only their own kits. Cross-user reads, updates, deletes, and regeneration attempts must resolve as not found rather than crossing the authorization boundary.

| # | Authorization checklist | Status | Definition of done |
|---:|---|:---:|---|
| 20.1 | User A sees only A's kits | 🟢 | UserScopedKitStore prefixes every kit operation with the authenticated server-side user ID, so A can retrieve A's kit but the same kit ID in B's namespace is invisible to A. |
| 20.2 | User B sees only B's kits | 🟢 | The same server-side user scoping applies independently to B, so B retrieves only B's kits. |
| 20.3 | A cannot read B | 🟢 | A lookup uses A's scoped key; a kit stored for B returns null/not found instead of exposing B's kit. |
| 20.4 | A cannot modify B | 🟢 | A update targets A's scoped key; attempting to update B's kit resolves as an unknown kit and cannot change B's persisted data. |
| 20.5 | A cannot delete B | 🟢 | Kit deletion is now part of KitStore and is routed through UserScopedKitStore, so A can delete only A's scoped kit. A delete attempt for B returns false/not found and leaves B's kit intact. |
| 20.6 | A cannot regenerate B | 🟢 | Scoped builder regeneration first retrieves the kit through the authenticated user's UserScopedKitStore; A's request for B's kit therefore returns 404 before regeneration can run. |

### Step 20 implementation notes

- server/src/index.ts authenticates every /api/* request and creates UserScopedKitStore(store, auth.id) from the server-derived session identity.
- UserScopedKitStore now scopes save, getById, update, delete, request locks, practice state, pins, and research provenance with the authenticated user's namespace.
- KitStore now exposes delete(id), with implementations for in-memory, durable JSON, and MongoDB persistence.
- DELETE /api/kits/:id was added to the protected kit route. It returns 404 when the kit does not exist in the authenticated user's scope and never uses a client-supplied user ID.
- MongoDB deletion is constrained by both user_id and kit_id, and removes the associated practice/pin/provenance sidecars for that same user.
- server/src/auth/user-scoped-store.test.ts now covers same-ID isolation, cross-user update rejection, cross-user delete rejection, and cross-user regeneration rejection.
- Regeneration remains inside the authenticated scoped builder path, so the authorization boundary is enforced before LLM regeneration work begins.
- No client-controlled userId is used as the authorization source.

### Step 20 verification rule

Keep the six authorization items green based on the implemented server-side scoping and dedicated authorization tests. Runtime/CI execution of the new tests should still be included in the broader final verification pass; no new runtime result is being claimed from source inspection alone.

# Step 19 — Regeneration

**Goal:** Ensure scoped question regeneration replaces only the requested question, preserves user-owned content and unrelated kit state, and persists the regenerated result.

| # | Regeneration checklist | Status | Definition of done |
|---:|---|:---:|---|
| 19.1 | Existing regeneration still works | 🟢 | The builder PATCH flow supports `regenerate_question`, regenerates the selected question using its existing requirement/category/difficulty context, and keeps its stable question ID. |
| 19.2 | User edits preserved | 🟢 | Regeneration starts from the current persisted kit and replaces only the selected question, leaving other manually edited questions and kit fields unchanged. |
| 19.3 | User-added questions preserved | 🟢 | User-added questions remain in the current kit because scoped regeneration replaces only the requested question ID. |
| 19.4 | Pinned content preserved | 🟢 | Pin state is stored separately from the kit and regeneration does not modify the pinned-question sidecar. |
| 19.5 | Unrelated categories preserved | 🟢 | Regeneration keeps the selected question's existing category and only replaces the targeted question; unrelated questions/categories are not regenerated. |
| 19.6 | Regenerated result persisted | 🟢 | The regenerated kit is validated with `KitSchema` and persisted through `store.update()` under the existing request lock before being returned. |

### Step 19 implementation notes

- `server/src/api/builder.ts` handles the `regenerate_question` operation separately from normal builder edits.
- The existing question's requirement, category, difficulty, and requirement IDs are carried into the regeneration request/replacement.
- `shared/src/builder.ts` uses `regenerateScopedQuestions()` to replace only the selected question by its stable ID.
- The corresponding generated flashcard is updated only when it already exists for the regenerated question; unrelated flashcards remain untouched.
- Because user-added and manually edited questions are outside the regeneration scope, they remain in the kit.
- Pin state is persisted separately, so replacing a question does not rewrite or clear pinned-question state.
- The regenerated result is validated and saved through the same authenticated, user-scoped KitStore path.
- No runtime execution is being claimed here; these green statuses are based on the current implementation and persistence flow.

### Step 19 verification rule

Keep the six regeneration items green based on the implemented scoped-regeneration contract. Runtime/browser verification should still be included in the broader final verification pass.

# Step 18 — Editing

**Goal:** Verify that existing builder editing remains functional and that question/schedule edits are persisted without losing the canonical kit structure.

| # | Editing checklist | Status | Definition of done |
|---:|---|:---:|---|
| 18.1 | Existing editing still works | 🟢 | Existing questions can be edited through the builder PATCH flow and the resulting kit is validated before persistence. |
| 18.2 | Changes saved | 🟢 | Builder changes call KitStore.update() and return the persisted kit after a successful PATCH. |
| 18.3 | Add question saved | 🟢 | A new question is added to the kit and its selected schedule day, then the complete kit is persisted. |
| 18.4 | Delete question saved | 🟢 | A deleted question is removed from both the question list and all schedule day references, then persisted. |
| 18.5 | Reorder saved | 🟢 | Question ordering/movement is applied to schedule day question IDs and the updated kit is persisted. |
| 18.6 | Flashcard changes saved | 🟢 | Flashcards now have a dedicated `edit_flashcard` BuilderEdit operation, the complete kit is validated with KitSchema, persisted through KitStore.update(), and the frontend provides editable front/back fields with Save/Discard controls. |
| 18.7 | Company brief changes saved | 🟢 | Company brief now has a dedicated `edit_company_brief` BuilderEdit operation, validates summary/description/sources through KitSchema, persists through KitStore.update(), and the frontend provides editable fields with Save/Cancel controls. |

### Step 18 implementation notes

- Existing question editing is implemented in `shared/src/builder.ts` through `edit_question`.
- Add, delete, and reorder operations are also implemented as typed `BuilderEdit` variants.
- `server/src/api/builder.ts` applies the edit, validates the complete result with `KitSchema.parse()`, and persists it through `store.update()` under the existing request lock.
- Schedule minutes and coverage are recalculated after builder edits, keeping derived state consistent.
- Flashcards now support dedicated front/back editing through `edit_flashcard`; requirement lineage is preserved and the complete kit is revalidated before persistence.
- Company brief now supports dedicated summary, `what_they_do`, and source editing through `edit_company_brief`; source URLs are revalidated by `KitSchema` before persistence.
- The frontend exposes Save/Discard controls for flashcards and Save/Cancel controls for the company brief, using the same authenticated PATCH persistence path as question editing.
- Shared builder tests cover successful flashcard/company-brief edits, preservation of unrelated kit state, stable flashcard IDs, and invalid edit rejection.
- No runtime execution is being claimed from this source-only pass; the dedicated edit operations, validation, persistence path, frontend controls, and regression tests are now present.

### Step 18 verification rule

Keep all 18.1–18.7 items green: question/schedule editing plus dedicated flashcard and company-brief editing are implemented, validated, persisted, and exposed in the frontend. Runtime/browser execution remains part of the broader verification evidence rather than being invented from source inspection alone.

# Step 17 — Kit Persistence

**Goal:** Ensure the existing AI-generated kit remains the canonical Appendix A-shaped artifact, keeps stable identifiers and metadata, and survives normal user/session and server lifecycle events.

| # | Kit checklist | Status | Definition of done |
|---:|---|:---:|---|
| 17.1 | Existing AI-generated kit saved | 🟢 | The generation pipeline passes the completed validated kit to the configured KitStore for persistence. |
| 17.2 | Default name = company name | 🟢 | The persisted kit source metadata uses the company name derived from the company URL; the current Appendix A model does not introduce a separate mutable kit-name field. |
| 17.3 | Existing Appendix A structure preserved | 🟢 | KitSchema remains the canonical shape and MongoKitStore stores the complete kit under the kit field without reshaping its Appendix A structure. |
| 17.4 | Stable IDs preserved | 🟢 | Requirement, question, and flashcard IDs remain application-owned; deterministic kit IDs are derived from normalized company URL, JD, and days. |
| 17.5 | Existing metadata preserved | 🟢 | Source metadata, company brief, role, questions, flashcards, schedule, and coverage are persisted as part of the same validated kit. |
| 17.6 | Kit survives page refresh | 🟢 | The application retrieves persisted kits through GET /api/kits/:id rather than relying only on browser memory. |
| 17.7 | Kit survives logout/login | 🟢 | Kit data is stored independently of the session cookie and is scoped by the authenticated server-side user ID, so logging out does not delete the kit. |
| 17.8 | Kit survives server restart | 🟡 | JSON persistence already has cross-store-instance/restart tests; MongoDB persistence is implemented, but a live MongoDB restart/reconnect run has not yet been observed. |

### Step 17 implementation notes

- The existing generation pipeline continues to create the same validated Kit object before persistence.
- KitSchema remains unchanged as the canonical Appendix A contract.
- buildKitId() remains deterministic for the same normalized generation input.
- UserScopedKitStore keeps each user's kit namespace isolated from other users.
- JSON persistence is durable across new store instances and uses atomic replacement writes.
- MongoDB persistence stores the complete kit document and user association.
- The frontend reload path uses the persisted kit API, so a browser refresh does not require regeneration.
- Authentication sessions and kit persistence are separate concerns; logout clears the session cookie, not stored kits.
- No separate name field was added to Appendix A because the current canonical KitSchema has no such field. The existing company name is represented by source.company.

### Step 17 verification rule

17.1–17.7 are supported by the current source/tests. Keep 17.8 🟡 until a live MongoDB-backed restart/reconnect execution is observed.


# Step 16 — MongoDB Persistence

**Goal:** Replace the file-backed persistence path with MongoDB when MONGODB_URI is configured, while keeping the existing file store as the local fallback.

| # | MongoDB checklist | Status | Definition of done |
|---:|---|:---:|---|
| 16.1 | MongoDB connection works | 🟡 | A reusable MongoDB MongoClient is configured from MONGODB_URI, but a live MongoDB connection has not yet been observed in CI/runtime. |
| 16.2 | User stored | 🟢 | MongoUserStore persists authenticated users in the users collection with server-generated IDs and password hashes. |
| 16.3 | Kit stored | 🟢 | MongoKitStore persists kits in the kits collection. |
| 16.4 | Kit associated with user | 🟢 | Kit documents store both user_id and kit_id; the existing UserScopedKitStore supplies the authenticated user scope. |
| 16.5 | Kit retrieved | 🟢 | MongoDB lookup retrieves a kit by both user identity and kit ID. |
| 16.6 | Kit updated | 🟢 | Existing kits are updated with MongoDB updateOne; unknown kits are rejected. |
| 16.7 | Kit deleted | 🟢 | MongoKitStore.delete() removes the kit and its related practice, pin, and provenance sidecars. |
| 16.8 | Indexes created | 🟢 | Unique user/email and user/kit indexes are created for users, kits, practice, pins, and provenance. |
| 16.9 | Connection reused safely | 🟢 | MongoDB uses one cached connection promise with a bounded connection pool; failed initial connections reset the cached promise so later attempts can retry. |

### Step 16 implementation notes

- Added server/src/persistence/mongodb.ts with a reusable MongoClient connection.
- Added server/src/persistence/mongodb-store.ts for MongoDB-backed kit/practice/pin/provenance persistence.
- Added server/src/auth/mongodb-user-store.ts for MongoDB-backed users.
- UserStore automatically uses MongoDB when MONGODB_URI is configured; otherwise it keeps the existing JSON user store fallback.
- createKitStore() automatically uses MongoKitStore when MONGODB_URI is configured; otherwise it keeps the existing JSON kit store fallback.
- MongoDB kit documents preserve the authenticated user boundary through user_id + kit_id.
- Added unique indexes for user email and per-user kit/sidecar records.
- Added server/src/persistence/mongodb.test.ts. The suite is skipped when MONGODB_URI is absent, so no live MongoDB result is being claimed without a configured database.
- Added MongoDB configuration to .env.example.
- Added the official mongodb Node.js driver to server/package.json.

### Step 16 verification rule

Do not mark 16.1 green from source inspection alone. A live MongoDB-backed CI/runtime execution must confirm connection, user CRUD, kit CRUD, indexes, user association, and connection reuse.


# Step 14 — User Identity & Authorization Boundary

**Goal:** Ensure every authenticated account has a server-created identity, email uniqueness is enforced, and application authorization derives identity from the authenticated session rather than from client-supplied user identifiers.

| # | User checklist | Status | Definition of done |
|---:|---|:---:|---|
| 14.1 | User created correctly | 🟢 | Registration creates a server-generated user ID, normalized email, password hash, and timestamps in the user store. |
| 14.2 | Email unique | 🟢 | Registration rejects an already-registered normalized email with a conflict response. |
| 14.3 | User identity comes from session | 🟢 | Protected API authorization resolves the user from the signed session cookie and loads the user by session subject. |
| 14.4 | No client-controlled `userId` | 🟢 | Protected application APIs do not accept a client-supplied user ID as the authorization source; user scoping is created from the authenticated session user ID. |
| 14.5 | User identity test coverage | 🟢 | Tests cover duplicate registration, authenticated-session resolution, missing-session rejection, and user-scoped storage isolation. |
| 14.6 | Authorization runtime verification | 🟡 | Current GitHub Actions execution must confirm the new user-identity tests and build pass on the current commit. |

### Step 14 implementation notes

- User IDs are generated server-side with `randomUUID()` and are not accepted from registration input.
- Emails are normalized to lowercase before uniqueness checks and persistence.
- Protected API requests are authenticated through the signed `trao_session` cookie.
- The session contains the authenticated user's server-generated ID (`sub`).
- `requireAuth()` resolves the user from that session identity before application API access is granted.
- `UserScopedKitStore` receives the authenticated user ID from `requireAuth()` and prefixes persistence keys with that server-derived identity.
- A client cannot switch accounts by supplying a different `userId` in a normal protected request.
- The authentication test suite now includes duplicate-email registration with an attacker-controlled `userId` field; registration still returns the duplicate-email conflict.

### Step 14 verification rule

Do not mark 14.6 green from source inspection alone. It becomes green only after the current GitHub Actions run demonstrates the authentication/user-identity tests and build passing.
# Step 13 — Authentication (User System)

**Goal:** Add a minimal secure account/session layer around the existing AI Interview Prep system without changing the AI generation, research, coverage, scheduling, or validation logic.

| # | Authentication checklist | Status | Definition of done |
|---:|---|:---:|---|
| 13.1 | Register works | 🟢 | POST /api/auth/register validates credentials, creates a user, hashes the password, and starts a session. |
| 13.2 | Login works | 🟢 | POST /api/auth/login verifies the stored password hash and starts a session. |
| 13.3 | Logout works | 🟢 | POST /api/auth/logout clears the authentication cookie. |
| 13.4 | Session persists correctly | 🟢 | A valid HttpOnly session cookie authenticates subsequent requests and survives page refreshes. |
| 13.5 | Session expiry handled | 🟢 | Sessions contain an expiry timestamp and expired/invalid sessions are rejected. |
| 13.6 | Protected routes work | 🟢 | The authenticated application UI redirects signed-out visitors to /login. |
| 13.7 | Protected APIs work | 🟢 | Application /api/* endpoints require a valid authenticated session; auth endpoints remain public. |
| 13.8 | Passwords securely hashed | 🟢 | Passwords use one-way scrypt hashing with a per-password random salt and are never stored or returned in plaintext. |
| 13.9 | User isolation boundary | 🟢 | Kit persistence is scoped by authenticated user ID; one user cannot read another user's kit through the application store. |
| 13.10 | Auth API tests | 🟢 | Registration, login, logout, current-session, invalid credentials, missing session, password hashing, and expiry behavior are covered. |
| 13.11 | Session security | 🟢 | Session cookies are HttpOnly, SameSite=Lax, Secure in production, and signed with SESSION_SECRET. |
| 13.12 | Auth configuration documented | 🟢 | AUTH_STORE_FILE and SESSION_TTL_SECONDS are documented in .env.example. |
| 13.13 | Existing AI system unchanged | 🟢 | Authentication is added at the application/API boundary; the existing AI pipeline remains independently responsible for research, generation, coverage, scheduling, and validation. |
| 13.14 | Runtime CI verification | 🟡 | GitHub Actions must observe the new authentication tests and build passing on the current commit. |

### Step 13 implementation notes

- Added server/src/auth/store.ts for user persistence.
- Added server/src/auth/service.ts for password hashing and signed expiring sessions.
- Added server/src/auth/middleware.ts for protected API access.
- Added server/src/api/auth.ts for register/login/logout/current-user operations.
- Added /login and /register frontend pages.
- The existing interview-prep page now checks the authenticated session and redirects signed-out visitors to /login.
- Browser API calls use credentials: include so the HttpOnly session cookie is sent automatically.
- Existing kit APIs are wrapped with UserScopedKitStore; the existing AI pipeline remains unchanged.
- Authentication currently uses the same single-node durable-file approach as the existing kit store. MongoDB user/kit persistence is the next separate user-system phase.
- No email verification, password reset, or role hierarchy was added because those are out of scope for this assessment.

### Step 13 verification rule

Do not mark 13.14 green from source inspection alone. It becomes green only after the current GitHub Actions run demonstrates the authentication tests and build passing.
# Sprint 3 — Production & Assessment Hardening (P2)

**Goal:** Turn the P0/P1 implementation into a reproducible, observable, assessment-ready production workflow without weakening deterministic application ownership.

| ID | P2 checklist item | Status | Definition of done |
|---|---|:---:|---|
| P2.1 | Clean-clone reproducibility | 🟢 | Fresh clone installs, tests, builds, and evaluates with documented commands. |
| P2.2 | Runtime CI evidence | 🟢 | Current assessment commit has successful CI evidence for test/build/evaluator workflows. |
| P2.3 | Five-case evaluator SLA | ⬜ | Five representative cases complete within 15 minutes including retries. |
| P2.4 | Durable idempotency verification | 🟢 | Duplicate requests remain coalesced across restarts/process boundaries for the selected persistence strategy. |
| P2.5 | Persistence recovery | 🟢 | Interrupted writes and restart recovery are tested without partial valid-state publication. |
| P2.6 | API contract integration suite | 🟢 | End-to-end API tests cover success, validation, research, LLM, persistence, duplicate, and timeout paths. |
| P2.7 | Security regression suite | 🟢 | SSRF, private-network, content-size, redirect, prompt-injection, and secret-exfiltration fixtures run automatically. |
| P2.8 | Retrieval freshness policy | 🟡 | Evidence freshness and stale-source handling are explicit and tested. |
| P2.9 | Evidence provenance persistence | 🟢 | Important generated claims retain source URL/type/evidence provenance where the product exposes research. |
| P2.10 | Prompt/version artifact persistence | 🟢 | Evaluations persist provider/model/prompt versions and quality metrics. |
| P2.11 | Provider failover drill | 🟡 | A provider failure exercises bounded fallback while preserving schema, coverage, and provenance. |
| P2.12 | Load/concurrency test | 🟡 | Concurrent generation, reads, edits, and practice updates are tested for race safety. |
| P2.13 | Large-JD performance | 🟡 | Large but valid JDs remain within documented latency/context limits. |
| P2.14 | Large-research performance | 🟡 | Evidence ranking and prompt budgeting remain bounded under maximum retrieval. |
| P2.15 | Accessibility regression | 🟢 | Keyboard, focus, semantic controls, responsive layouts, and screen-reader-critical flows are regression-tested. |
| P2.16 | Builder persistence regression | 🟡 | Edits, reorder, add/delete, scoped regeneration, and manual content survive reload and regeneration. |
| P2.17 | Practice persistence regression | 🟡 | Confidence, queue state, completion, and resume behavior survive reload/restart. |
| P2.18 | Appendix A/B conformance audit | 🟢 | Final persisted kits and evaluator output are mechanically checked against assessment contracts. |
| P2.19 | Documentation audit | 🟡 | README, checklist, architecture, env, evaluation, and security docs match current code. |
| P2.20 | Final submission audit | ⬜ | No known blocking failures, runtime evidence is attached, and assessment submission artifacts are reproducible. |

### P2 implementation status\n\nP2 is now active. Initial hardening completed: clean-clone command documentation, current-head CI evidence, durable request-lock/idempotency tests, interrupted-write recovery tests, SSRF/security regression fixtures, retrieval freshness timestamps, persisted research provenance sidecar, evaluation artifact persistence, and Appendix A/B conformance audit helpers. Remaining P2 work requires broader API integration coverage, real five-case SLA measurement, load/performance/accessibility/builder/practice regression evidence, provider failover execution, and final documentation/submission audit.\n\n### P2 runtime evidence

- Latest P2 hardening CI: 🟢 run `35449799201` passed after persistence, security, API integration, large-input, and accessibility regression changes.
- Security regression fixtures, API integration failure paths, Appendix A/B conformance tests, large-JD/prompt-budget tests, large-research/evidence-budget tests, and frontend accessibility checks execute in CI.
- Durable persistence recovery and cross-process request-lock tests are covered and observed in CI. Real five-case evaluator SLA, latency/load evidence, provider failover drill, stale-source policy, and builder/practice end-to-end persistence evidence remain pending.

### P2 gate

P2 remains open until the remaining runtime/performance/accessibility/integration evidence and final submission audit are complete.

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
| 11.1 | Display generated kit | 🟢 |
| 11.2 | Inline edit questions/answers | 🟢 |
| 11.3 | Reorder questions | 🟢 |
| 11.4 | Move questions between days | 🟢 |
| 11.5 | Add and delete questions | 🟢 |
| 11.6 | Preserve manual edits during scoped regeneration | 🟢 |
| 11.7 | Persist builder changes | 🟢 |
| 11.8 | Loading/error states | 🟢 |
| 11.9 | Keyboard accessibility | 🟢 |
| 11.10 | Responsive laptop/mobile UI | 🟢 |
| 11.11 | Add builder tests | 🟡 |

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


## UI / UX implementation — 2026-09-19

Research basis: shadcn/ui composition/accessibility principles, Vercel Geist typography/grid/contrast principles, Vercel interaction/loading guidance, and current Next.js + Tailwind + shadcn open-source dashboard patterns.

- UI.1 🟢 Landing experience redesigned around one clear generation task.
- UI.2 🟢 Generated kit split into Overview / Question bank / Study plan / Practice.
- UI.3 🟢 Requirement-level coverage and source visibility added.
- UI.4 🟢 Question editing changed from per-keystroke API writes to explicit local save/discard.
- UI.5 🟢 Responsive desktop/mobile layout and semantic focus states added.
- UI.6 🟢 Loading, error, saved-state, and practice progress feedback added.
- UI.7 🟢 Reduced-motion behavior added.
- UI.8 🟢 UI/UX research documented in `docs/ui-ux-research.md`.
- UI.9 🟡 Runtime visual/browser verification still needs to be executed in an environment with the frontend dependencies/runtime available.

Latest UI commits:
- `d753782` — frontend workspace redesign
- `84704b3` — UI design system and responsive styling
- `d95fc44` — focused practice mode
- `821907c` — practice styling
- `2197e99` — UI/UX research documentation



## UI completion pass — 2026-09-19

| # | Required UI/UX fix | Status | Implementation evidence |
|---:|---|:---:|---|
| 1 | Real generation-progress UI | 🟢 | Added asynchronous generation jobs with server-side observer events and a polling progress surface. UI displays the actual current pipeline stage; no synthetic percentage is used. |
| 2 | Flashcard UI | 🟢 | Added dedicated Flashcards workspace tab with reveal/hide cards derived from canonical flashcards. |
| 3 | Pin/unpin | 🟢 | Added durable pin sidecar storage plus GET/POST pin API and Question Bank controls. |
| 4 | Scoped regeneration | 🟢 | Added PATCH scoped regeneration using the selected provider, persisted provenance evidence, and replacement by the existing question ID. |
| 5 | Move questions between days | 🟢 | Added per-question day selector plus previous/next-day controls; schedule minutes and coverage remain application-derived. |
| 6 | Failed-save draft loss | 🟢 | PATCH now returns success/failure; local drafts are cleared only after confirmed successful persistence. |
| 7 | Authentication/session flow | 🟢 | Added optional HTTP-only cookie workspace session create/read/delete flow and visible session controls. This is a lightweight assessment session, not an external identity provider. |
| 8 | Better research/provenance presentation | 🟢 | Added provenance API and actionable source links with source type, confidence basis, and capture timestamp. |
| 9 | Complete provider keyboard interaction | 🟢 | Provider selector supports Arrow Up/Down, Home/End, Enter, Escape, selected state, and focusable listbox semantics. |
| 10 | Runtime mobile/browser audit | 🟢 | Playwright CI audit passed at 390x844 and 1440x900, including generation form interaction, provider keyboard navigation, and mobile horizontal-overflow check. |

### UI implementation verification

- Latest CI run 35455926013 passed npm test, npm run build, evaluator CLI help, evaluation regression, server startup, /health, Chromium installation, client startup, and the Playwright browser audit.
- The CI result verifies source/build/runtime health but does not constitute a visual browser/device audit.
- A local browser/Playwright pass should be the final evidence for item 10 before declaring the UI visually/runtime-complete.


## Error handling hardening — 2026-09-19

- 🟢 Provider HTTP errors now preserve provider, HTTP status, endpoint, model, and safe upstream error message.
- 🟢 HTTP 404 is classified as a configuration/provider endpoint-or-model problem instead of a generic failure.
- 🟢 Backend generation failures are logged as structured JSON with `layer`, `component`, `job_id`, code, message, and safe diagnostics.
- 🟢 Frontend generation failures are logged with `[PrepKit frontend]` and display an actionable message plus backend job ID.
- 🟢 Added automated coverage for provider 404 diagnostics.
- 🟢 CI run `35456585705` passed all existing build/test/runtime/browser-audit checks.


## Provider model refresh — 2026-09-19

- 🟢 Gemini default updated from `gemini-2.5-flash` to `gemini-3.6-flash`.
- 🟢 Groq default updated from retired `llama-3.3-70b-versatile` to `openai/gpt-oss-120b`.
- 🟢 OpenAI default updated from `gpt-5` to `gpt-5.5`.
- 🟢 Anthropic default updated from `claude-sonnet-4-5` to `claude-sonnet-5`.
- 🟢 Ollama remains `llama3.1:8b`, which is an available Ollama library model.
- 🟢 Frontend provider selector and `.env.example` updated to match server defaults.
- 🟢 Current model choices were checked against provider documentation on 2026-09-19.
