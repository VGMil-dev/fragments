export function AuthOrb({ size = 48 }: { size?: number }) {
  const borderRadius = Math.round(size * 0.33);

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {/* Core orb */}
      <div
        style={{
          width: size,
          height: size,
          borderRadius,
          background:
            "radial-gradient(circle at 32% 28%, oklch(88% 0.10 292), oklch(54% 0.28 292) 52%, oklch(22% 0.14 292) 100%)",
          boxShadow:
            `inset -${Math.round(size * 0.07)}px -${Math.round(size * 0.09)}px ${Math.round(size * 0.17)}px rgba(0,0,0,0.45),` +
            `inset ${Math.round(size * 0.04)}px ${Math.round(size * 0.06)}px ${Math.round(size * 0.09)}px rgba(255,255,255,0.22),` +
            `0 0 ${Math.round(size * 0.67)}px -${Math.round(size * 0.17)}px rgba(217,70,239,0.45)`,
          animation: "breathe 4.5s ease-in-out infinite, float-up 7s ease-in-out infinite",
        }}
      />
      {/* Crystal shards */}
      {[
        { top: "8%", right: "-14%", delay: "0s", sz: Math.round(size * 0.14) },
        { top: "65%", right: "-12%", delay: "0.8s", sz: Math.round(size * 0.10) },
        { top: "40%", left: "-14%", delay: "1.4s", sz: Math.round(size * 0.12) },
      ].map((shard, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: shard.sz,
            height: shard.sz,
            borderRadius: Math.round(shard.sz * 0.35),
            background: "rgba(217,70,239,0.65)",
            boxShadow: "0 0 8px rgba(217,70,239,0.9)",
            top: shard.top,
            right: shard.right,
            left: shard.left,
            animation: `float-up 3.5s ease-in-out infinite ${shard.delay}`,
          }}
        />
      ))}
    </div>
  );
}
