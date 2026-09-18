# Trao AI Interview Prep Kit — Start-to-End Implementation Process

**Assessment:** Trao Full-Stack Engineering Assessment — The AI Interview Prep Kit  
**Assessment ID:** FS-AI-INTERVIEW-01

This is the master execution and verification plan for implementing this repository against the supplied assessment PDF. It expands the stated requirements into implementation tasks and a broad test matrix so normal, sparse, malformed, unavailable, duplicate, concurrent, adversarial, and batch cases are considered before submission.

> **Source boundary:** Mandatory requirements are derived from the supplied assessment PDF. Additional implementation mechanics and defensive test cases below are engineering decisions for making those requirements robust; they are not additional stated scoring requirements.

## 0. Definition of Done

- [ ] Public frontend and backend.
- [ ] Secure registration, login, logout, sessions, and per-user ownership.
- [ ] Single-role JD + company URL + days flow.
- [ ] Multi-role batch input.
- [ ] Visible generation progress and failure states.
- [ ] Company brief, role breakdown, questions, flashcards, schedule.
- [ ] Edit, reorder, move, add, delete.
- [ ] Scoped regeneration without clobbering user work.
- [ ] Flashcard practice and confidence/coverage tracking.
- [ ] Company crawling and dynamically discovered hiring information.
- [ ] Public interview-process research.
- [ ] Rate limiting, retry/backoff, timeout, robots.txt/site-term awareness.
- [ ] Sequential research/generation.
- [ ] Deterministic coverage and schedule.
- [ ] Mandatory second pass for coverage gaps.
- [ ] Exact Appendix A/B contracts.
- [ ] Batch command works from clean clone.
- [ ] Batch continues after case failures.
- [ ] Five cases complete within 15 minutes including retries.
- [ ] Edge cases and malformed model output handled honestly.
- [ ] External URL security controls.
- [ ] Automated tests.
- [ ] README, deployment, walkthrough.

---

# 1. Repository Foundation

## 1.1 Structure

```
client/
server/
shared/
evaluation/
tests/
docs/
```

Root:

- `package.json`
- `.env.example`
- `.gitignore`
- `README.md`

## 1.2 Development history

Suggested meaningful commits:

1. `chore: initialize project foundation`
2. `feat: add exact Appendix A and B contracts`
3. `test: add structure validation tests`
4. `feat: add authentication`
5. `feat: add secure URL retrieval`
6. `feat: add page cleaning and crawler`
7. `feat: add JD requirement extraction`
8. `feat: add sequential research pipeline`
9. `feat: add question generation`
10. `feat: add deterministic coverage and second pass`
11. `feat: add deterministic schedule allocation`
12. `feat: add persistence`
13. `feat: add batch evaluator`
14. `feat: add backend API`
15. `feat: add frontend builder`
16. `feat: add regeneration preservation`
17. `feat: add practice mode`
18. `test: cover assessment edge cases`
19. `feat: add deployment configuration`
20. `docs: complete assessment documentation`

Do not destroy useful development history before submission.

---

# 2. Exact Appendix A Contract

Appendix A is explicitly exact. Required names must remain unchanged.

Required top-level structure:

```json
{
  "source": {
    "company": "",
    "company_url": "",
    "role": "",
    "location": "",
    "jd_chars": 0,
    "researched_at": "",
    "pages_used": []
  },
  "company_brief": {
    "summary": "",
    "what_they_do": "",
    "sources": []
  },
  "role": {
    "title": "",
    "seniority": "",
    "responsibilities": [],
    "requirements": [
      {
        "id": "r1",
        "text": "",
        "kind": "technical",
        "priority": "must"
      }
    ]
  },
  "questions": [
    {
      "id": "q1",
      "requirement_ids": ["r1"],
      "category": "technical",
      "prompt": "",
      "answer_outline": "",
      "difficulty": 2
    }
  ],
  "flashcards": [
    {
      "id": "f1",
      "front": "",
      "back": "",
      "requirement_ids": ["r1"]
    }
  ],
  "schedule": {
    "days_available": 5,
    "days": [
      {
        "day": 1,
        "focus": "",
        "question_ids": ["q1"],
        "minutes": 60
      }
    ]
  },
  "coverage": {
    "uncovered_requirement_ids": [],
    "passes": 2
  }
}
```

