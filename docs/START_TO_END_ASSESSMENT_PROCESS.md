# Trao AI Interview Prep Kit — Start-to-End Implementation Process

This document is the execution plan for completing the repository against the Trao Full-Stack Engineering Assessment (FS-AI-INTERVIEW-01).

> Rule: implement and verify one stage at a time. Do not treat the application as one large LLM prompt. Deterministic coverage checking and schedule allocation stay in application code.

## 0. Definition of Done

Before submission, the repository must satisfy all of these:

- Publicly accessible frontend and backend.
- Secure registration, login, logout, session handling, and per-user kit ownership.
- Single-role kit creation from pasted JD + company URL + requested days.
- Multi-role batch input.
- Company-site crawling with ranked links; hiring-process discovery cannot depend on hard-coded paths.
- Public interview-process research.
- Source failures are recorded/skipped without unnecessarily failing the whole run.
- Rate limiting, retry/backoff, timeouts, robots.txt/site-term awareness.
- Sequential research/generation pipeline.
- Separate question generation by requirement/category.
- Deterministic coverage check.
- Second pass generates missing questions and rechecks coverage.
- Exact Appendix A field names and required structure.
- Inline editing, reordering, category movement, add/delete.
- Section regeneration without clobbering edits/user-created/pinned content.
- Flashcard practice with confidence and coverage tracking.
- Exactly N schedule days, integer minutes, all must-have requirements represented, higher-priority/harder material earlier.
- Exact mandatory CLI:
  npm run evaluate -- --input <cases.json> --output <kits.json>
- CLI uses the same pipeline as the app.
- Batch continues after individual case failures.
- Five cases complete within 15 minutes including retries.
- Edge cases and malformed model output handled honestly.
- External URL security controls.
- Automated tests for structure, coverage, scheduling, regeneration, auth, batch, retrieval and failure paths.
- README explains setup, architecture, retrieval, sequencing, state model, schedule, trade-offs and limitations.
- 3–4 minute walkthrough video prepared.

---

# Phase 1 — Repository and Architecture Foundation

## 1.1 Repository baseline

Create and maintain:

client/
server/
shared/
evaluation/
tests/
docs/

Root files:

- package.json
- .env.example
- .gitignore
- README.md

## 1.2 Branching and commits

Use meaningful commits that show development progress.

Suggested sequence:

1. chore: initialize project foundation
2. feat: add exact Appendix A and B contracts
3. feat: add authentication
4. feat: add secure URL retrieval
5. feat: add company crawler and source ranking
6. feat: add JD requirement extraction
7. feat: add sequential research pipeline
8. feat: add question generation
9. feat: add deterministic coverage and second pass
10. feat: add deterministic schedule allocation
11. feat: add kit persistence and builder APIs
12. feat: add frontend kit builder
13. feat: add practice mode
14. feat: add batch evaluator
15. test: add assessment edge-case coverage
16. feat: add deployment configuration
17. docs: complete assessment README and walkthrough notes

Do not squash away useful development history before submission.

---

# Phase 2 — Exact Assessment Data Contracts

Appendix A is exact. Do not replace its structure with a different public output shape.

## 2.1 Canonical Kit

The externally generated kit must contain:

source:
- company
- company_url
- role
- location
- jd_chars
- researched_at
- pages_used

company_brief:
- summary
- what_they_do
- sources

role:
- title
- seniority
- responsibilities
- requirements

requirement:
- id
- text
- kind: technical | behavioural | domain
- priority: must | nice

questions:
- id
- requirement_ids
- category: technical | behavioural | system-design | company-fit
- prompt
- answer_outline
- difficulty: 1 | 2 | 3

flashcards:
- id
- front
- back
- requirement_ids

schedule:
- days_available
- days
- day
- focus
- question_ids
- minutes

coverage:
- uncovered_requirement_ids
- passes

Every requirement ID must be stable within the kit.
Every question's requirement_ids must point to real requirements.
Every schedule question_ids entry must point to an existing question.
difficulty is 1–3.
minutes is an integer.

## 2.2 Internal state

Internal persistence may extend the public structure with metadata such as:

