# Claude Code live demo guide

End-to-end flow: deploy kairos, publish a skill, mint a scoped session key, connect Claude Code to the MCP server, and invoke paid skills with x402 settlement.

## Architecture for the demo

```
Vercel (kairos.vercel.app) — dashboard UI
        │
        ▼ HTTPS
VPS gateway (api.kairos.dev) — catalog, x402, chain
        ▲
        │ HTTPS (GATEWAY_URL)
Claude Code (your laptop)
  └── MCP stdio → apps/mcp-server (local Bun)
```

The MCP server runs **locally** in Claude Code (stdio transport). It calls the VPS gateway over HTTP. No MCP process runs on the VPS.

## 1. Deploy or run the stack

**Recommended:** web on [Vercel](./VERCEL-DEPLOY.md), backend on [VPS](./VPS-DEPLOY.md).

**Local dev:**

```bash
bun install
docker compose -f infra/compose/docker-compose.yml up -d postgres
export DATABASE_URL=postgres://fabric:fabric@localhost:5432/fabric
bun services/catalog/src/migrate.ts
bun run gateway:dev   # terminal 1 — port 8080
bun run web:dev       # terminal 2 — port 5173
```

Note your gateway URL:

- Production: `https://api.kairos.dev` (VPS + Caddy)
- Vercel dashboard: set `NEXT_PUBLIC_GATEWAY_URL` to the same value
- Local: `http://localhost:8080`

Verify:

```bash
curl -fsS "$GATEWAY_URL/health"
curl -fsS "$GATEWAY_URL/chain/status"
```

## 2. Seed hello-weather / publish a skill

### Option A: Dashboard

1. Open `https://kairos.vercel.app/dashboard` (or local `http://localhost:5173/dashboard`).
2. Go to **Create** and publish with defaults (`hello-weather`, price `1000` wei), or
3. Open **APIs → hello-weather** after seeding.

### Option B: API seed

```bash
curl -fsS -X POST "$GATEWAY_URL/skills/seed-demo"
```

### Option C: Upload SKILL.md

```bash
curl -fsS -X POST "$GATEWAY_URL/skills" \
  -H "content-type: text/markdown" \
  --data-binary @docs/examples/hello.SKILL.md
```

Confirm catalog:

```bash
curl -fsS "$GATEWAY_URL/skills" | jq .
```

### Workflows (optional)

In the dashboard **Workflows** page, click seed templates, or:

```bash
curl -fsS -X POST "$GATEWAY_URL/workflows/seed"
```

## 3. Mint a scoped session key

Session keys let an agent public key spend within bounds (max per call, expiry) without holding the owner private key.

### Dashboard

1. Open **Session keys**.
2. Enter the **agent public key** (the key your agent or demo wallet will use).
3. Set **max spend** in wei (e.g. `5000000000` = 5 ETH).
4. Click **Mint**.

### API

```bash
curl -fsS -X POST "$GATEWAY_URL/auth/session-keys" \
  -H "content-type: application/json" \
  -d '{
    "agentPublicKeyHex": "01<agent-public-key-hex>",
    "scope": {
      "maxSpendPerCall": "5000000000",
      "expiresAt": "2026-12-31T23:59:59.000Z"
    }
  }'
```

Response includes `deployHash` and `explorerUrl`. In demo mode (`FABRIC_DEMO_CHAIN=true`), the hash is synthetic. With real keys and `FABRIC_DEMO_CHAIN=false`, the gateway records on-chain session-key / vault registerAgent intent.

List keys:

```bash
curl -fsS "$GATEWAY_URL/auth/session-keys"
```

## 4. Claude Code MCP configuration

Prerequisites on your laptop:

- [Bun](https://bun.sh) installed
- kairos repo cloned (MCP server runs from the repo)
- Claude Code installed

### Project config (`.mcp.json` in repo root)

Create or edit `.mcp.json` at the kairos repo root:

```json
{
  "mcpServers": {
    "kairos": {
      "command": "bun",
      "args": ["apps/mcp-server/src/index.ts"],
      "env": {
        "GATEWAY_URL": "http://YOUR_VPS_IP:8086"
      }
    }
  }
}
```

Replace `GATEWAY_URL` with your deployed gateway (must match `NEXT_PUBLIC_GATEWAY_URL` on the VPS).

### User config (`~/.claude.json`)

Same `mcpServers` block under the top-level key in `~/.claude.json` if you prefer a global config. Use an absolute path for `args` if Claude Code is not started from the repo root:

```json
{
  "mcpServers": {
    "kairos": {
      "command": "bun",
      "args": ["/opt/kairos/apps/mcp-server/src/index.ts"],
      "env": {
        "GATEWAY_URL": "http://YOUR_VPS_IP:8086"
      }
    }
  }
}
```

### CLI (alternative)

From the repo root:

```bash
claude mcp add kairos -- env GATEWAY_URL=http://YOUR_VPS_IP:8086 bun apps/mcp-server/src/index.ts
```

Restart Claude Code after changing MCP config. On connect, the MCP server logs to stderr:

```
agent-fabric mcp-server connected (gateway: http://...)
```

### MCP tools exposed

| Tool | Description |
|------|-------------|
| `list_skills` | Lists published skills (name, slug, price) |
| `get_skill` | Returns manifest + SKILL.md body for a slug |
| `invoke_skill` | POST `/s/:slug` with automatic x402 auto-pay |

## 5. Example prompts in Claude Code

After MCP is connected, try these prompts.

### List catalog

> Use the kairos MCP server to list all published skills.

Expected: JSON with `hello-weather` and pricing.

### Inspect a skill

> Call get_skill for slug `hello-weather` and summarize the input schema.

Expected: manifest with `inputSchema.properties.city` and pricing `1000` ETH wei.

### Invoke with x402 (paid call)

> Use invoke_skill to call `hello-weather` with input `{"city": "Oslo"}`.

Flow inside `invoke_skill`:

1. `POST /s/hello-weather` with `{"city":"Oslo"}`
2. Gateway returns **HTTP 402** with x402 quote (`nonce`, `price`, `recipient`)
3. MCP calls `POST /s/hello-weather/auto-pay` with `{ nonce, input }`
4. Gateway auto-pays via chain worker, runs sandbox, returns result + payment

Expected response shape:

```json
{
  "result": { "summary": "Oslo is …" },
  "payment": {
    "deployHash": "<hash>",
    "demo": false,
    "explorerUrl": "https://sepolia.etherscan.io/tx/<hash>"
  },
  "runtimeMs": 42
}
```

### Compare with dashboard

Open `http://YOUR_VPS_IP:8087/dashboard/apis/hello-weather`, invoke with the same JSON, and compare deploy hashes.

## 6. What happens on-chain during invoke

### x402 payment (invoke_skill / auto-pay)

1. **Quote** — Gateway creates a payment quote: price in wei, recipient (`SEPOLIA_PUBLIC_KEY`), nonce, 15-minute expiry.
2. **402 response** — Caller (MCP `invoke_skill`) receives the quote without executing the skill.
3. **Auto-pay** — Gateway chain worker submits a **native ETH transfer** from the worker account to the recipient for `priceWei`.
   - **Demo mode** (`FABRIC_DEMO_CHAIN=true`): in-memory demo chain; `payment.demo: true`.
   - **Testnet** (`FABRIC_DEMO_CHAIN=false`): real `ethers` transfer deploy; hash viewable on testnet explorer.
4. **Verify** — Payment proof is checked (deploy hash, amount, recipient).
5. **Execute** — Skill runs in sandbox (e.g. hello-weather fetches Open-Meteo).
6. **Usage record** — Gateway logs slug, nonce, deploy hash, amount for metering.

Free skills (`pricePerCall: "0"`) skip steps 1–4 and run immediately.

### Session key mint (separate from invoke)

Minting a session key records a scoped **session key** for an agent public key:

- `maxSpendPerCall` caps per-call spend the agent may authorize
- `expiresAt` bounds key lifetime
- Owner retains custody; agent key cannot escalate privileges

In the current build, session-key mint is recorded with deploy metadata; full `vault registerAgent (session EOA)` on testnet requires `SEPOLIA_PUBLIC_KEY` and `CHAIN_WORKER_SECRET_KEY` with `FABRIC_DEMO_CHAIN=false`.

## Demo checklist

- [ ] Gateway `/health` returns `ok`
- [ ] `/chain/status` shows expected `demoMode`
- [ ] `hello-weather` appears in `/skills`
- [ ] Session key minted for demo agent key
- [ ] Claude Code shows `kairos` MCP server connected
- [ ] `list_skills` returns catalog in Claude Code
- [ ] `invoke_skill` returns weather summary + `payment.deployHash`
- [ ] Explorer link opens (testnet) or `demo: true` in demo mode

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| MCP tools missing | Restart Claude Code; check `bun` on PATH |
| `failed to list skills` | Wrong `GATEWAY_URL`; firewall blocking VPS port |
| `auto-pay failed` | Fund chain worker account; set `FABRIC_DEMO_CHAIN=false` and keys |
| `SEPOLIA_PUBLIC_KEY required` | Set public key in VPS `.env`, redeploy gateway |
| 402 but no auto-pay | Use `invoke_skill` (handles auto-pay), not raw HTTP without pay step |