Rules:

- requirement `kind`: `technical | behavioural | domain`;
- requirement `priority`: `must | nice`;
- question `category`: `technical | behavioural | system-design | company-fit`;
- difficulty: 1–3;
- minutes: integer;
- stable IDs within a kit;
- question requirement IDs must exist;
- schedule question IDs must exist.

Internal persistence may add metadata such as `origin`, `is_edited`, `is_pinned`, `version`, and timestamps, but the external Appendix A serializer must preserve the required structure.

---

# 3. Appendix A Structure Test Matrix

Test valid:

- minimum kit;
- one requirement;
- multiple requirements;
- technical/behavioural/domain requirements;
- must/nice priorities;
- multiple question categories;
- difficulties 1, 2, 3;
- empty arrays where genuinely applicable;
- multiple schedule days.

Reject:

- missing required top-level fields;
- renamed fields;
- wrong types;
- invalid requirement kind;
- invalid priority;
- invalid question category;
- difficulty outside 1–3;
- non-integer minutes;
- duplicate IDs;
- question referencing nonexistent requirement;
- schedule referencing nonexistent question.

Also test serializer round-tripping internal metadata into valid Appendix A.

---

# 4. Appendix B Batch Contract

Mandatory command:

```bash
npm run evaluate -- --input <cases.json> --output <kits.json>
```

Input:

```json
[
  {
    "id": "case-01",
    "jd": "Senior Backend Engineer...",
    "company_url": "http://localhost:8099/acme/",
    "days": 5
  }
]
```

Output:

```json
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
```

Failure:

```json
{
  "id": "case-04",
  "status": "failed",
  "kit": null,
  "error": {
    "code": "COMPANY_UNREACHABLE",
    "message": "..."
  }
}
```

Test:

- one case;
- five cases;
- mixed valid/invalid;
- failure in first/middle/last case;
- all cases failed;
- duplicate IDs;
- duplicate cases;
- mixed days;
- malformed input;
- local company server;
- relative links;
- output validity.

A partially researched but valid kit is `ok`; `failed` is reserved for inability to produce a kit.

---

# 5. Authentication and Ownership

Implement:

Register -> Login -> Session -> Protected application -> Logout

Keep scope minimal. Do not build email verification, password reset, or role hierarchy.

Security tests:

- registration;
- duplicate registration;
- valid login;
- wrong password;
- unknown account;
- invalid session;
- expired session;
- logout;
- protected page;
- protected API;
- user A cannot read B's kit;
- user A cannot modify/delete/regenerate B's kit;
- practice records are owner-scoped.

Never trust client-provided owner IDs.

---

# 6. Input Validation

## Single-role cases

Test:

- normal JD;
- empty JD;
- whitespace JD;
- two-line JD;
- very long JD;
- Unicode;
- duplicated JD text;
- no explicit requirements;
- invalid URL;
- HTTP;
- HTTPS;
- unsupported protocol;
- URL with credentials;
- days 1;
- days 60;
- days 0;
- days 61;
- negative;
- fractional;
- string;
- missing fields;
- unexpected fields.

The JD is pasted into the interface; do not fetch it from a job board.

## Multi-role cases

Test:

- one valid case;
- multiple valid cases;
- mixed valid/invalid cases;
- empty file;
- malformed JSON;
- malformed object;
- missing ID;
- duplicate ID;
- missing JD;
- missing URL;
- invalid URL;
- invalid days;
- huge batch.

---

# 7. Secure External Retrieval

Company pages are untrusted.

## URL validation

Test:

- HTTP/HTTPS;
- malformed URL;
- unsupported scheme;
- credentials in URL;
- localhost;
- loopback;
- private IP;
- reserved IP;
- DNS resolving to private address;
- public -> private redirect;
- redirect loop;
- excessive redirects.

