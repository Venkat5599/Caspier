"use client";

import { DashboardPreview } from "@/components/dashboard-preview";
import { LogoLoop } from "@/components/logo-loop";
import { heroConfig } from "@/lib/config";
import { ArrowDownRight } from "lucide-react";
import { motion, useMotionValue, useSpring } from "motion/react";
import Link from "next/link";
import { useRef, type ReactNode, type MouseEvent } from "react";

const ease = [0.23, 1, 0.32, 1] as const;

const fadeInUp = {
  hidden: { opacity: 0, y: 20, filter: "blur(8px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)" },
};

const fadeInScale = {
  hidden: { opacity: 0, scale: 0.95, filter: "blur(8px)" },
  visible: { opacity: 1, scale: 1, filter: "blur(0px)" },
};

const PARALLAX_INTENSITY = 20;

export function Hero(): ReactNode {
  const sectionRef = useRef<HTMLElement>(null);
  
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const springConfig = { damping: 25, stiffness: 150 };
  const x = useSpring(mouseX, springConfig);
  const y = useSpring(mouseY, springConfig);

  const handleMouseMove = (e: MouseEvent<HTMLElement>) => {
    if (!sectionRef.current) return;
    
    if (window.innerWidth < 850) return;
    
    const rect = sectionRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const offsetX = (e.clientX - centerX) / (rect.width / 2);
    const offsetY = (e.clientY - centerY) / (rect.height / 2);
    
    mouseX.set(offsetX * PARALLAX_INTENSITY);
    mouseY.set(offsetY * PARALLAX_INTENSITY);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <section 
      ref={sectionRef}
      className="flex flex-col relative" 
      style={{ colorScheme: 'light' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div 
        className="absolute inset-0 min-[850px]:inset-2.5 bg-cover bg-center bg-no-repeat -z-10 brightness-125 rounded-br-4xl rounded-bl-4xl min-[850px]:scale-105"
        style={{ 
          backgroundImage: 'url(/BG.jpg)',
          x,
          y,
        }}
        aria-hidden="true"
      />
      
      <div className="flex items-start justify-center px-6 pt-64 max-[850px]:pt-32">
        <motion.div
          className="flex flex-col items-center max-[850px]:items-start text-center max-[850px]:text-left max-w-4xl max-[850px]:w-full"
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: 0.15, delayChildren: 0.2 }}
        >
          <motion.div
            className="inline-flex items-center gap-1.5 pl-4 pr-3 py-1.5 rounded-xl border border-black/10 bg-white text-black text-sm font-medium mb-6"
            variants={fadeInUp}
            transition={{ duration: 0.8, ease }}
          >
            {heroConfig.badge}
          </motion.div>

          <h1 className="mb-6 text-8xl leading-[1.1] font-medium tracking-tight text-black max-[850px]:text-5xl">
            <motion.span className="block" variants={fadeInUp} transition={{ duration: 0.8, ease }}>
              {heroConfig.headline.line1}
            </motion.span>
            <motion.span className="block" variants={fadeInUp} transition={{ duration: 0.8, ease }}>
              {heroConfig.headline.line2}{" "}
              <span className="font-serif text-accent italic">{heroConfig.headline.accent}</span>
            </motion.span>
          </h1>

          <motion.p className="mb-8 text-lg text-neutral-600" variants={fadeInUp} transition={{ duration: 0.8, ease }}>
            {heroConfig.subheadline}
          </motion.p>

          <motion.div variants={fadeInScale} transition={{ duration: 0.8, ease }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link href={heroConfig.cta.href} className="group relative inline-flex cursor-pointer items-center max-[850px]:w-full">
              <span className="absolute inset-y-0 right-0 w-[calc(100%-2rem)] rounded-xl bg-accent max-[850px]:w-full" />
              <span className="relative z-10 rounded-xl bg-black px-6 py-3 font-medium text-white max-[850px]:flex-1">{heroConfig.cta.text}</span>
              <span className="relative -left-px z-10 flex h-11 w-11 items-center justify-center rounded-xl text-black">
                <ArrowDownRight className="h-5 w-5 transition-transform duration-300 group-hover:-rotate-45" />
              </span>
            </Link>
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        className="relative px-6 mt-24 max-[850px]:mt-10"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.6, ease }}
      >
        <div className="relative max-w-5xl mx-auto">
          <div 
            className="relative dark:mix-blend-darken rounded-2xl overflow-hidden border border-neutral-200 shadow-2xl/5 mask-[linear-gradient(to_bottom,black_50%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_50%,transparent_100%)]"
          >
            <DashboardPreview />
          </div>
        </div>
      </motion.div>

      <motion.div
        className="px-6 pt-24 pb-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1, ease }}
      >
        <LogoLoop />
      </motion.div>
    </section>
  );
}
