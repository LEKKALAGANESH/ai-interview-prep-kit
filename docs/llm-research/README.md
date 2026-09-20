# LLM Research — AI Interview Prep Kit

## Purpose
This directory is the working research record for improving the Trao AI Interview Prep Kit LLM pipeline before UI refinement.

Research is organized around the assessment contract and the current implementation: Appendix A structure, requirement-aware generation, company/public research, deterministic coverage, bounded repair, schema validation, provider reliability, evaluation, and prompt-injection handling.

## Source hierarchy
1. Trao Full-Stack Engineering Assessment — authoritative requirements.
2. This repository — current engineering constraints.
3. GitHub repositories — implementation patterns.
4. General LLM knowledge — only where sources do not establish a point; such guidance is treated as design inference.

## Research scope
GitHub is too large and dynamic to honestly claim an exhaustive review of every repository. This is a targeted, reproducible search across interview assistants, RAG interview systems, structured-output/evaluation harnesses, hallucination tests, LLM-as-a-judge systems, guardrails, prompt-injection projects, and interview knowledge bases.

Repository URLs and adaptation decisions are recorded in repositories.md.

## Key conclusion
Do not use one giant generation prompt.

Use a staged pipeline:

JD → requirement extraction → evidence-grounded company research → question planning → category/requirement generation → deterministic coverage → bounded gap repair → flashcards → deterministic schedule → final schema validation → persistence.

The LLM proposes content. Application code owns identity, coverage, scheduling, schema enforcement, and persistence.

## Documents
- repositories.md — GitHub research inventory and adaptation decisions.
- prompt-patterns.md — prompt architecture and reusable patterns.
- generation-strategy.md — generation pipeline, context, batching and repair.
- evaluation-strategy.md — golden cases, metrics, judges and regression gates.
- research-grounding.md — company/public-web evidence strategy.
- security-patterns.md — prompt injection, untrusted content and provider safety.

## Sprint 1 definition of done
- Requirement extraction remains deterministic after LLM validation.
- Research evidence is separated from instructions.
- Questions are generated from explicit requirement objectives.
- Must-have coverage is deterministic.
- Repair targets only uncovered requirements.
- User-edited content is not clobbered by scoped regeneration.
- Provider failures are bounded and observable.
- Golden cases evaluate quality before and after prompt changes.
- Malformed output cannot enter application state.
- Injection fixtures cover JD, company pages and search results.
- Research claims retain source URLs.
- Unsupported company/interview facts are never fabricated.
