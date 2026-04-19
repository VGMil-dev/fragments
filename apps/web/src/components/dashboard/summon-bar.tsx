'use client'

import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ArrowRight } from 'lucide-react'
import { Lang, DICTIONARY } from '@/lib/dashboard-types'

interface SummonBarProps {
  lang: Lang
  hue?: number
}

export function SummonBar({ lang, hue = 292 }: SummonBarProps) {
  const [value, setValue] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const dict = DICTIONARY[lang]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!value.trim() || isGenerating) return
    
    setIsGenerating(true)
    // Simulate generation
    setTimeout(() => {
      setIsGenerating(false)
      setValue('')
    }, 2400)
  }

  return (
    <div className="relative">
      <form 
        onSubmit={handleSubmit}
        className={`
          relative flex items-center gap-4 p-2 pl-6 rounded-2xl bg-white/[0.03] border border-white/5 transition-all duration-500 overflow-hidden
          ${isGenerating ? 'opacity-80 cursor-wait' : 'focus-within:bg-white/[0.06] focus-within:border-fuchsia-500/40 focus-within:shadow-[inset_0_0_0_1px_rgba(217,70,239,0.4),0_0_40px_-10px_rgba(217,70,239,0.6)]'}
        `}
      >
        {/* Shimmer Overlay (Generating) */}
        <AnimatePresence>
          {isGenerating && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-0 pointer-events-none shimmer"
            />
          )}
        </AnimatePresence>

        <motion.div 
          animate={isGenerating ? { rotate: 360 } : {}}
          transition={isGenerating ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
          className="relative z-10 text-fuchsia-400/60"
        >
          <Sparkles size={20} />
        </motion.div>

        <input
          type="text"
          value={isGenerating ? dict.generating : value}
          onChange={(e) => setValue(e.target.value)}
          disabled={isGenerating}
          placeholder={lang === 'es' ? 'Describe lo que quieres aprender…' : 'Describe what you want to learn…'}
          className="flex-1 bg-transparent border-none focus:outline-none text-white placeholder:text-white/20 text-sm relative z-10"
        />

        <div className="hidden sm:block text-[10px] font-bold text-white/10 uppercase tracking-[0.2em] relative z-10">
          atracción, no obligación
        </div>

        <motion.button
          type="submit"
          disabled={!value.trim() || isGenerating}
          whileHover={value.trim() && !isGenerating ? { scale: 1.08 } : {}}
          whileTap={value.trim() && !isGenerating ? { scale: 0.92 } : {}}
          transition={{ type: 'spring', bounce: 0.5, duration: 0.4 }}
          className={`
            relative z-10 flex items-center justify-center w-10 h-10 rounded-xl transition-all
            ${value.trim() && !isGenerating ? 'bg-gradient-to-tr from-[#E05BF5] to-[#B33CDA] text-white shadow-lg shadow-fuchsia-500/20' : 'bg-white/5 text-white/10'}
          `}
        >
          {isGenerating ? (
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              ⋯
            </motion.span>
          ) : (
            <ArrowRight size={18} />
          )}
        </motion.button>
      </form>
    </div>
  )
}
