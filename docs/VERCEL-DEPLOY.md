# Deploy kairos web on Vercel

**Split deployment:** the Next.js marketing site and dashboard run on **Vercel**. The **gateway**, Postgres, and chain worker run on your **VPS**. The **MCP server** runs on your developer machine (stdio) and points at the VPS gateway URL — same API the dashboard uses.

See [DEPLOYMENT-ARCHITECTURE.md](./DEPLOYMENT-ARCHITECTURE.md) for request flows and [VPS-DEPLOY.md](./VPS-DEPLOY.md) for backend setup.

## Prerequisites

- GitHub repo connected to Vercel
- VPS gateway deployed (or placeholder URL until VPS is ready) — see [VPS-DEPLOY.md](./VPS-DEPLOY.md)
- [Bun](https://bun.sh) supported by Vercel (configured in `vercel.json`)

## 1. Import project

1. Go to [vercel.com/new](https://vercel.com/new) and import the kairos repository.
2. Set **Root Directory** to `apps/web` (monorepo subfolder).
3. Framework Preset: **Next.js** (auto-detected).

Vercel reads `apps/web/vercel.json`:

| Setting | Value |
|---------|-------|
| Install | `cd ../.. && bun install` |
| Build | `bun run build` (`next build`) |
| Output | Vercel-managed (no `standalone`; see `next.config.ts`) |

## 2. Environment variables

Set these in **Project Settings → Environment Variables** (Production, Preview, Development):

| Variable | Production example | Notes |
|----------|-------------------|-------|
| `NEXT_PUBLIC_GATEWAY_URL` | `https://user-vps-api-domain` | Public gateway URL on VPS |

**Before VPS is ready**, use a placeholder:

```
NEXT_PUBLIC_GATEWAY_URL=https://user-vps-api-domain
```

Dashboard API calls will fail until the gateway is live. Update and redeploy when the VPS is up.

Optional (Vercel sets automatically):

| Variable | Value |
|----------|-------|
| `VERCEL` | `1` (disables standalone output in `next.config.ts`) |

## 3. Deploy

Click **Deploy** or push to `main` if Git integration is enabled.

Production URL examples:

- `https://kairos.vercel.app` (default Vercel subdomain)
- Custom domain: `https://kairos.dev` (add in Vercel → Domains)

## 4. Verify

```bash
# Site loads
curl -fsS -o /dev/null -w "%{http_code}\n" https://kairos.vercel.app/

# Dashboard reaches gateway (after VPS is live)
curl -fsS https://api.kairos.dev/health
```

Open `https://kairos.vercel.app/dashboard` and confirm skills load when the gateway is reachable.

## 5. Redeploy after VPS URL changes

`NEXT_PUBLIC_*` vars are embedded at **build time**. When you change the gateway domain:

1. Update env vars in Vercel
2. Trigger **Redeploy** (Deployments → … → Redeploy)

## Local parity

```bash
cd apps/web
NEXT_PUBLIC_GATEWAY_URL=http://localhost:8080 bun run dev
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails on install | Confirm Root Directory is `apps/web` and `vercel.json` installCommand reaches monorepo root |
| Dashboard shows fetch errors | Gateway down or wrong `NEXT_PUBLIC_GATEWAY_URL`; check CORS (gateway allows all origins) |
| TypeScript errors on Vercel | Run `bun run web:build` locally first |

## Files reference

| File | Purpose |
|------|---------|
| `apps/web/vercel.json` | Install/build commands for monorepo |
| `apps/web/next.config.ts` | Skips `standalone` when `VERCEL=1` |
| `apps/web/package.json` | `build` script (`next build`) |
