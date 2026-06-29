# Sandbox Design

Skills are untrusted code. The sandbox is the highest-risk component. This doc captures the isolation model and the host-capability decision.

## Threat model

- A malicious `SKILL.md` may attempt: filesystem access, network exfiltration, secret theft, resource exhaustion, container/VM escape, lateral movement to other tenants.
- Assume every skill body is hostile.

## Defense in depth

```
┌──────────── microVM / sandbox (one per call, ephemeral) ────────────┐
│ seccomp + cgroups (cpu / mem / pids / wall-time caps)                │
│ read-only rootfs · tmpfs scratch · no host filesystem mount         │
│ network DENY-all → egress through filtering proxy (allowlist only)  │
│ no platform secrets · only a scoped session-key capability handle   │
│ runtime engine: LLM-exec | code-exec | hybrid (TBD)                 │
└──────────────────────────────────────────────────────────────────────┘
            VM destroyed after the call — no reuse, no state leak
```

- **One sandbox per call**, destroyed after → no cross-tenant leakage.
- **Egress allowlist** enforced by a proxy; only hosts declared in the manifest scope.
- **Resource caps** at the hypervisor/kernel, not the app.
- **No funds in the sandbox** — skills get a capability handle and request session-key-scoped actions via the Payments service.

## Isolation tech — depends on the host

| Tech | Requires | Isolation | When |
|---|---|---|---|
| Firecracker microVM | `/dev/kvm` (bare-metal or nested-virt) | strongest (real VM/call) | preferred when KVM available |
| gVisor (runsc) | plain Linux, no KVM | strong (userspace syscall interception) | VPS without KVM |
| Docker + seccomp + cgroups | any Docker host | weak (shared kernel) | only trusted deterministic code |

### Host capability check
Run on the VPS:
```bash
egrep -c '(vmx|svm)' /proc/cpuinfo   # CPU virt flags (>0 capable)
ls -l /dev/kvm 2>&1                   # KVM device present?
lscpu | grep -i virtual               # virtualization type
systemd-detect-virt                   # kvm / lxc / openvz / none
nproc && free -h                      # cores + RAM
```

**Decision rule:**
- KVM present → Firecracker.
- No KVM → gVisor (pragmatic prod default).
- Docker-only → last resort, deterministic trusted code only.

## Runtime engine (open)

- **LLM-exec** — SKILL.md is instructions; an LLM agent runs them per call. Most "agentic"; cost per call = tokens.
- **Code-exec** — SKILL.md references TS/Python tools; runtime executes code only. Cheaper, deterministic.
- **Hybrid** — LLM orchestrates and calls sandboxed tools. Most capable, most to build.

Pending: VPS capability output + runtime choice → locks Firecracker-vs-gVisor and the executor implementation.
