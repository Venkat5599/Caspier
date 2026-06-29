# Agent Fabric — Roadmap

Production build. Feature phases land behind quality gates; two tracks (Infra/DevOps, Security) run in parallel.

## Parallel tracks

### Track A — Infra / DevOps (VPS)
- [ ] Provision VPS: Docker + Compose (k3s when scaling)
- [ ] Caddy reverse proxy (auto-TLS) → services
- [ ] Postgres + Redis + NATS + MinIO (with backups)
- [ ] Secrets: Vault / SOPS / Doppler — never in repo
- [ ] CI/CD: GitHub Actions → lint + typecheck + test + build → deploy
- [ ] Zero-downtime deploy (blue-green), healthchecks
- [ ] Sandbox isolation host (Firecracker w/ KVM, else gVisor)

### Track B — Security
- [ ] Threat model the sandbox (untrusted SKILL.md = RCE surface)
- [ ] Egress allowlist + network policy per sandbox
- [ ] Input/schema validation on every endpoint (zod)
- [ ] Rate limiting + abuse/DoS protection (per caller, per skill)
- [ ] Contract audit before mainnet
- [ ] Secret isolation; scoped + expiring session keys
- [ ] Hash-chained immutable audit log

### Track C — Observability
- [ ] Structured logging (pino) → Loki
- [ ] Metrics (Prometheus) + Grafana dashboards
- [ ] Tracing (OpenTelemetry) REST → sandbox → chain
- [ ] Alerting: settle failures, sandbox escape, cap breach
- [ ] Uptime + settlement monitor

### Track D — Quality gates (every phase)
- [ ] Unit + integration tests
- [ ] Contract tests (Foundry, fork tests)
- [ ] E2E: publish → discover → pay → execute → revoke
- [ ] Load test x402 gate + sandbox throughput
- [ ] Staging env mirroring prod

## Feature phases

| Phase | Deliverable | Prod bar |
|---|---|---|
| 0 | Monorepo + docs + workspace | ✅ scaffolded |
| 1 | Smart account + scoped session keys (ERC-7702) | audited, fork-tested, revoke verified |
| 2 | x402 proxies + meter | rate-limited, idempotent settle, ledger |
| 3 | Workflow fabric | per-step scope enforce, retry/rollback |
| 4 | MCP + REST exposure | authed, schema-validated, OpenAPI + MCP descriptor |
| 5 | Skills-as-endpoints | hardened sandbox, egress-locked, capped, metered |
| 6 | Web + marketplace | wallet auth, dashboards, monitored |
| 7 | SDK + seed units | published, documented, load-tested |

## Recommended order
Infra (A) first → Phase 1 contracts in parallel with Track B threat model → feature phases behind C+D gates. Sandbox (Phase 5) only after isolation infra is solid.

## Open decisions
1. Sandbox runtime — LLM / code / hybrid.
2. Chain — Cronos EVM (default) or other.
3. Sandbox tech — Firecracker (KVM) vs gVisor (gated by VPS).
