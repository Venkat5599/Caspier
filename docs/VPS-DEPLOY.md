# VPS deployment guide

Deploy the kairos **backend** on a Linux VPS: gateway, Postgres, and optional Caddy TLS. The web UI is hosted on **Vercel** by default (`DEPLOY_WEB=false`).

See [DEPLOYMENT-ARCHITECTURE.md](./DEPLOYMENT-ARCHITECTURE.md) for how Vercel + VPS connect.

## What you provide (checklist)

Use this when you have VPS access:

- [ ] VPS IP and SSH user/key
- [ ] Domain DNS: `api.kairos.dev` → VPS IP
- [ ] `Sepolia_PUBLIC_KEY` (testnet account hex)
- [ ] `CHAIN_WORKER_SECRET_KEY` (testnet secret key)
- [ ] Testnet ETH funded on that account
- [ ] Vercel env: `NEXT_PUBLIC_GATEWAY_URL=https://api.kairos.dev`
- [ ] Vercel redeploy after gateway is live

| Item | Example | Used for |
|------|---------|----------|
| VPS IP | `203.0.113.10` | SSH, DNS A records |
| API domain | `api.kairos.dev` | Gateway (Caddy → :8080) |
| Vercel URL | `kairos.vercel.app` | Dashboard UI |
| Sepolia public key | `01abc…` | x402 recipient, session keys |
| Sepolia secret key | `secret_key_…` | Chain worker signs transfers |

Demo without chain: `FABRIC_DEMO_CHAIN=true`, leave secret key empty.

## VPS prerequisites

1. **OS**: Ubuntu 22.04+ or Debian 12+.
2. **Docker** + Compose v2:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"
```

3. **Caddy** (recommended for TLS):

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy
```

4. **Ports** (firewall — public):

| Port | Service |
|------|---------|
| `80` / `443` | Caddy (TLS) |
| `8080` | Gateway (direct access if no Caddy) |

Internal only (localhost):

| Port | Service |
|------|---------|
| `5432` | Postgres |

## One-time setup

```bash
sudo mkdir -p /opt/agent-fabric
sudo chown "$USER:$USER" /opt/agent-fabric
git clone https://github.com/YOUR_ORG/kairos.git /opt/agent-fabric
cd /opt/agent-fabric
cp .env.production.example .env
# Edit .env — keys, passwords, domains
```

### Caddy systemd (optional)

```bash
sudo tee /etc/caddy/Caddyfile < infra/caddy/Caddyfile
# Or symlink and use: caddy run --config /opt/agent-fabric/infra/caddy/Caddyfile --envfile /opt/agent-fabric/.env
sudo systemctl enable --now caddy
```

First deploy:

```bash
bash infra/deploy.sh
```

## Production environment

Copy `.env.production.example` to `.env`. Key values:

```bash
DEPLOY_WEB=false
GATEWAY_PORT=8080
GATEWAY_PUBLIC_URL=https://api.kairos.dev
API_DOMAIN=api.kairos.dev
VERCEL_WEB_URL=https://kairos.vercel.app

DATABASE_URL=postgres://fabric:<password>@localhost:5432/fabric
Sepolia_PUBLIC_KEY=01<hex>
CHAIN_WORKER_SECRET_KEY=<secret>
FABRIC_DEMO_CHAIN=false
```


## What deploy.sh does

1. Pulls `origin/main`
2. Starts Postgres, Redis, NATS, MinIO via `infra/compose/docker-compose.yml`
3. Runs catalog DB migrations
4. Skips web build when `DEPLOY_WEB=false` (Vercel)
5. Restarts `agentfabric-gateway` on host port `GATEWAY_PORT`
6. Reloads Caddy if installed

Set `DEPLOY_WEB=true` only if you want Next.js on the VPS instead of Vercel.

## Health checks

```bash
# Gateway (local)
curl -fsS "http://localhost:8080/health"

# Via Caddy (after DNS + TLS)
curl -fsS "https://api.kairos.dev/health"
curl -fsS "https://api.kairos.dev/chain/status"

# Seed demo skill
curl -fsS -X POST "https://api.kairos.dev/skills/seed-demo"
curl -fsS "https://api.kairos.dev/skills"
```

From Vercel dashboard: open `https://kairos.vercel.app/dashboard` — skills should load.

## MCP + Claude Code

The MCP server (`apps/mcp-server`) uses **stdio** and runs on each developer's machine, not on the VPS. It calls the gateway at `GATEWAY_URL=https://api.kairos.dev`.

See [CLAUDE-CODE-DEMO.md](./CLAUDE-CODE-DEMO.md).

## Container layout

| Container | Role |
|-----------|------|
| `agentfabric-postgres-1` | Catalog DB |
| `agentfabric-gateway` | API + x402 + chain |

```bash
docker logs -f agentfabric-gateway
docker compose -p agentfabric -f infra/compose/docker-compose.yml ps
```

## CI deploy

`.github/workflows/deploy.yml` SSHs to the VPS and runs `infra/deploy.sh`.

Secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Vercel dashboard empty | Gateway down or wrong `NEXT_PUBLIC_GATEWAY_URL`; redeploy Vercel after fix |
| CORS errors | Gateway uses open CORS; check URL typo |
| Paid invoke fails | `curl /chain/status` — need `configured: true`, funded account |
| `DEPLOY_WEB=false` but old web container running | `docker rm -f agentfabric-web` |

## All-in-one VPS (legacy)

To run web + API on the same box (no Vercel):

```bash
DEPLOY_WEB=true
WEB_PORT=8087
NEXT_PUBLIC_GATEWAY_URL=http://YOUR_VPS_IP:8080
```

Then open `http://YOUR_VPS_IP:8087/dashboard`.
