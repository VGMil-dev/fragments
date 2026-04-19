"use client";

import { useEffect, useState } from "react";

interface Particle {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
}

export function AmbientParticles({ count = 14 }: { count?: number }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 2 + Math.random() * 3,
        duration: 18 + Math.random() * 18,
        delay: Math.random() * 10,
        drift: Math.round((Math.random() - 0.5) * 60),
      }))
    );
  }, [count]);

  if (particles.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bottom-0"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: "oklch(72% 0.15 292 / 0.6)",
            filter: "blur(1px)",
            "--drift": `${p.drift}px`,
            animation: `particle-rise ${p.duration}s linear ${p.delay}s infinite`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
