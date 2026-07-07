"use client";

import { motion } from "motion/react";
import { techStackConfig } from "@/lib/config";
import type { ReactNode } from "react";

export function TechStack(): ReactNode {
  return (
    <section className="w-full bg-frame border-t border-b border-accent/15 px-6 py-32">
      <div className="mx-auto max-w-5xl">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="mb-4 text-4xl leading-tight font-medium text-neutral-900 sm:text-5xl lg:text-6xl dark:text-neutral-50"
        >
          {techStackConfig.title}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-16 text-lg text-neutral-600 lg:mb-20 dark:text-neutral-400"
        >
          {techStackConfig.description}
        </motion.p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {techStackConfig.items.map((item, index) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="rounded-xl border border-accent/15 bg-background px-5 py-6"
            >
              <div className="mb-2 inline-flex rounded-lg border border-black/10 bg-white px-3 py-1 text-sm font-medium text-black dark:border-white/10 dark:bg-neutral-900 dark:text-white">
                {item.name}
              </div>
              <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
