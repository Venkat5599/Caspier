# Agent Fabric — System Architecture

Enterprise design for a permissioned execution layer where AI agents act under scoped, revocable authority, and where any `SKILL.md` becomes a metered REST + MCP endpoint.

---

## 0. Product surface

| Persona | Uses | Needs |
|---|---|---|
| Publisher | uploads SKILL.md / workflow → earns per call | publish, version, price, payout, analytics |
| Caller (dev/app) | calls units via REST/SDK | API key, x402 wallet, spend caps, usage |
| Agent | discovers + calls via MCP | tool discovery, auto-pay, bounded scope |
| Account owner | funds smart account, mints session keys | custody, caps, revoke, audit |
| Platform ops | runs it | observability, kill switch, fraud control |

---

## 1. Bounded contexts (DDD)

```
Identity & Accounts    Authorization Rail     Catalog
  users, orgs,           smart accts,           skills, workflows,
  API keys, wallets      session keys, scopes   versions, pricing

Execution              Payments & Billing      Observability
  sandbox, runtime,      x402, settlement,      usage events,
  workflow engine        payouts, invoices      audit log, metrics
```

Start as a **modular monolith**; split at scale seams (Execution and Payments split first).

---

## 2. Service decomposition

```
   clients (REST / SDK / MCP / web)
            │
   ┌────────▼─────────┐  Caddy + gateway: authn, rate-limit, route, WAF
   │  API GATEWAY     │
   └────────┬─────────┘
   ┌────┬────┼────┬─────────┬─────────┐
   ▼    ▼    ▼    ▼         ▼         ▼
Identity Catalog Execution Payments  MCP-Gateway
                  │
            ┌─────▼──────┐
            │ SANDBOX    │  Firecracker microVMs (KVM) / gVisor
            │ POOL       │
            └─────┬──────┘
   ┌──────────────▼────────────────────────────────┐
   │ Postgres (schema/context) · Redis · NATS · S3  │
   └──────────────┬────────────────────────────────┘
            ┌──────▼───────┐
            │ CHAIN WORKER │  only signer; outbox → EVM (ERC-7702 + x402)
            └──────────────┘
```

- **API Gateway** — single ingress; authn (API key + wallet sig), rate-limit, routing, WAF.
- **Identity** — users, orgs, RBAC, API keys, wallet links.
- **Catalog** — registry, versions, pricing, manifest validation, search.
- **Execution** — schedules runs, manages sandbox pool, workflow state machine.
- **Sandbox Pool** — isolated microVMs running untrusted skill bodies.
- **Payments** — x402 gate, settlement, double-entry ledger, payouts, invoices.
- **MCP Gateway** — catalog as MCP tools; agent discovery + auto-pay handshake.
- **Chain Worker** — sole holder of signing keys; transactional outbox → EVM.

---

## 3. Data architecture

Postgres, schema-per-context:

- `identity`: users, orgs, members, api_keys, wallet_links
- `catalog`: units, versions, manifests, pricing, tags, ratings
- `authz`: smart_accounts, session_keys, scopes, revocations
- `execution`: runs, run_steps, sandbox_assignments, results
- `payments`: payment_intents, settlements, ledger_entries, payouts, invoices
- `audit`: append-only, hash-chained event log

Supporting: **Redis** (rate-limit, session-key cache, idempotency, hot manifests), **NATS / Redis Streams** (run requests, settlement + usage events), **Object store** (SKILL.md blobs, run logs, large outputs).

Patterns: **transactional outbox** (DB write + event atomic), **idempotency keys** on every call + settle, **event sourcing** for usage/billing. On-chain settlement is the source of truth for money; DB is the fast mirror, reconciled by a job.

---

## 4. Critical flow — paid skill call

```
agent/app      gateway     payments    execution   sandbox    chain
 POST /s/{slug} ─▶ authn+RL
                ─▶ quote ─▶
   402 + price+nonce ◀─────
 retry + x402 proof ─▶ verify ─▶ check cap + scope
                                ─▶ run ─▶ assign VM ─▶ execute (capped)
                                          result ◀───────────
                       settle (outbox) ───────────────────▶ hash
   200 + result ◀── meter + ledger
```