The assessment permits local company URLs for the evaluator. Therefore production SSRF protection should remain strict while evaluator/test mode explicitly permits controlled local fixtures.

## Response controls

Test:

- valid HTML;
- unsupported content type;
- empty content;
- oversized content;
- timeout;
- connection failure;
- malformed encoding;
- 404;
- 403;
- 429;
- 500/502/503.

Enforce timeout, size, content-type, redirect and decompression limits.

---

# 8. robots.txt, Rate Limits, Retries

Respect robots.txt and site terms and document the retrieval policy.

Test:

- allowed page;
- disallowed page;
- missing robots.txt;
- malformed robots.txt;
- duplicate URL;
- transient failure then success;
- repeated failure;
- 429;
- 5xx;
- timeout;
- retry exhaustion.

Use bounded exponential backoff/jitter.

The assessment warns that free LLM tiers can limit tokens as well as requests, so provider rate-limit handling must also be tested.

---

# 9. Page Cleaning

Retrieval result should retain:

- URL;
- status;
- fetched timestamp;
- content type;
- title;
- cleaned text;
- links;
- retry count;
- error if applicable.

Clean:

- scripts;
- styles;
- excessive navigation;
- duplicated boilerplate;
- irrelevant markup.

Preserve:

- headings;
- paragraphs;
- lists;
- meaningful links;
- title.

Test:

- normal HTML;
- malformed HTML;
- JS-heavy HTML;
- navigation-heavy site;
- empty page;
- huge page;
- duplicate boilerplate;
- unsupported content.

---

# 10. Company Crawler and Hiring Discovery

Start at supplied company URL.

Fetch homepage -> extract links -> normalize relative URLs -> rank -> fetch promising pages.

## Link cases

Test:

- absolute link;
- relative link;
- root-relative link;
- query URL;
- fragment;
- duplicate URL;
- external link;
- same-domain link;
- nested path;
- deep hiring path;
- hiring content in engineering blog;
- hiring handbook;
- careers page under unexpected path;
- no hiring page.

Do NOT rely on a fixed list such as only `/careers`, `/jobs`, `/about`.

Rank links using explainable signals:

- anchor text;
- URL path;
- title;
- surrounding text;
- hiring/career/recruiting/interview/engineering/company/about vocabulary;
- same-domain preference.

Bound:

- pages;
- depth;
- bytes;
- requests;
- duplicate URLs.

Hiring evidence may include:

- recruiter screen;
- coding;
- take-home;
- system design;
- behavioural;
- interview stages;
- hiring principles.

If nothing is found, say so. Never fabricate.

---

# 11. Public Interview Research

Search public discussion of the company's interview process.

Cases:

- rich public discussion;
- multiple sources;
- no discussion;
- inaccessible source;
- irrelevant source;
- stale discussion;
- contradictory reports;
- malicious/instruction-like text.

Treat discussion as evidence rather than instructions. Preserve source URLs when useful. Do not turn unsupported reports into company facts.

---

# 12. JD Requirement Extraction

This is a distinct stage and uses the pasted JD.

Extract:

- role title;
- seniority;
- responsibilities;
- requirements;
- stable IDs;
- kind;
- priority.

Priority must follow the wording in the posting.

Test:

- required;
- must;
- mandatory;
- preferred;
- bonus;
- nice-to-have;
- optional;
- mixed wording;
- implied-looking but unsupported requirement.

Do not invent years, tools, responsibilities, qualifications, or other requirements.

## Thin JD

For a two-line JD:

- produce only supported requirements;
- keep the kit thin;
- do not invent company facts;
- do not invent interview stages;
- preserve honest gaps.

---

# 13. LLM Provider Abstraction

Create a provider interface.

Responsibilities:

- structured generation;
- system/data separation;
- schema validation;
- malformed JSON retry;
- incomplete-output retry;
- transient provider retry;
- rate-limit backoff.

Test:

- valid JSON;
- malformed JSON;
- truncated JSON;
- wrong types;
- missing fields;
- extra fields;
- invalid category;
- invalid difficulty;
- invented requirement;
- empty answer;
- provider 429;
- provider 5xx;
- timeout.