- origin: generated | user_added
- is_edited
- is_pinned
- version
- created_at
- updated_at

These fields exist to solve regeneration safely. The public Appendix A serializer must still emit the required external structure.

## 2.3 Batch contract

Input:

[
  {
    "id": "case-01",
    "jd": "...",
    "company_url": "http://localhost:8099/acme/",
    "days": 5
  }
]

Output:

{
  "version": "1.0",
  "generated_at": "...",
  "kits": [
    {
      "id": "case-01",
      "status": "ok",
      "kit": {},
      "error": null
    }
  ]
}

Failed cases must contain:

- status: failed
- kit: null
- error.code
- error.message

A partially researched but valid kit is status=ok with honest gaps.

---

# Phase 3 — Authentication and Ownership

## 3.1 User flow

Implement:

Register -> Login -> Session -> Protected application -> Logout

Minimal scope only:

- registration
- login
- logout
- session validation

Do NOT build:

- email verification
- password reset
- role hierarchy

## 3.2 Security rules

- Hash passwords securely.
- Use secure session handling.
- Protect frontend routes.
- Protect backend endpoints.
- Reject expired/invalid sessions.
- Every kit query/update must be scoped to authenticated user ID.
- Never trust a client-provided owner ID.

## 3.3 Tests

Test:

- registration
- duplicate registration
- valid login
- invalid login
- logout
- expired/invalid session
- unauthorized endpoint
- user A cannot read user B's kit
- user A cannot modify user B's kit

---

# Phase 4 — Input and Validation

## 4.1 Create-kit form

Required inputs:

- job description textarea
- company website URL
- days available

Validate:

- JD is a string.
- URL is valid HTTP/HTTPS.
- days is an integer from 1 through 60.

Do not fetch the JD from a job board.

## 4.2 Multi-role input

Support file input containing multiple:

- id
- jd
- company_url
- days

The batch interface must eventually feed the same pipeline used by the application.

## 4.3 Duplicate submissions

Define deterministic duplicate behavior.

Recommended:

- identify duplicate by normalized JD + normalized company URL + days/user context;
- reuse an existing compatible kit or explicitly report duplicate status;
- do not accidentally create concurrent duplicate generation jobs.

Document the choice.

---

# Phase 5 — Secure External Retrieval

This is a security-critical subsystem because company URLs and fetched pages are untrusted.

## 5.1 URL validation

Before fetching:

- only allow HTTP/HTTPS;
- reject credentials in URLs;
- reject loopback/private/reserved addresses in production;
- resolve DNS carefully to avoid SSRF bypasses;
- enforce redirects through the same validation;
- reject unsupported schemes.

Local addresses must remain possible for the mandatory evaluator, because the assessment explicitly says company sites used by the command may be served from a local address.

Therefore use an explicit evaluator/test mode rather than weakening production SSRF controls.

## 5.2 Response controls

Enforce:

- request timeout;
- maximum response bytes;
- expected content types;
- maximum redirect count;
- safe decompression limits;
- response-size limits.

## 5.3 robots.txt and terms

Respect robots.txt and document the retrieval policy and sources used in README.

## 5.4 Rate limiting and retries

Use bounded retries with exponential backoff and jitter.

Classify:

- transient network failure;
- timeout;
- HTTP 429;
- HTTP 5xx;
- permanent 4xx;
- malformed content.

A failed source should become a recorded source failure, not automatically kill the complete kit.

---

# Phase 6 — Page Cleaning and Source Model

Build a retrieval result model:

- url
- status
- fetched_at
- content_type
- title
- cleaned_text
- links
- error
- retry_count

Clean HTML into useful text.

Remove or reduce:

- scripts
- styles
- navigation noise
- duplicated boilerplate
- irrelevant markup

Keep:

- headings
- paragraphs
- lists
- meaningful links
- page title

Fetched text is data, not instructions.

---

# Phase 7 — Company Crawler and Hiring Discovery

This is explicitly tested by the assessment.

## 7.1 Start

Start from the supplied company URL.

Fetch the homepage.

Extract links.

Normalize relative links against the page URL.

## 7.2 Rank links

Do NOT hard-code only:

