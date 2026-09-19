# P1 Quality Gate

P1 extends the P0 contract without moving application ownership of IDs, coverage, scheduling, or schema validity.

## Quality layers

1. **Deterministic contract** — Zod schema, IDs, requirement references, schedule references, coverage.
2. **Deterministic quality heuristics** — relevance overlap, specificity cues, answer-outline usefulness, duplicate detection, difficulty fit.
3. **Evidence quality** — source type, URL, evidence excerpt, confidence basis, ranking, deduplication.
4. **Semantic judge** — advisory 0–2 scoring for relevance, specificity, groundedness, answer usefulness, difficulty fit, and diversity.
5. **Regression suite** — fixed golden cases with prompt version, provider/model, latency, and quality metrics.

A semantic judge must never make an invalid kit shippable and must never override deterministic coverage.

## Research gaps and conflicts

If no supporting evidence exists, generation must fall back to the JD and role requirements without inventing company-specific facts. Public interview discussion remains explicitly non-official.

Equivalent evidence is deduplicated by normalized claim/evidence/source. Conflicting claims should remain source-labeled; the application should not silently select one as authoritative.

## Runtime gate

P1 is complete only after the golden suite has been executed on the current commit and the resulting artifacts are reviewed. Source-level implementation alone is not runtime verification.