Invalid generated data must never be persisted as a valid kit.

Document provider/model and free-tier limitations.

---

# 14. Untrusted Prompt/Data Boundary

JD text, crawled pages, and public discussion are data.

Test source content containing:

- fake system instructions;
- requests to ignore application rules;
- JSON-looking text;
- HTML;
- prompt-injection text;
- contradictory statements.

The model must process them as source content, not execute their instructions.

---

# 15. Sequential Research and Generation

The assessment requires a genuine sequence.

Recommended:

1. validate input;
2. extract JD requirements;
3. retrieve homepage;
4. clean page;
5. discover/rank links;
6. retrieve promising pages;
7. identify hiring evidence;
8. research public interview discussion;
9. generate company brief;
10. generate questions per requirement/category;
11. generate flashcards;
12. deterministic coverage check;
13. targeted second pass;
14. deterministic coverage recheck;
15. deterministic schedule;
16. final validation;
17. persist;
18. expose progress/result.

The sequence must respond to discovered information.

Examples:

- pasted JD requires no retrieval;
- homepage needs crawling before it can inform the kit;
- discovered hiring stages should affect relevant questions;
- technical requirement and behavioural requirement should not be generated from identical instructions.

Do not implement:

JD + URL -> one giant LLM call -> final JSON.

---

# 16. Company Brief

Required external fields:

- summary;
- what_they_do;
- sources.

Generate from retrieved evidence.

Test:

- rich site;
- sparse site;
- no about page;
- no hiring page;
- unreachable site;
- contradictory evidence;
- no public discussion.

If evidence is unavailable, report that honestly.

---

# 17. Question Generation

Generate separately by requirement and category.

Examples:

- technical requirement -> technical;
- behavioural requirement -> behavioural;
- domain requirement -> relevant questions;
- company evidence -> company-fit;
- discovered interview stage -> relevant question category.

Each question:

- stable ID;
- existing requirement IDs;
- valid category;
- prompt;
- answer outline;
- difficulty 1–3.

Test every category, all difficulty levels, duplicate questions, malformed output, invalid references.

---

# 18. Deterministic Coverage

Application code must:

1. collect requirement IDs;
2. collect question requirement IDs;
3. compare;
4. find uncovered IDs;
5. distinguish must/nice.

Do not delegate coverage to the LLM.

Output:

`coverage.uncovered_requirement_ids`

Test:

- all covered;
- nice uncovered;
- must uncovered;
- several uncovered;
- invalid reference;
- duplicate references.

---

# 19. Mandatory Second Pass

After first generation:

1. run coverage;
2. identify gaps;
3. generate targeted questions for gaps;
4. validate;
5. merge;
6. recheck.

Test:

- first pass fully covered -> no unnecessary gap generation;
- one must missing -> targeted question;
- multiple must missing -> targeted questions;
- second pass malformed -> preserve valid first-pass kit;
- bounded pass limit reached -> expose remaining gaps honestly.

A kit must not claim complete must-have coverage when deterministic checking says otherwise.

---

# 20. Flashcards

Each:

- id;
- front;
- back;
- requirement_ids.

Test:

- normal cards;
- multiple requirement IDs;
- empty requirement linkage when genuinely appropriate;
- malformed card;
- duplicate card ID.

---

# 21. Deterministic Schedule

The model must not allocate days.

Inputs:

- requested days;
- requirements;
- questions;
- difficulty;
- priority.

Rules:

- exactly N days;
- integer minutes;
- every must-have represented;
- harder/higher-priority material earlier.

Test:

- 1 day;
- 2 days;
- normal 5–10;
- 60 days;
- more days than questions;
- many questions;
- many must-haves;
- few requirements;
- high-priority ordering;
- invalid days.

For sparse content over many days, implement a documented policy for valid empty days. For 1 day, allocate all required material to that day.

---

# 22. Persistence

MongoDB should preserve:

- owner;
- source/input;
- canonical kit;
- internal metadata;
- research/source records;
- generation state;
- practice state;
- timestamps;
- version.

Test:

