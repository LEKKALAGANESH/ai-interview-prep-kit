# GitHub Repository Research

## Research method
Repositories were searched by problem area rather than popularity alone. The target was evidence of a concrete implementation pattern applicable to Trao.

Important: this is a targeted engineering review, not a claim that every GitHub repository was exhaustively inspected.

## 1. AWS Interview Assistant
Repository: https://github.com/aws-samples/sample-interview-assistant-serverless

Relevant patterns:
- Interview question retrieval rather than only free-form generation.
- Resume/JD/company context combined with a curated question bank.
- Semantic retrieval with category/difficulty metadata.
- Structured question information including evaluation criteria, expected answer, difficulty, time allocation and relevance reasoning.
- Separate company web research and question generation.
- Explicit grounded research and avoidance of invented company information.

Trao adaptation: introduce a question-objective/selection layer before final generation. Do not copy AWS infrastructure; keep Trao provider-neutral and Node/TypeScript.

## 2. Landed — Awesome AI Engineer Interview
Repository: https://github.com/landedjobs/awesome-ai-engineer-interview

Relevant patterns:
- Mechanism-first interview taxonomy.
- LLM fundamentals, RAG, agents/tool use, evals/reliability, system design and LLMOps.
- Sourced questions and company-specific loops.
- Evals, guardrails, cost and reliability treated as first-class topics.

Trao adaptation: use taxonomy to prevent repetitive generic questions. Derive subtopics from the actual requirements rather than a static global list.

Caution: this is primarily a content/reference repository, not a drop-in generation engine.

## 3. RAG Prompts
Repository: https://github.com/agentset-ai/rag-prompts

Relevant pattern: retrieval-grounded prompts for extraction, structured output and verification.

Trao adaptation:
SYSTEM = behavior and constraints
TASK = exact operation
DATA = untrusted evidence
OUTPUT = exact schema

Never allow retrieved text to become system-level instructions.

## 4. LLM Evaluation Bench
Repository: https://github.com/piog/llm-eval-bench

Relevant pattern: repeatable evaluation instead of visual inspection of a few outputs.

Trao adaptation: create golden cases and compare requirement fidelity, relevance, groundedness, diversity, difficulty and schema validity.

## 5. AI Evaluation Harness
Repository: https://github.com/MarcKarbowiak/ai-evaluation-harness

Relevant pattern: a harness makes model quality measurable across repeated cases.

Trao adaptation: run fixed cases against prompt/provider versions and persist evaluation results so prompt changes become measurable regressions or improvements.

## 6. IBM JudgeIt — LLM as a Judge
Repository: https://github.com/ibm-self-serve-assets/JudgeIt-LLM-as-a-Judge

Relevant pattern: an independent LLM judge can evaluate semantic qualities that deterministic validators cannot.

Trao adaptation: use an independent judge for relevance, specificity, grounding, answer-outline usefulness and duplication. Never let the judge override deterministic schema or coverage rules.

## 7. RAG Safety / Prompt Injection / Hallucination Testing
Repository: https://github.com/rabiasadiq-digitaltribe/AI-Safety-Prompt-Injection-RAG-Evaluation-and-Hallucination-Testing

Relevant patterns:
- normal cases;
- impossible/not-found cases;
- false-premise/hallucination cases;
- prompt-injection cases;
- independent evaluation;
- deterministic fail-safe heuristics.

Trao adaptation: add fixtures where JD, company HTML or search results contain malicious instructions, and where requested company facts are unsupported.

## 8. InterviewGPT / GenAI Interview Assistant
Repository: https://github.com/roh-eng/genai-interview-assistant

Relevant patterns:
- resume/JD/question-bank context;
- RAG retrieval;
- separate answer evaluation;
- explicit source material.

Trao adaptation: useful reference for keeping retrieval and evaluation separate.

Caution: much smaller than Trao's required research/generation/persistence pipeline.

## 9. AI Interview Question & Answer Generator using RAG
Repository: https://github.com/prajapatishubham336/AI-Interview-Question-Answer-Generator-using-RAG

Relevant patterns:
- document chunking;
- embeddings;
- semantic retrieval;
- configurable difficulty/type;
- source identification.

Trao adaptation: explicit generation constraints are better than a generic prompt.

Caution: educational/simple architecture; do not treat it as production architecture.

## 10. Additional repositories surfaced by targeted GitHub searches

Interview assistants and generators:
- https://github.com/TaqiyEddine-B/InterviewQuestionsGeneratorWithLlm
- https://github.com/kirankumar-b23/agentic-interview-question-generator
- https://github.com/Adityagupta-dev/Ai-based-prescreening-assistant-bot
- https://github.com/Lalasa-web/ai-interview-assistant-rag
- https://github.com/dakshitasharma/AI-Interview-Coach
- https://github.com/spawn08/agentic-ai-interview-kit

Evaluation:
- https://github.com/amitbad/llm-evaluation
- https://github.com/MeghashyamAVV/LLM-Evaluation-and-Hallucination-Benchmark-Framework-
- https://github.com/puyolabs/kairos-llm-scorer
- https://github.com/OpenHands/critic-rubrics

Security/guardrails:
- https://github.com/royalpinto007/awesome-llm-guardrails
- https://github.com/ni5h4nt/prompt-injection-scanner
- https://github.com/piiguardrails/awesome-llm-guardrails

These are research leads, not dependencies.

## What we should not copy
- Whole frameworks merely because they use RAG.
- Static question banks as the application's source of truth.
- Provider-specific infrastructure that conflicts with current Node/TypeScript design.
- Model-generated requirement IDs.
- Model-decided coverage.
- Model-decided scheduling.
- Undocumented claims from public interview forums.
- Code without checking license and maintenance status.

## Engineering conclusion
Highest-value external ideas:
1. grounded research;
2. retrieval/objective planning before generation;
3. category-aware generation;
4. deterministic coverage;
5. independent evaluation;
6. adversarial safety tests;
7. explicit provenance.

The current repository already implements several of these. Sprint 1 should strengthen them rather than replace the architecture.
