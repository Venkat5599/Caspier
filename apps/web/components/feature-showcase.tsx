"use client";

import { motion } from "motion/react";
import { KeyRound, Layers, BadgeCheck, Banknote, Radio, CheckCircle2, ArrowRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

const ease = [0.23, 1, 0.32, 1] as const;

function Row({ label, value, tag }: { label: string; value: string; tag?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-xs text-neutral-400">{label}</span>
      <span className="flex items-center gap-2">
        <span className="font-mono text-xs text-neutral-300">{value}</span>
        {tag && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-neutral-400">{tag}</span>}
      </span>
    </div>
  );
}

function Mock({ children }: { children: ReactNode }) {
  return (
    <div className="mt-8 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      {children}
    </div>
  );
}

function FeatureBlock({
  eyebrow,
  icon: Icon,
  title,
  mock,
  delay,
}: {
  eyebrow: string;
  icon: LucideIcon;
  title: string;
  mock: ReactNode;
  delay: number;
}): ReactNode {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7, ease, delay }}
      className="flex flex-col rounded-3xl border border-white/[0.08] bg-white/[0.03] p-7 sm:p-8"
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-accent" strokeWidth={1.7} />
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">{eyebrow}</span>
      </div>
      <h3 className="mt-3 text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">{title}</h3>
      {mock}
    </motion.div>
  );
}

export function FeatureShowcase(): ReactNode {
  return (
    <section className="w-full bg-[#080808] px-6 py-24 sm:py-32" style={{ colorScheme: "dark" }}>
      <div className="mx-auto max-w-6xl">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease }}
          className="mx-auto max-w-3xl text-center text-3xl font-semibold tracking-tight text-white sm:text-5xl"
        >
          Permissioned execution, at every layer
        </motion.h2>

        <div className="mt-16 grid gap-6 lg:grid-cols-2">
          <FeatureBlock
            eyebrow="Session keys"
            icon={KeyRound}
            title="Agents spend within a cap you define"
            delay={0}
            mock={
              <Mock>
                <div className="divide-y divide-white/[0.06]">
                  <Row label="Max per call" value="5 ETH" tag="scoped" />
                  <Row label="Agent key" value="01ab…c4f2" />
                  <Row label="Expires" value="2026-07-07" />
                </div>
              </Mock>
            }
          />
          <FeatureBlock
            eyebrow="Skill catalog"
            icon={Layers}
            title="Skills become api__* MCP tools automatically"
            delay={0.08}
            mock={
              <Mock>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">Live tools</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-accent">
                    <Radio className="h-3 w-3" /> gateway
                  </span>
                </div>
                <div className="mt-3 space-y-2 font-mono text-xs text-neutral-300">
                  <p>api__hello-weather</p>
                  <p>wf__pay-if-budget</p>
                  <p>kairos_chain_status</p>
                </div>
              </Mock>
            }
          />
          <FeatureBlock
            eyebrow="x402 metering"
            icon={BadgeCheck}
            title="Pay-per-call before execution runs"
            delay={0}
            mock={
              <Mock>
                <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.04] p-3">
                  <span className="text-sm font-medium text-white">HTTP 402 quote</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-medium text-accent">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Sepolia deploy
                  </span>
                </div>
                <div className="mt-1 divide-y divide-white/[0.06]">
                  <Row label="Price" value="1000 wei" />
                  <Row label="Nonce" value="a3f9…8c21" tag="one-time" />
                </div>
              </Mock>
            }
          />
          <FeatureBlock
            eyebrow="On-chain settlement"
            icon={Banknote}
            title="Proof verified before the sandbox runs"
            delay={0.08}
            mock={
              <Mock>
                <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.07] bg-white/[0.04] p-4">
                  <div>
                    <p className="text-[11px] text-neutral-400">Paid</p>
                    <p className="text-2xl font-semibold tracking-tight text-white">1000 wei</p>
                  </div>
                  <ArrowRight className="h-5 w-5 shrink-0 text-neutral-300" />
                  <div className="min-w-0 text-right">
                    <p className="text-[11px] text-neutral-400">Deploy</p>
                    <p className="truncate font-mono text-xs text-white">eth:demo:…</p>
                  </div>
                </div>
              </Mock>
            }
          />
        </div>
      </div>
    </section>
  );
}