save -> reload -> edit -> reload -> regenerate -> reload -> practice -> reload.

---

# 23. Long-Running Generation

The assessment notes generation can take around 90 seconds and can fail halfway.

States:

- queued;
- running;
- completed;
- failed.

Progress:

- extracting requirements;
- researching company;
- finding hiring information;
- researching interviews;
- generating questions;
- checking coverage;
- filling gaps;
- building schedule;
- validating;
- saving.

Test:

- normal long run;
- failure halfway;
- retry;
- refresh during run;
- duplicate trigger;
- stale job;
- completed job requested again.

Prevent concurrent generation from corrupting a kit.

---

# 24. Builder

Must support:

- inline question edit;
- inline answer-outline edit;
- inline flashcard edit;
- inline brief edit;
- question reorder;
- category movement;
- add question;
- delete question;
- add flashcard;
- delete flashcard;
- regenerate brief;
- regenerate one category;
- regenerate schedule.

Interaction tests:

- edit then regenerate another section;
- edit then regenerate same category;
- add then regenerate;
- delete then regenerate;
- reorder then regenerate;
- move category then regenerate;
- edit flashcard then regenerate;
- edit brief then regenerate schedule.

Edits should feel immediate rather than saving every keystroke synchronously.

---

# 25. Regeneration State

Represent generated/user state explicitly.

Recommended:

- `origin=generated|user_added`
- `is_edited`
- `is_pinned`
- `version`
- timestamps

Regeneration should preserve:

- user-added;
- edited;
- pinned.

It may replace:

- generated;
- unedited;
- unpinned.

Hard test:

1. generate category;
2. edit one question;
3. pin another;
4. add manual question;
5. delete a generated question;
6. regenerate category;
7. verify protected items survive;
8. verify replaceable generated items can change;
9. validate;
10. rerun coverage;
11. reconcile schedule.

---

# 26. Practice Mode

Flow:

Show front -> reveal answer -> confidence -> covered/uncovered -> next

Confidence:

- 1 low;
- 2 medium;
- 3 high.

Next session may use confidence-weighted ordering; document the exact strategy.

Test:

- hidden answer;
- reveal;
- all confidence values;
- covered;
- uncovered;
- persistence;
- next-session ordering.

---

# 27. Frontend UX

Next.js + Tailwind.

Required:

- reusable components;
- sensible state boundaries;
- loading state;
- empty state;
- error state;
- progress state;
- partial failure;
- immediate-feeling edits/reordering;
- laptop usability;
- phone usability;
- keyboard navigation.

Test:

- slow generation;
- refresh;
- partial research failure;
- API failure;
- validation failure;
- regeneration in progress;
- edit while another operation runs;
- keyboard tab/focus;
- mobile layout.

---

# 28. Backend Separation

Separate:

```
auth/
retrieval/
crawler/
research/
extraction/
generation/
coverage/
schedule/
persistence/
kits/
practice/
evaluation/
```

The evaluator must be able to invoke the same pipeline.

---

# 29. API Validation

Validate every incoming request.

Test:

- missing fields;
- wrong types;
- unexpected fields;
- invalid IDs;
- unauthorized IDs;
- invalid days;
- malformed URLs;
- invalid update;
- invalid regeneration target;
- duplicate generation.

Validate generated kits before saving.

---

# 30. Duplicate and Concurrency Cases

The assessment explicitly includes duplicate description/company submission.

Test:

- same JD + same company + same days;
- same JD + same company + different days;
- same JD + different company;
- equivalent URL normalization;
- simultaneous duplicate creation;
- simultaneous regeneration;
- stale update against newer version.

Choose/document deterministic behavior and prevent data loss.

---

# 31. Failure Semantics

## Source failure

Examples:

- timeout;
- 404;
- unavailable hiring page.

Expected:

- record/skip source;
- continue where possible.

## Partial research

Expected:

- `status=ok`;
- honest gaps;
- no fabricated evidence.

## Pipeline failure

Examples:

- no valid kit can be produced;
- repeated invalid model output;
- unrecoverable persistence error.