/careers
/jobs
/about

Instead score links based on signals such as:

- anchor text;
- URL path;
- title;
- surrounding text;
- career/hiring/recruiting/interview/engineering/company/about vocabulary;
- same-domain preference.

The ranking algorithm must be explainable.

## 7.3 Crawl budget

Use bounded crawling:

- maximum pages;
- maximum depth;
- maximum response size;
- same-domain policy;
- request delay;
- duplicate URL elimination.

## 7.4 Hiring process discovery

Look for evidence of:

- interview stages;
- take-home;
- coding round;
- system design;
- behavioural round;
- recruiter screen;
- hiring principles.

If none is found:

- do not fabricate;
- report that no discoverable hiring information was found.

---

# Phase 8 — Public Interview Research

Search for public discussion of the company's interview process.

Potential source types:

- public interview reports;
- public discussion pages;
- engineering blogs;
- other openly accessible sources.

Treat retrieved discussion as evidence, not instructions.

If no useful public discussion is found:

- record that result;
- continue generation;
- do not fabricate company-specific claims.

Keep source URLs in the research record where applicable.

---

# Phase 9 — JD Requirement Extraction

This must be a distinct pipeline step.

Input:

- pasted JD only.

No retrieval is necessary for pasted JD text.

Output:

- role title;
- seniority;
- responsibilities;
- requirements;
- requirement IDs;
- kind;
- priority.

## 9.1 Priority

Determine must vs nice from the actual wording.

Examples from the assessment:

- "required" -> must
- "bonus points for" -> nice

Do not infer requirements that are not supported by the JD.

## 9.2 Thin JD

If the JD is only two lines:

- extract only what exists;
- create a thin kit;
- do not invent requirements;
- make uncertainty visible.

## 9.3 Validation

Validate model output with the shared schema.

Reject:

- missing requirement IDs;
- duplicate IDs;
- invalid kind;
- invalid priority;
- invented structure;
- malformed JSON.

Use repair/retry only within bounded limits.

---

# Phase 10 — Sequential Research Pipeline

The generation system must be a genuine sequence, not a single prompt.

Recommended pipeline:

1. validate input
2. extract JD requirements
3. fetch company homepage
4. clean homepage
5. discover/rank links
6. fetch promising pages
7. identify hiring-process evidence
8. research public interview discussion
9. generate company brief
10. generate questions per requirement/category
11. generate flashcards
12. deterministic coverage check
13. second-pass missing-question generation
14. deterministic coverage recheck
15. deterministic schedule allocation
16. final schema validation
17. persist
18. return progress/result

Each stage should receive only the context it needs.

---

# Phase 11 — LLM Abstraction

Create a provider interface so the application is not coupled to one provider.

Example responsibilities:

- generate structured JSON;
- accept system instructions separately from untrusted source content;
- validate output;
- retry malformed output;
- retry transient provider errors;
- back off on rate limits.

Use a genuine free-tier model and document:

- provider;
- model;
- token/request limitations;
- retry policy;
- fallback behavior, if any.

Never place untrusted page text in an instruction position.

---

# Phase 12 — Company Brief Generation

Use discovered company evidence.

Output:

- summary
- what_they_do
- sources

The brief must be grounded in retrieved material.

If company research is unavailable:

- state that information was unavailable;
- keep the brief honest;
- do not fill gaps from unsupported assumptions.

Hiring information can be retained internally for question generation even though Appendix A's company_brief fields are fixed.

---

# Phase 13 — Question Generation

Generate questions deliberately by requirement and category.

Do not generate the whole question bank from one generic call.

Examples:

Technical requirement -> technical questions.

Behavioural requirement -> behavioural questions.

Domain requirement -> relevant technical/domain questions.

Company evidence -> company-fit questions.

Interview-process evidence -> questions appropriate to discovered stages.

Each question must contain:

- stable ID;
- requirement_ids;
- category;
- prompt;
- answer_outline;
- difficulty 1–3.

Every generated question must reference at least one real requirement.

---

# Phase 14 — Deterministic Coverage Check

This MUST be application code.

Algorithm:

