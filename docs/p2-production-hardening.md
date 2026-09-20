# P2 Production & Assessment Hardening

## Persistence
The JSON store is the selected single-node persistence strategy. Kit writes use temp-file + atomic rename. Request locks use filesystem directory creation, so identical kit IDs are serialized across processes sharing the same store directory. Practice, pin, and research-provenance state use atomic sidecars.

## Idempotency
A normalized request maps to a deterministic kit ID. The service checks the durable store before generation and the durable request lock prevents concurrent duplicate generation across processes sharing the same store path. This is not a distributed lock across independent storage volumes.

## Retrieval freshness
Every successfully fetched research page receives a UTC fetched_at timestamp. Evidence claims carry it as freshness_at. A new generation refreshes retrieval. Persisted provenance records the research timestamp and source-level claims.

## Provenance
Research claims are persisted separately from Appendix A. Each claim records source URL, source type, evidence, confidence basis, and freshness when available. Public interview material remains explicitly labeled as public discussion.

## Security regression
Automated retrieval tests cover private/loopback IPv4, IPv6 loopback, cloud metadata addresses, credential-bearing URLs, unsafe redirects, redirect limits, unsupported content types, oversized responses, and timeouts. Prompt-safety tests cover instruction-like untrusted reference content.

## Evaluation artifacts
Evaluation runs persist provider, model, prompt versions, output, and scorecard metadata. Prompt-regression snapshots use fixed fixtures. Provider comparison requires at least two explicitly configured providers.

## Clean-clone verification
From a fresh clone run: npm install; npm test; npm run build; npm run evaluate -- --help; npm run regression --workspace evaluation.
