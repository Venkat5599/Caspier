// Fixed ambient mesh — emerald + amber orbs on OLED black. Pointer-events none.
export default function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute -top-40 -left-32 h-[40rem] w-[40rem] rounded-full opacity-[0.18] blur-[120px]"
        style={{ background: "radial-gradient(circle, #34d399, transparent 70%)" }}
      />
      <div
        className="absolute top-1/3 -right-40 h-[36rem] w-[36rem] rounded-full opacity-[0.14] blur-[120px]"
        style={{ background: "radial-gradient(circle, #fbbf24, transparent 70%)" }}
      />
      <div
        className="absolute bottom-0 left-1/4 h-[32rem] w-[32rem] rounded-full opacity-[0.10] blur-[140px]"
        style={{ background: "radial-gradient(circle, #38bdf8, transparent 70%)" }}
      />
      {/* faint grid */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
    </div>
  );
}