1. collect all requirement IDs;
2. collect every question.requirement_ids;
3. calculate referenced IDs;
4. compute uncovered requirement IDs;
5. distinguish must vs nice.

Do not ask the LLM whether coverage is complete.

The result goes into:

coverage.uncovered_requirement_ids

---

# Phase 15 — Second Pass

After first-pass questions:

1. run deterministic coverage check;
2. find uncovered requirements;
3. if must-have requirements are uncovered, generate targeted missing questions;
4. validate those questions;
5. merge them without deleting valid existing questions;
6. run coverage again.

Choose a bounded pass count, e.g. two coverage passes, and document why.

Shipping a kit with uncovered must-have requirements is a failure.

If a must-have remains uncovered after the bounded process:

- report it clearly;
- do not falsely claim complete coverage.

---

# Phase 16 — Flashcards

Generate flashcards from the requirement/question knowledge.

Each card:

- id
- front
- back
- requirement_ids

Flashcards must remain linked to requirements where applicable.

---

# Phase 17 — Deterministic Schedule

The model must NOT allocate the schedule.

Input:

- requested days;
- requirements;
- questions;
- difficulty;
- priority.

Rules:

- exactly requested number of days;
- integer minutes;
- every must-have requirement represented somewhere;
- harder/higher-priority material earlier.

Handle:

- 1 day;
- normal values;
- 60 days.

For many days and little content, empty-content days may use a valid focus and 0 minutes if the final schema permits it; document the policy.

For 1 day, all required preparation material must fit into day 1.

Test schedule allocation independently.

---

# Phase 18 — Persistence

MongoDB model should preserve enough information to:

- reopen a kit;
- continue editing;
- practice flashcards;
- regenerate a section;
- preserve user state.

Suggested entities:

User
Kit
PracticeRecord

Kit should include:

- owner_id
- source/input data
- canonical Appendix A kit
- internal item metadata
- generation status
- generation progress
- source/research records
- timestamps
- version

---

# Phase 19 — Generation Job State

Generation can take around 90 seconds and can fail halfway.

Represent states such as:

queued
running
completed
failed

Progress should identify stages, for example:

- Extracting requirements
- Researching company
- Finding hiring information
- Researching interviews
- Generating questions
- Checking coverage
- Filling coverage gaps
- Building schedule
- Validating kit
- Saving kit

Handle duplicate triggers with idempotency/concurrency protection.

---

# Phase 20 — Builder

The builder is a major human-review area.

Must support:

- inline edit question;
- inline edit answer outline;
- inline edit flashcard;
- inline edit company brief;
- reorder questions;
- move question between categories;
- add question;
- delete question;
- add flashcard;
- delete flashcard;
- regenerate company brief;
- regenerate one question category;
- regenerate schedule.

Edits should feel immediate. Do not save every keystroke through a blocking network request.

---

# Phase 21 — Regeneration State Model

This is one of the most important design decisions.

For generated content:

origin=generated

For user-created:

origin=user_added

When user edits:

is_edited=true

When user pins:

is_pinned=true

Regeneration of one category must:

1. load current kit;
2. identify the targeted section;
3. preserve user_added items;
4. preserve edited items;
5. preserve pinned items;
6. replace only generated + unedited + unpinned content;
7. reconcile stable IDs;
8. rerun validation;
9. rerun coverage;
10. update schedule if necessary without destroying unrelated user edits.

Test this with explicit before/after fixtures.

---

# Phase 22 — Practice Mode

UI:

one flashcard at a time.

Flow:

Show front -> reveal answer -> confidence -> covered/uncovered -> next

Store confidence per user/card.

Simple valid strategy:

- confidence 1 = low
- confidence 2 = medium
- confidence 3 = high

Next session sorts primarily by lowest confidence, then by least recently reviewed.

Document the chosen strategy.

Show:

- covered count;
- uncovered count;
- current card;
- confidence state.

---

# Phase 23 — Frontend UX

Next.js + Tailwind.

Required states:

- empty;
- loading;
- progress;
- partial failure;
- complete;
- validation failure;
- network failure.

Responsive:

- laptop;
- phone.

Keyboard:

