'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Fragment, Lang } from '@/lib/dashboard-types'
import { Clock, Pin, Play, GripVertical } from 'lucide-react'

interface FragmentCardProps {
  frag: Fragment
  lang: Lang
  onOpen: () => void
  testId?: string
}

export function FragmentCard({ frag, lang, onOpen, testId }: FragmentCardProps) {
  const toneColors = {
    magic: 'bg-[#D946EF]',
    success: 'bg-[#34D399]',
    streak: 'bg-[#F59E0B]',
    mute: 'bg-transparent'
  }

  const toneGlows = {
    magic: 'shadow-[0_0_15px_-3px_rgba(217,70,239,0.3)]',
    success: 'shadow-[0_0_15px_-3px_rgba(52,211,153,0.3)]',
    streak: 'shadow-[0_0_15px_-3px_rgba(245,158,11,0.3)]',
    mute: ''
  }

  return (
    <motion.div
      data-testid={testId ?? `fragment-card-${frag.id}`}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', bounce: 0.4, duration: 0.5 }}
      className={`
        relative flex items-center gap-4 p-3 rounded-xl bg-white/[0.03] border border-white/5 group cursor-pointer
        ${frag.tone !== 'mute' ? `hover:bg-white/[0.05] ${toneGlows[frag.tone]}` : 'hover:bg-white/[0.05]'}
      `}
      onClick={onOpen}
    >
      {/* Tone Strip */}
      <div className={`absolute left-0 top-3 bottom-3 w-[2px] rounded-full ${toneColors[frag.tone]} opacity-40`} />

      {/* Grip Handle (visible on hover) */}
      <div className="text-white/10 group-hover:text-white/30 transition-colors">
        <GripVertical size={16} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest bg-white/5 px-1.5 py-0.5 rounded">
            {frag.kind[lang]}
          </span>
          <span className="text-[10px] font-medium text-white/20">
            • {frag.tag[lang]}
          </span>
        </div>
        <h4 className="text-sm font-medium text-white/90 truncate">{frag.title[lang]}</h4>
        
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1 text-[10px] text-white/30 font-bold">
            <Clock size={10} />
            {frag.minutes} MIN
          </div>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4].map((d) => (
              <div 
                key={d} 
                className={`w-1 h-1 rounded-full ${d <= frag.depth ? 'bg-white/40' : 'bg-white/10'}`} 
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right Side: Progress or Play */}
      <div className="flex items-center gap-3">
        {frag.pinned && (
          <span data-testid="pin-indicator">
            <Pin size={12} className="text-fuchsia-400 rotate-45" />
          </span>
        )}

        {frag.progress > 0 && frag.progress < 1 ? (
          <div data-testid="progress-ring" className="relative w-8 h-8">
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="16" cy="16" r="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-white/5"
              />
              <motion.circle
                cx="16" cy="16" r="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="88"
                initial={{ strokeDashoffset: 88 }}
                animate={{ strokeDashoffset: 88 - (88 * frag.progress) }}
                className="text-fuchsia-500"
              />
            </svg>
          </div>
        ) : (
          <motion.div
            data-testid="play-button"
            whileHover={{ rotate: 6 }}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-white/40 group-hover:text-white/80 transition-colors"
          >
            <Play size={14} fill="currentColor" />
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
