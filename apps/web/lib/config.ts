/**
 * Kairos — site configuration (customize landing + nav here).
 */

export const siteConfig = {
  name: "Kairos",
  tagline: "Private agent payments on Ethereum",
  description:
    "Kairos lets AI agents call paid APIs without custody or public spend trails. Scoped session budgets and x402 metering — settlement amounts hidden via iExec Nox on Sepolia.",
  url: "https://caspier.dev",
  twitter: "@caspier",
  nav: {
    cta: { text: "Open dashboard", href: "/dashboard" },
    signIn: { text: "Sepolia demo", href: "/dashboard" },
  },
};

export const heroConfig = {
  badge: "Kairos · iExec Nox · Sepolia · MCP",
  headline: {
    line1: "Private payments for",
    line2: "autonomous agents,",
    accent: "on Ethereum",
  },
  subheadline:
    "Scoped session budgets and metered API calls. Settlement amounts stay confidential with Nox — while your agents keep using MCP and x402.",
  cta: { text: "Publish SKILL.md", href: "/dashboard/create" },
};

export const blurHeadlineConfig = {
  text: "Kairos brings permissioned execution to Casper — publish SKILL.md, discover skills over MCP, pay with x402, and run inside scoped session keys without giving up custody.",
};

export const techStackConfig = {
  title: "Built on open standards",
  description:
    "Kairos composes Casper, x402, MCP, and n8n — no proprietary lock-in.",
  items: [
    {
      name: "Casper",
      description: "On-chain settlement and scoped session keys",
    },
    {
      name: "x402",
      description: "HTTP 402 micropayments per skill invoke",
    },
    {
      name: "MCP",
      description: "Model Context Protocol for agent discovery",
    },
    {
      name: "n8n",
      description: "Workflow automation for paid skill pipelines",
    },
  ],
};

export const howItWorksConfig = {
  title: "How it works",
  description: "From SKILL.md to metered endpoint in four steps — publish, discover, pay, execute.",
  cta: { text: "Try hello-weather", href: "/dashboard/apis/hello-weather" },
  steps: [
    { title: "Publish SKILL.md", description: "Define name, pricing, egress allowlist, and runtime. Gateway validates and registers the skill." },
    { title: "Discover via REST or MCP", description: "Agents list skills, read manifests, and call POST /s/:slug or invoke_skill over MCP." },
    { title: "Pay with x402", description: "Paid skills return HTTP 402 with a quote. Auto-pay settles on Casper and unlocks execution." },
    { title: "Execute in sandbox", description: "Scoped session keys bound spend. Egress is allowlisted. Every call is metered and logged." },
  ],
};

export const faqItems = [
  {
    question: "What is a skill?",
    answer: "A skill is a SKILL.md manifest plus handler. Kairos validates it, registers REST and MCP endpoints, and meters every invocation on Casper.",
  },
  {
    question: "How does x402 payment work?",
    answer: "Paid skills return HTTP 402 with price, asset, nonce, and expiry. Call POST /s/:slug/auto-pay with the nonce to settle on Casper and run the handler.",
  },
  {
    question: "What are session keys?",
    answer: "Scoped Casper agent keys with max spend per call and expiry. Agents get autonomy without custody of your main wallet.",
  },
  {
    question: "Can I use MCP?",
    answer: "Yes. The MCP server exposes list_skills, get_skill, and invoke_skill — same gateway, same metering.",
  },
  {
    question: "Does it work without Casper keys?",
    answer: "Set FABRIC_DEMO_CHAIN=true for local demo mode. Real testnet deploys when CHAIN_WORKER_SECRET_KEY is configured.",
  },
];

export const faqConfig = {
  title: "Everything you need to know",
  description: "Can't find the answer? Open the dashboard or check the repo.",
  cta: {
    primary: { text: "Open dashboard", href: "/dashboard" },
    secondary: { text: "GitHub", href: "https://github.com/Venkat5599/Caspier" },
  },
};

export const footerConfig = {
  cta: {
    headline: "Ship your Casper testnet demo with Kairos.",
    placeholder: "your@email.com",
    button: "Open dashboard",
  },
  copyright: `© ${new Date().getFullYear()} Kairos. Built on Casper.`,
};

export const featuresBentoConfig = {
  publish: {
    title: "Publish SKILL.md in minutes",
    description: "Upload a manifest — gateway validates pricing, egress, and runtime.",
    phoneTitle: "Skill live",
    phoneSubtitle: "REST + MCP ready",
    phoneBody: "hello-weather is metered and sandboxed.",
    projectName: "hello-weather",
    projectMeta: "SKILL · v0.1 · LIVE",
  },
  invoke: {
    title: "Metered invoke",
    description: "402 quotes, auto-pay, and usage ledger on every call.",
    activeLabel: "Paid skills",
    activeCount: "402 → pay → run",
    statusLabel: "Last invoke",
    statusValue: "Weather OK",
    statusBadge: "Paid via x402",
  },
  ecosystem: {
    title: "Agent ecosystem",
    subtitle: "MCP + x402 + Casper",
    rating: "Built for hackathon demos",
  },
  scale: {
    title: "Production paths",
    description: "Demo chain locally, Casper testnet when keys are set.",
    stats: [
      { tag: "CHAIN", label: "Casper deploys", change: "testnet" },
      { tag: "KEYS", label: "Session keys", change: "scoped" },
    ],
  },
};

export const features = {
  smoothScroll: true,
  parallaxHero: true,
  blurInHeadline: true,
};

export const themeConfig = {
  defaultTheme: "system" as "light" | "dark" | "system",
  enableSystemTheme: true,
};