- logical tab order;
- accessible controls;
- visible focus;
- keyboard-friendly editing/reordering where practical.

Use reusable components and sensible state boundaries.

---

# Phase 24 — Backend API Separation

Separate concerns:

auth/
retrieval/
crawler/
research/
extraction/
generation/
coverage/
schedule/
kits/
practice/
evaluation/

Do not put the entire workflow into one Express route.

Use service boundaries so the evaluator can call the same pipeline directly.

---

# Phase 25 — Mandatory Batch Evaluator

Implement exactly:

npm run evaluate -- --input <cases.json> --output <kits.json>

Requirements:

- read JSON array;
- validate each case;
- call the SAME pipeline used by the application;
- use case.days;
- write Appendix B shape;
- continue after failed cases;
- preserve input IDs;
- record structured failures;
- support local company URLs;
- follow relative links;
- work from a clean clone;
- environment variables documented in .env.example.

Never implement a second simplified evaluator pipeline.

---

# Phase 26 — Failure Matrix

Test each case:

| Case | Expected behavior |
|---|---|
| invalid URL | structured failure or honest retrieval failure |
| 404 | source failure; do not fabricate company research |
| timeout | retry/backoff, then record failure |
| no hiring page | valid kit with honest missing research |
| thin JD | thin honest kit |
| no public interview discussion | valid kit with no fabricated claims |
| malformed model JSON | validate/retry/repair within bounds |
| incomplete model output | reject/retry; never persist invalid kit |
| provider 429 | backoff/retry |
| transient 5xx | backoff/retry |
| duplicate submission | deterministic duplicate handling |
| 1 day | exactly one schedule day |
| 60 days | exactly 60 schedule days |

---

# Phase 27 — Automated Tests

Minimum high-value tests:

## Structure

- Appendix A required fields;
- exact field names;
- valid difficulty;
- integer minutes;
- stable IDs;
- schedule question IDs point to questions.

## Coverage

- covered requirement;
- uncovered nice requirement;
- uncovered must requirement;
- second-pass closure;
- invalid requirement reference.

## Schedule

- exactly N days;
- 1 day;
- 60 days;
- must-have requirements represented;
- high-priority material earlier;
- integer minutes.

## Regeneration

- edited question survives;
- pinned question survives;
- user-added question survives;
- unrelated category survives;
- schedule regeneration preserves content.

## Retrieval

- relative links;
- ranking;
- timeout;
- 404;
- 429;
- retry;
- robots.txt;
- size limit;
- content type;
- SSRF/private-address protection.

## Authentication

- protected route;
- ownership isolation;
- logout;
- invalid session.

## Batch

- multiple cases;
- one failure does not abort others;
- exact output shape;
- same pipeline as application.

---

# Phase 28 — Observability

For every generation run record enough information to debug:

- run ID;
- kit ID;
- current stage;
- elapsed time;
- source URLs attempted;
- successful sources;
- failed sources;
- retry counts;
- LLM calls;
- validation failures;
- coverage before second pass;
- coverage after second pass;
- final status.

Do not log:

- passwords;
- session secrets;
- API keys;
- unnecessary sensitive user data.

---

# Phase 29 — Deployment

Deploy both:

- frontend;
- backend.

Make both publicly reachable.

Securely configure environment variables.

Recommended deployment approach:

Frontend -> Next.js hosting
Backend -> Node/Express hosting
Database -> MongoDB free tier

Document:

- local setup;
- production setup;
- environment variables;
- URLs;
- CORS;
- database configuration.

Verify from a clean environment.

---

# Phase 30 — README Completion

README must include:

1. Project overview.
2. Tech stack and justification.
3. Local setup.
4. Deployment setup.
5. Exact batch command.
6. LLM provider/model.
7. High-level architecture.
8. Retrieval approach.
9. Sources used.
10. Research/generation sequence.
11. Coverage and second pass.
12. Generated/edited/pinned state model.
13. Schedule allocation algorithm.
14. Creative feature, if any.
15. Key design decisions.
16. Trade-offs.
17. Known limitations.
18. Security decisions.
19. Edge-case handling.
20. Testing instructions.

---

