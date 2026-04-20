'use client'

import React, { useMemo, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LumenState } from '@/lib/dashboard-types'

interface LumenProps {
  state: LumenState
  hue?: number        // default 292 (fuchsia)
  size?: number       // default 240
  interactive?: boolean
  onPoke?: () => void
  shake?: boolean
}

const SPRING = { type: 'spring' as const, bounce: 0.4, duration: 0.6 }
const SPRING_SOFT = { type: 'spring' as const, stiffness: 120, damping: 14, mass: 0.9 }

function useMouseParallax(strength: number = 10) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window
      const x = (e.clientX - innerWidth / 2) / (innerWidth / 2)
      const y = (e.clientY - innerHeight / 2) / (innerHeight / 2)
      setOffset({ x: x * strength, y: y * strength })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [strength])

  return offset
}

export function Lumen({
  state,
  hue = 292,
  size = 240,
  interactive = true,
  onPoke,
  shake = false
}: LumenProps) {
  const parallax = useMouseParallax(interactive ? 12 : 0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (shake && containerRef.current) {
      containerRef.current.animate([
        { transform: 'translateX(0)' },
        { transform: 'translateX(-4px)' },
        { transform: 'translateX(4px)' },
        { transform: 'translateX(-4px)' },
        { transform: 'translateX(4px)' },
        { transform: 'translateX(0)' },
      ], { duration: 400, easing: 'ease-in-out' })
    }
  }, [shake])

  const orbitDuration = useMemo(() => {
    switch (state) {
      case 'thinking': return 9
      case 'celebrate': return 4
      case 'sleepy': return 24
      default: return 14
    }
  }, [state])

  const glowIntensity = useMemo(() => {
    switch (state) {
      case 'curious': return 1.1
      case 'thinking': return 0.9
      case 'celebrate': return 1.3
      case 'sad': return 0.7
      case 'sleepy': return 0.55
      default: return 1.0
    }
  }, [state])

  const shards = Array.from({ length: 7 })

  return (
    <motion.div
      ref={containerRef}
      data-testid="lumen-mascot"
      className="relative flex items-center justify-center cursor-pointer"
      style={{ width: size, height: size }}
      whileHover={interactive ? { scale: 1.04 } : {}}
      whileTap={interactive ? { scale: 0.93 } : {}}
      transition={{ type: 'spring', bounce: 0.5, duration: 0.5 }}
      onClick={onPoke}
    >
      {/* Glow Backdrop */}
      <motion.div 
        className="absolute inset-0 rounded-full"
        style={{ 
          background: `radial-gradient(circle, hsla(${hue}, 80%, 60%, 0.15) 0%, transparent 70%)`,
          scale: glowIntensity 
        }}
        animate={{ scale: [glowIntensity, glowIntensity * 1.05, glowIntensity] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Shard Belt */}
      <motion.div 
        className="absolute inset-0 z-0"
        animate={{ rotate: 360 }}
        transition={{ duration: orbitDuration, repeat: Infinity, ease: "linear" }}
      >
        {shards.map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-6 rounded-full bg-white/20 backdrop-blur-sm"
            style={{
              top: '50%',
              left: '50%',
              transform: `rotate(${i * (360 / 7)}deg) translateY(-${size / 2.2}px)`,
              opacity: state === 'sleepy' ? 0.3 : 0.6
            }}
          />
        ))}
      </motion.div>

      {/* Core Body */}
      <motion.div
        className="relative z-10"
        animate={{ 
          x: parallax.x, 
          y: parallax.y + (state === 'sleepy' ? Math.sin(Date.now() / 1000) * 5 : 0),
          scale: [1, 1.025, 1] 
        }}
        transition={{
          x: { type: 'spring', stiffness: 120, damping: 14, mass: 0.9 },
          y: { type: 'spring', stiffness: 120, damping: 14, mass: 0.9 },
          scale: { duration: 3, repeat: Infinity, ease: "easeInOut" }
        }}
      >
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 100 100" fill="none">
          <defs>
            <radialGradient id="lumen-gradient" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(50 50) rotate(90) scale(50)">
              <stop stopColor={`hsl(${hue}, 90%, 75%)`} />
              <stop offset="0.6" stopColor={`hsl(${hue}, 70%, 50%)`} />
              <stop offset="1" stopColor={`hsl(${hue}, 80%, 30%)`} />
            </radialGradient>
            <filter id="lumen-glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Nucleus */}
          <circle cx="50" cy="50" r="48" fill="url(#lumen-gradient)" filter="url(#lumen-glow)" />
          <circle cx="40" cy="35" r="12" fill="white" fillOpacity="0.2" />

          {/* Eyes & Mouth */}
          <g transform="translate(50, 50)">
            <LumenFace state={state} />
          </g>
        </svg>
      </motion.div>

      {/* Burst Shards (Celebrate) */}
      <AnimatePresence>
        {state === 'celebrate' && (
          <div data-testid="lumen-burst" className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 14 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                animate={{ 
                  scale: [0, 1, 0], 
                  x: Math.cos(i * (Math.PI * 2 / 14)) * (size / 1.5), 
                  y: Math.sin(i * (Math.PI * 2 / 14)) * (size / 1.5),
                  opacity: 0
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute top-1/2 left-1/2 w-1 h-4 bg-white rounded-full"
                style={{ rotate: i * (360 / 14) + 90 }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function LumenFace({ state }: { state: LumenState }) {
  const [blink, setBlink] = useState(false)

  useEffect(() => {
    if (state === 'sleepy') {
      setBlink(false)
      return
    }
    let cancelled = false
    const scheduleBlink = () => {
      setTimeout(() => {
        if (cancelled) return
        setBlink(true)
        setTimeout(() => {
          if (cancelled) return
          setBlink(false)
          scheduleBlink()
        }, 150)
      }, 2400 + Math.random() * 3200)
    }
    const initial = setTimeout(scheduleBlink, 1500)
    return () => {
      cancelled = true
      clearTimeout(initial)
      setBlink(false)
    }
  }, [state])

  if (blink && state !== 'sleepy') {
    return (
      <g>
        <rect x="-18" y="-5" width="12" height="2" rx="1" fill="white" />
        <rect x="6" y="-5" width="12" height="2" rx="1" fill="white" />
      </g>
    )
  }

  switch (state) {
    case 'curious':
      return (
        <g>
          <ellipse cx="-12" cy="-5" rx="7" ry="8" fill="white" />
          <ellipse cx="12" cy="-5" rx="7" ry="8" fill="white" />
          <path d="M-4 8 Q0 12 4 8" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </g>
      )
    case 'thinking':
      return (
        <g>
          <rect x="-18" y="-6" width="12" height="4" rx="2" fill="white" />
          <rect x="6" y="-6" width="12" height="4" rx="2" fill="white" />
          <path d="M-5 8 L5 8" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </g>
      )
    case 'celebrate':
      return (
        <g>
          <path d="M-18 -2 Q-12 -12 -6 -2" stroke="white" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d="M6 -2 Q12 -12 18 -2" stroke="white" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d="M-8 6 Q0 16 8 6" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      )
    case 'sad':
      return (
        <g>
          <ellipse cx="-12" cy="-5" rx="6" ry="7" fill="white" />
          <ellipse cx="12" cy="-5" rx="6" ry="7" fill="white" />
          <path d="M-5 12 Q0 8 5 12" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </g>
      )
    case 'sleepy':
      return (
        <g>
          <path d="M-18 -5 L-6 -5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M6 -5 L18 -5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
          <circle cx="0" cy="8" r="1.5" fill="white" />
          <motion.text
            x="25" y="-20"
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: [0, 1, 0], y: -20, x: [25, 35, 25] }}
            transition={{ duration: 3, repeat: Infinity }}
            fill="white"
            fontSize="12"
            fontWeight="bold"
            className="pointer-events-none select-none"
          >
            z
          </motion.text>
        </g>
      )
    default:
      return (
        <g>
          <ellipse cx="-12" cy="-5" rx="6" ry="7" fill="white" />
          <ellipse cx="12" cy="-5" rx="6" ry="7" fill="white" />
          <path d="M-5 10 Q0 13 5 10" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </g>
      )
  }
}