Expected:

- `status=failed`;
- structured error.

---

# 32. Mandatory Batch Evaluator

Implement exactly:

```bash
npm run evaluate -- --input <cases.json> --output <kits.json>
```

Requirements:

- JSON array input;
- same pipeline as web application;
- uses each case's `days`;
- Appendix B output;
- continues after failure;
- preserves IDs;
- structured errors;
- local company URLs supported;
- relative links supported;
- clean-clone operation;
- environment variables documented.

Performance test five cases within fifteen minutes including retries.

---

# 33. Comprehensive Edge-Case Matrix

## JD

- [ ] empty;
- [ ] whitespace;
- [ ] two-line;
- [ ] normal;
- [ ] very long;
- [ ] Unicode;
- [ ] duplicated sections;
- [ ] no explicit requirements;
- [ ] technical only;
- [ ] behavioural only;
- [ ] domain only;
- [ ] mixed;
- [ ] conflicting wording;
- [ ] requirement repeated in responsibilities.

## Company

- [ ] valid;
- [ ] invalid;
- [ ] 404;
- [ ] timeout;
- [ ] 403;
- [ ] 429;
- [ ] 5xx;
- [ ] redirect;
- [ ] redirect loop;
- [ ] localhost evaluator;
- [ ] relative links;
- [ ] no hiring page;
- [ ] no about page;
- [ ] sparse site;
- [ ] large site;
- [ ] deep hiring page;
- [ ] hiring content in blog/handbook.

## Public research

- [ ] rich;
- [ ] absent;
- [ ] unavailable;
- [ ] stale;
- [ ] contradictory;
- [ ] irrelevant;
- [ ] instruction-like malicious text.

## LLM

- [ ] valid JSON;
- [ ] invalid JSON;
- [ ] truncated JSON;
- [ ] incomplete JSON;
- [ ] wrong types;
- [ ] extra fields;
- [ ] invalid category;
- [ ] invalid difficulty;
- [ ] invented requirement;
- [ ] empty answer;
- [ ] 429;
- [ ] 5xx;
- [ ] timeout.

## State

- [ ] edit;
- [ ] add;
- [ ] delete;
- [ ] reorder;
- [ ] move category;
- [ ] pin;
- [ ] regenerate;
- [ ] concurrent regeneration;
- [ ] stale update;
- [ ] refresh during generation;
- [ ] session expiry.

## Schedule

- [ ] 1 day;
- [ ] normal;
- [ ] 60 days;
- [ ] too few questions;
- [ ] many questions;
- [ ] many must-haves;
- [ ] no nice-to-haves;
- [ ] high difficulty;
- [ ] mixed difficulty.

## Batch

- [ ] one case;
- [ ] five cases;
- [ ] mixed failures;
- [ ] duplicate cases;
- [ ] invalid case;
- [ ] local server;
- [ ] relative links;
- [ ] large batch.

---

# 34. Security Test Matrix

Test:

- authentication bypass;
- ownership bypass;
- SSRF;
- private IP;
- loopback;
- DNS-to-private resolution;
- redirect SSRF;
- oversized response;
- unsupported content;
- malicious HTML;
- prompt injection in JD;
- prompt injection in crawled page;
- prompt injection in public discussion;
- secret leakage in logs;
- session leakage.

Do not render untrusted HTML as executable application markup.

---

# 35. Automated Test Suite

Minimum:

## Structure

- Appendix A;
- Appendix B;
- exact field names;
- ID integrity;
- difficulty;
- integer minutes.

## Coverage

- covered;
- uncovered nice;
- uncovered must;
- second pass;
- invalid reference.

## Schedule

- exact N days;
- 1 day;
- 60 days;
- must-have representation;
- priority/difficulty ordering;
- integer minutes.

## Regeneration

- edited survives;
- pinned survives;
- user-added survives;
- unrelated category survives;
- schedule regeneration preserves content.

## Retrieval

- relative links;
- ranking;
- timeout;
- 404;
- 429;
- retry;
- robots;
- size;
- content type;
- SSRF.

## Auth