# Phase 31 — Optional Creative Feature

Only add this after all mandatory requirements work.

A practical choice:

## Weak Spots Report

Use deterministic data already produced by the app:

- must-have requirements;
- question coverage;
- practice confidence;
- uncovered/low-confidence areas.

Show:

- requirements with weak coverage;
- low-confidence flashcards;
- recommended preparation focus.

Why:

It directly helps the candidate decide what to study next and uses existing application data instead of adding unrelated scope.

---

# Phase 32 — Final End-to-End Verification

Run:

npm install

npm test

npm run build

npm run evaluate -- --input evaluation/cases.json --output evaluation/kits.json

Then verify:

- clean clone works;
- no hard-coded local paths;
- .env.example is complete;
- batch command works;
- five-case run is within 15 minutes;
- failed cases do not abort the batch;
- Appendix A is exact;
- all must-have requirements are covered;
- schedule day count is exact;
- regeneration preserves edits;
- practice works;
- mobile UI works;
- keyboard navigation works;
- deployment works.

---

# Phase 33 — Walkthrough Video Checklist

3–4 minutes.

Show:

1. Create kit from pasted JD + company URL.
2. Generation progress.
3. Research sources.
4. Generated company brief.
5. Role breakdown.
6. Categorized questions.
7. Coverage gap detected.
8. Second pass fills the gap.
9. Edit a question.
10. Reorder/move a question.
11. Regenerate its category.
12. Demonstrate that the manual edit survived.
13. Practice a flashcard.
14. Show confidence/coverage.
15. Show schedule.
16. Show creative feature if implemented.
17. State one design decision you would defend.

---

# Phase 34 — Final Submission Checklist

## Repository

- [ ] Public/access granted.
- [ ] Complete source.
- [ ] Meaningful commit history.
- [ ] README complete.
- [ ] .env.example complete.
- [ ] Mandatory evaluator works from clean clone.

## Automated 55 points

- [ ] Requirement extraction.
- [ ] No invented requirements.
- [ ] Correct must/nice classification.
- [ ] Requirement coverage.
- [ ] Exact schedule days.
- [ ] Schedule allocation.
- [ ] Company crawl.
- [ ] Hiring discovery.
- [ ] Public interview research.
- [ ] Separate generation steps.
- [ ] Deterministic coverage.
- [ ] Second pass.
- [ ] Robust failures.
- [ ] Structure validation.
- [ ] Tests.

## Human 45 points

- [ ] Builder editing.
- [ ] Reordering.
- [ ] Regeneration preservation.
- [ ] Loading state.
- [ ] Empty state.
- [ ] Error state.
- [ ] Responsive UI.
- [ ] Keyboard access.
- [ ] Practice mode.
- [ ] Creative feature.
- [ ] Architecture explanation.

## Deployment

- [ ] Frontend public URL.
- [ ] Backend reachable.
- [ ] Database connected.
- [ ] Environment variables secure.
- [ ] Production URL tested.

## Submission

- [ ] GitHub repository.
- [ ] Deployment link.
- [ ] 3–4 minute walkthrough.
- [ ] README.

---

# Recommended Build Order for This Repository

Do not jump directly to UI polish.

Execute in this exact order:

1. Exact Appendix A/B schemas
2. Tests for schemas
3. Retrieval/security subsystem
4. JD extraction
5. Company crawler
6. Public interview research
7. LLM abstraction
8. Company brief generation
9. Question generation
10. Deterministic coverage
11. Second pass
12. Deterministic schedule
13. Full pipeline orchestration
14. MongoDB persistence
15. Authentication/ownership
16. Batch evaluator
17. Backend API
18. Next.js UI
19. Builder editing/reordering
20. Regeneration preservation
21. Practice mode
22. Progress/error UX
23. Optional weak-spots feature
24. Full automated test suite
25. Deployment
26. Clean-clone evaluation
27. README finalization
28. Walkthrough video

The critical engineering principle is:

JD extraction -> evidence retrieval -> targeted generation -> deterministic coverage -> targeted second pass -> deterministic schedule -> validation -> persistence

Never:

JD + company URL -> one giant LLM prompt -> final JSON