Settlement is **async via outbox** — caller doesn't wait for chain finality; usage metered immediately, settled durably; reconciliation matches ledger ↔ chain.

---

## 5. Sandbox execution (highest-risk surface)

Untrusted `SKILL.md` = remote-code-execution surface. Defense in depth:

```
Execution Orchestrator → warm pool of ephemeral microVMs
┌──────────── microVM (one per call) ────────────┐
│ seccomp + cgroups (cpu/mem/pids/time caps)      │
│ read-only rootfs · tmpfs scratch · no host fs   │
│ network DENY-all → egress allowlist proxy only  │
│ no platform secrets · scoped session-key handle │
│ runtime engine: LLM-exec | code-exec | hybrid   │
└─────────────────────────────────────────────────┘
       VM destroyed after call (no reuse, no leak)
```

- Warm pool for latency; one VM per call, destroyed after → no cross-tenant state leak.
- Egress through a filtering proxy — only declared-scope hosts.
- Resource caps enforced at the hypervisor, not the app.
- Skills never hold funds — they receive a capability handle to call session-key-scoped actions via Payments.

**Isolation tech** depends on host: Firecracker (needs `/dev/kvm`) preferred; **gVisor** where KVM is unavailable; plain Docker + seccomp only for trusted deterministic code. See [`SANDBOX.md`](SANDBOX.md).

---

## 6. Authorization rail (the fabric core)

```
Account owner ──ERC-7702──▶ Smart Account ──delegates──▶ Session Key (scoped)
                                                          allowed contracts/assets/
                                                          methods, max-value, expiry, rate
                                                                │ every tx
                                                                ▼
                                                  on-chain permission enforcement
                                                  over-scope → revert · revoke = 1 tx
```

Platform never custodies. Session key = least privilege, expiring, revocable. Skills/workflows act through it, capped.

---

## 7. Infrastructure topology

**Now (single VPS):**

```
Caddy (TLS/WAF)
  → [gateway, identity, catalog, payments, mcp] containers
  → execution + sandbox pool (Firecracker needs KVM)
  → Postgres + Redis + NATS + MinIO
  → chain-worker (isolated; signer keys in Vault)
Observability: Prometheus + Grafana + Loki + Tempo
CI/CD: GitHub Actions → registry → blue-green deploy
```

**Scale path:** stateless services → k8s; managed Postgres + read replicas; sandbox pool → dedicated KVM hosts; CDN edge; multi-region chain workers.

---

## 8. Security architecture

- **Edge:** TLS, WAF, per-key + per-IP rate limit, DDoS protection.
- **AuthN:** hashed API keys, wallet signature (SIWE), MCP OAuth.
- **AuthZ:** RBAC (org/role) + on-chain session-key scope.
- **Secrets:** Vault / SOPS; signer keys isolated to chain-worker, HSM-ready.
- **Sandbox:** microVM + seccomp + egress allowlist + no-secrets.
- **Audit:** hash-chained append-only log; tamper-evident.
- **Contracts:** external audit before mainnet; fork tests; pause guardian.
- **Compliance path:** PII minimization, retention policy, SOC2 control mapping.

---

## 9. Observability & SRE

- Golden signals per service (latency, traffic, errors, saturation).
- Distributed tracing REST → sandbox → chain (OpenTelemetry).
- Business metrics: calls, revenue, settle success %, payout lag.
- Alerts: sandbox escape, cap breach, settle failure, queue backlog.
- SLOs + error budgets; runbooks; on-call.

---

## 10. Build sequence

1. Infra + CI/CD + observability skeleton.
2. Identity + Catalog + Gateway (modular monolith).
3. Contracts: smart account + session keys + audit.
4. Payments + x402 + ledger + chain worker (outbox).
5. Execution orchestrator + sandbox (after isolation infra solid).
6. Skills-as-endpoints feature on top of execution.
7. MCP gateway + SDK.
8. Web marketplace + dashboards.
9. Harden → audit → staging → load test → mainnet.

See [`ROADMAP.md`](ROADMAP.md) for the phased checklist.