- protected routes;
- ownership isolation;
- logout;
- invalid session.

## Batch

- multiple cases;
- failure continuation;
- exact output;
- same pipeline.

---

# 36. Observability

Track per generation:

- run ID;
- kit ID;
- current stage;
- elapsed time;
- source attempts;
- successful sources;
- failed sources;
- retries;
- LLM calls;
- validation failures;
- coverage before second pass;
- coverage after second pass;
- final status.

Never log:

- passwords;
- API keys;
- session secrets;
- unnecessary sensitive data.

---

# 37. Optional Creative Feature

Only after mandatory functionality.

Possible implementation:

## Weak Spots Report

Use existing deterministic data:

- must-have requirements;
- coverage;
- practice confidence;
- uncovered/low-confidence areas.

Show preparation areas derived from those signals.

This is optional and must not delay mandatory requirements.

---

# 38. Deployment

Mandatory:

- public frontend;
- reachable backend;
- secure environment variables;
- documented variables.

Smoke-test production:

- register;
- login;
- create kit;
- observe progress;
- complete generation;
- edit;
- regenerate;
- practice;
- verify backend;
- run batch from clean clone.

---

# 39. README

Include:

1. overview;
2. tech stack;
3. justification;
4. local setup;
5. deployed setup;
6. exact batch command;
7. LLM provider/model;
8. architecture;
9. retrieval;
10. sources;
11. sequencing;
12. coverage;
13. second pass;
14. generated/edited/pinned state;
15. schedule algorithm;
16. creative feature;
17. design decisions;
18. trade-offs;
19. limitations;
20. security;
21. edge cases;
22. tests.

---

# 40. Walkthrough Video

3–4 minutes.

Show:

1. create from JD + company URL;
2. progress;
3. research;
4. company brief;
5. role;
6. categorized questions;
7. coverage gap;
8. second pass;
9. edit;
10. reorder/move;
11. category regeneration;
12. preservation of manual edit;
13. flashcard practice;
14. confidence/coverage;
15. schedule;
16. creative feature if included;
17. one defensible design decision.

---

# 41. Final Traceability Matrix

| PDF requirement | Implementation | Verification |
|---|---|---|
| Authentication | auth/session | auth tests |
| Own kits only | owner-scoped persistence | isolation tests |
| JD input | form/API | input tests |
| Multi-role | batch/evaluator | batch tests |
| Company crawl | crawler/ranker | crawler fixtures |
| Hiring discovery | dynamic link ranking | crawl fixtures |
| Public research | research service | source tests |
| Source failure | source error model | failure tests |
| Rate limits | retry/backoff | retry tests |
| Sequential pipeline | orchestrator | pipeline logs/tests |
| Requirement extraction | extraction service | JD fixtures |
| Question generation | targeted generators | generation tests |
| Coverage | deterministic checker | coverage tests |
| Second pass | gap loop | second-pass tests |
| Exact kit | serializer/schema | structure tests |
| Builder | UI/API | interaction tests |
| Regeneration | metadata/reconciliation | preservation tests |
| Practice | practice service/UI | practice tests |
| Schedule | deterministic allocator | schedule tests |
| Batch command | evaluation CLI | clean-clone test |
| Edge cases | failure handling | edge matrix |
| Security | URL/content/session controls | security tests |
| Frontend | Next.js/Tailwind | UX verification |
| Backend | Node/Express | API tests |
| Deployment | frontend/backend | production smoke test |
| README | documentation | final review |
| Walkthrough | recording | submission check |

---

# 42. Final End-to-End Verification

From a clean clone:

```bash
npm install
npm test
npm run build
npm run evaluate -- --input evaluation/cases.json --output evaluation/kits.json
```

Verify:

- clean clone works;
- no hidden local paths;
- .env.example is complete;
- batch command works;
- five cases finish within 15 minutes;
- failures do not abort batch;
- Appendix A exact;
- Appendix B exact;
- must-have coverage;
- exact schedule days;
- valid question IDs;
- edits survive regeneration;
- practice persists;
- mobile UI;
- keyboard access;
- production deployment.

