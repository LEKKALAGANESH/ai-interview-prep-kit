# Provider Quality Policy

Provider selection may change latency, cost, and wording, but cannot change application-owned contracts.

- Validate every provider response with the same schema.
- Create IDs in application code only.
- Run deterministic coverage after every provider result.
- A fallback provider must not silently bypass quality gates.
- Record provider/model and attempt metadata when available.
- Treat semantic quality scores as advisory.
- Prefer the configured provider for reproducibility; fallback is bounded and observable.
- Never log API keys, raw authorization headers, or unredacted sensitive prompts.
