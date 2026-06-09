export function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="absolute inset-0" style={{ background: "var(--bg-base)" }} />

      <div
        className="animate-float absolute -left-32 top-[-10%] h-[500px] w-[500px] rounded-full opacity-40"
        style={{
          background: "radial-gradient(circle, var(--orb-1) 0%, transparent 70%)",
        }}
      />
      <div
        className="animate-float-delayed absolute -right-24 top-[20%] h-[400px] w-[400px] rounded-full opacity-30"
        style={{
          background: "radial-gradient(circle, var(--orb-2) 0%, transparent 70%)",
        }}
      />
      <div
        className="animate-float absolute bottom-[-5%] left-[30%] h-[450px] w-[450px] rounded-full opacity-25"
        style={{
          background: "radial-gradient(circle, var(--orb-3) 0%, transparent 70%)",
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          opacity: 1,
          backgroundImage:
            "linear-gradient(var(--grid-color) 1px, transparent 1px), linear-gradient(90deg, var(--grid-color) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
    </div>
  );
}