---

# 43. Final Submission Gate

## Automated areas

- [ ] must-have extraction;
- [ ] no invented requirements;
- [ ] correct must/nice;
- [ ] question coverage;
- [ ] exact schedule;
- [ ] deterministic schedule;
- [ ] crawl;
- [ ] hiring discovery;
- [ ] public research;
- [ ] separate generation;
- [ ] deterministic coverage;
- [ ] second pass;
- [ ] robust failures;
- [ ] structure validation;
- [ ] tests;
- [ ] batch performance.

## Human-review areas

- [ ] builder;
- [ ] editing;
- [ ] reordering;
- [ ] category movement;
- [ ] regeneration preservation;
- [ ] loading;
- [ ] empty;
- [ ] error;
- [ ] responsive;
- [ ] keyboard;
- [ ] practice;
- [ ] creative feature;
- [ ] README reasoning.

## Submission

- [ ] GitHub repository/access;
- [ ] complete source;
- [ ] meaningful commits;
- [ ] public deployment;
- [ ] README;
- [ ] batch command;
- [ ] walkthrough.

---

# 44. One-by-One Execution Order

Execute and verify in this order:

1. Exact Appendix A/B schemas.
2. Structure/contract tests.
3. Input validation.
4. Secure URL retrieval.
5. Page cleaning.
6. Company crawler.
7. Link ranking/hiring discovery.
8. JD extraction.
9. Public interview research.
10. LLM abstraction.
11. Company brief.
12. Targeted question generation.
13. Flashcards.
14. Deterministic coverage.
15. Second pass.
16. Deterministic schedule.
17. Full pipeline.
18. Persistence.
19. Authentication/ownership.
20. Batch evaluator.
21. Backend API.
22. Next.js/Tailwind UI.
23. Builder.
24. Regeneration preservation.
25. Practice mode.
26. Progress/error UX.
27. Full edge/security tests.
28. Optional creative feature.
29. Deployment.
30. Clean-clone verification.
31. README finalization.
32. Walkthrough video.
33. Final submission gate.

## Core architecture

```
Input
  ↓
Validation
  ↓
JD Requirement Extraction
  ↓
Company Homepage Retrieval
  ↓
Page Cleaning
  ↓
Link Discovery + Ranking
  ↓
Targeted Company Research
  ↓
Hiring-Process Research
  ↓
Public Interview Research
  ↓
Company Brief
  ↓
Requirement/Category-Specific Questions
  ↓
Flashcards
  ↓
DETERMINISTIC COVERAGE CHECK
  ↓
Missing Requirements
  ↓
TARGETED SECOND PASS
  ↓
DETERMINISTIC COVERAGE RECHECK
  ↓
DETERMINISTIC SCHEDULE
  ↓
FINAL VALIDATION
  ↓
Persistence
  ↓
Builder / Practice
```

The central engineering rule is:

**JD extraction -> evidence retrieval -> targeted generation -> deterministic coverage -> targeted second pass -> deterministic schedule -> validation -> persistence**

Not:

**JD + company URL -> one giant LLM prompt -> final JSON**

---

# 45. Engineering Decision Record

For each significant decision, record:

- problem;
- chosen approach;
- alternatives;
- reason;
- trade-off;
- test protecting the behavior.

At minimum:

1. authentication/session;
2. crawler/link ranking;
3. SSRF;
4. LLM provider;
5. retries/backoff;
6. coverage;
7. second-pass stopping;
8. schedule;
9. generated/edited/pinned state;
10. practice ordering;
11. duplicate generation;
12. batch failures;
13. deployment.

---

# 46. Assessment Mindset

The supplied assessment says the purpose is not simply to produce a large application. Reviewers are looking for the engineering judgment underneath:

- how the problem is broken into steps;
- what deterministic logic is kept out of the model;
- how data that cannot be controlled is handled;
- how missing evidence is handled;
- how edits survive regeneration;
- how failures are isolated;
- how the system is tested.

Build one phase, test it, commit it, then move to the next.

**This file is the project execution checklist. Update checkboxes as implementation progresses.**
