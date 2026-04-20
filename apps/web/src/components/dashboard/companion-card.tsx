'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Lumen } from './lumen'
import { Lang, DashboardUser, LumenState, DICTIONARY } from '@/lib/dashboard-types'
import { Sparkles, Play } from 'lucide-react'

interface CompanionCardProps {
  lang: Lang
  user: DashboardUser
  mascotState: LumenState
  hue?: number
  onPoke: () => void
  onFeed: () => void
  onPlay: () => void
}

export function CompanionCard({
  lang,
  user,
  mascotState,
  hue = 292,
  onPoke,
  onFeed,
  onPlay
}: CompanionCardProps) {
  const dict = DICTIONARY[lang]

  return (
    <div className="col-span-1 row-span-1 p-8 rounded-3xl bg-white/[0.03] border border-white/5 relative overflow-hidden group">
      {/* Ambient Grid Background */}
      <div className="absolute inset-0 opacity-[0.35] pointer-events-none ambient-grid" />

      <div className="relative z-10 grid grid-cols-[1fr_auto] h-full items-center gap-8">
        {/* Content */}
        <div className="flex flex-col h-full justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500 animate-pulse" />
              <span className="text-[10px] font-bold tracking-widest text-fuchsia-400 uppercase">
                {dict.activeCompanion}
              </span>
            </div>
            
            <h2 className="text-5xl font-semibold text-white mb-4 tracking-tight">Lumen</h2>
            <p className="text-white/60 text-sm leading-relaxed max-w-[240px]">
              {dict.lumenStatus[mascotState]}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <span className="text-[10px] font-bold text-white/30 tracking-widest uppercase">
              {dict.cost}
            </span>
            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: 'spring', bounce: 0.5, duration: 0.4 }}
                onClick={onFeed}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-tr from-[#E05BF5] to-[#B33CDA] text-white text-xs font-bold shadow-lg shadow-fuchsia-500/20"
              >
                {dict.feed}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: 'spring', bounce: 0.5, duration: 0.4 }}
                onClick={onPlay}
                className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold hover:bg-white/10 transition-colors"
              >
                {dict.play}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Mascot */}
        <div className="relative">
          {/* Dashed Orbit Ring */}
          <motion.div 
            className="absolute inset-0 -m-8 border border-dashed border-white/10 rounded-full pointer-events-none"
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          />
          <Lumen 
            state={mascotState} 
            hue={hue} 
            size={220} 
            onPoke={onPoke} 
          />
        </div>
      </div>
    </div>
  )
}
