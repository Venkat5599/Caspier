# Agent Fabric — Product Requirements

## 1. Problem

Autonomous AI agents need to call paid APIs and execute on-chain actions, but doing so requires credentials and keys — which means unbounded blast radius. There is no standard way to give an agent **bounded, revocable authority** to spend and act. Separately, people who build useful agent **skills** have no clean way to expose and monetize them.

## 2. Solution

A permissioned execution layer with two halves:

- **The rail:** smart accounts + scoped session keys + x402 proxies + workflow fabric + MCP servers. Agents act with least privilege, no key custody, instant revoke.
- **The product:** `SKILL.md` → validated, sandboxed, **x402-metered** REST + MCP endpoint. Publish a skill, get a paid API + agent tool.

## 3. Goals

- A publisher can upload a `SKILL.md` and get a live, priced endpoint in minutes.
- A caller/agent can discover it (REST or MCP), pay per call, and invoke it — bounded by a session key.
- An account owner can cap spend and revoke the agent in one transaction.
- Production-grade: isolated sandbox, metering, observability, audit.

## 4. Non-goals (v1)

- Building agent reasoning models (we host and meter skills, not train them).
- Custodying user funds (non-custodial by design).
- Multi-chain at launch (one EVM first; abstract later).

## 5. Core user stories

- **Publish:** As a publisher I upload `SKILL.md` with a price; the platform validates and exposes it as REST + MCP.
- **Discover:** As an agent I list available skills via MCP and read their schemas.
- **Pay & call:** As a caller I invoke a skill; I'm charged per call via x402; I get a structured result.
- **Bound:** As an account owner I mint a session key with caps and an allowlist; the agent can spend only within it.
- **Revoke:** As an account owner I revoke the session key; the agent's next action fails on-chain.
- **Earn:** As a publisher I see call volume and receive payouts.

## 6. Functional requirements

| Area | Requirement |
|---|---|
| Manifest | `SKILL.md` frontmatter: name, version, price-per-call, input/output schema, declared tools, scopes, runtime |
| Validation | reject malformed/unsafe skills before publish (schema + static scan + scope declaration) |
| Sandbox | isolated, capped, egress-locked execution; one VM per call |
| Metering | per-call cost, latency, caller, settle status in a usage ledger |
| Payments | x402 gate (402 → verify proof → run → settle); idempotent; publisher payout |
| Exposure | every unit auto-emits a REST route and an MCP tool from one schema |
| Authorization | scoped session keys; per-call + daily caps; rate limit; 1-tx revoke |
| Registry | versioned units, pricing, search, ratings |

## 7. Non-functional requirements

- **Security:** untrusted-code-safe sandbox; no secret leakage; audited contracts.
- **Reliability:** async settlement via outbox; reconciliation; idempotency.
- **Observability:** tracing, metrics, alerts, audit log.
- **Performance:** warm sandbox pool; sub-second overhead excluding skill runtime.
- **Scalability:** modular monolith → service split at seams.

## 8. Open decisions

1. **Sandbox runtime** — LLM-exec vs deterministic-code vs hybrid.
2. **Chain** — which EVM for x402 settlement (Cronos default).
3. **Sandbox tech** — Firecracker (needs KVM) vs gVisor — gated by VPS capability.

## 9. Success metrics

- Time-to-live for a published skill < 5 min.
- Paid call success rate > 99%.
- Settlement reconciliation drift = 0.
- Zero sandbox escapes.
