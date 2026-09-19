# Evaluation Strategy

## Principle
LLM quality must be measured with a fixed regression suite. Do not judge prompt changes from one or two manually inspected outputs.

## Evaluation layers

### Layer 1 — deterministic contract tests
Always pass:
- JSON/schema validity;
- Appendix A fields;
- requirement ID references;
- valid question categories;
- difficulty 1–3;
- stable IDs;
- schedule references;
- integer minutes;
- requested day count;
- deterministic coverage.

### Layer 2 — deterministic quality checks
Measure:
- must-have coverage;
- nice-to-have coverage;
- duplicate question rate;
- unsupported requirement references;
- empty prompts/answer outlines;
- company source URL presence;
- source-to-claim traceability where available.

### Layer 3 — semantic evaluation
Use an independent judge or calibrated rubric for:
- requirement relevance;
- specificity;
- answer-outline usefulness;
- groundedness;
- diversity;
- difficulty appropriateness.

The semantic judge never overrides deterministic contract failures.

## Golden dataset
Create fixed cases covering:
1. senior backend JD;
2. frontend JD;
3. full-stack JD;
4. AI/ML JD;
5. thin JD;
6. ambiguous seniority;
7. many must requirements;
8. only nice-to-have requirements;
9. company with hiring page;
10. company without hiring page;
11. company with no useful public interview discussion;
12. company URL with relative links;
13. malformed provider JSON;
14. rate-limited provider;
15. transient provider failure;
16. duplicate generation request;
17. 1-day schedule;
18. 60-day schedule;
19. prompt injection in JD;
20. prompt injection in company HTML;
21. malicious search result.

## Semantic rubric
Use visible dimensions instead of one opaque score.

| Metric | 0 | 1 | 2 |
|---|---|---|---|
| Requirement relevance | unrelated | partly related | directly tests |
| Specificity | generic | somewhat role-specific | clearly role-specific |
| Grounding | unsupported | mixed | supported |
| Answer usefulness | poor | partial | actionable |
| Difficulty fit | wrong | borderline | appropriate |
| Diversity | duplicate | similar | distinct |

Store raw scores and comments.

## LLM-as-judge safeguards
A judge can be wrong.

Therefore:
- judge receives candidate output and trusted reference context;
- judge does not receive generator private system prompts;
- deterministic checks run alongside it;
- sample cases for human review;
- track judge agreement with human labels;
- never use model self-confidence as ground truth.

## Regression policy
Block a change when it causes:
- schema failures;
- must-have coverage regression;
- increased unsupported claims;
- increased duplicate rate;
- security-test failures;
- major latency/cost regression.

If one metric improves while another materially regresses, record the trade-off instead of hiding it in one score.

## Evaluation record
Store:
{
  "case_id": "case-01",
  "provider": "gemini",
  "model": "...",
  "prompt_version": "question-generator:v2",
  "latency_ms": 1234,
  "input_tokens": 1000,
  "output_tokens": 700,
  "schema_valid": true,
  "coverage": { "must": 1, "nice": 0 },
  "semantic": {
    "relevance": 2,
    "specificity": 2,
    "grounding": 2,
    "answer_usefulness": 2,
    "difficulty": 2,
    "diversity": 2
  }
}

## Prompt iteration protocol
baseline
→ run golden set
→ identify failure cluster
→ change one prompt dimension
→ run golden set
→ compare
→ accept/reject

Change one major variable at a time where practical.

## Offline-first tests
Deterministic tests should run without provider credentials. Provider integration tests should use mocks/fixtures. Real-provider evaluation should be a separate command because free-tier limits can make it slow.

## Trao release gate
- Appendix A validation passes.
- All must requirements are covered or the kit is correctly non-shippable.
- No invalid requirement IDs.
- No fabricated company facts in golden cases.
- Injection fixtures remain safe.
- Thin JD remains thin/honest.
- Repair does not regenerate unrelated questions.
- Existing user content survives scoped regeneration.
- Batch evaluator continues after individual case failure.
