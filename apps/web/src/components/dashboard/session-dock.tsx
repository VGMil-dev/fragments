'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lumen } from './lumen'
import { Lang, LumenState, DICTIONARY } from '@/lib/dashboard-types'
import { X, Check, ArrowRight, AlertCircle } from 'lucide-react'

interface SessionDockProps {
  lang: Lang
  hue?: number
  onClose: () => void
  setMascotState: (state: LumenState) => void
}

const SAMPLE_Q = {
  id: 'q1',
  title: {
    es: '¿Cuál es el principio fundamental de la termodinámica que rige el deseo según el fragmento?',
    en: 'What is the fundamental principle of thermodynamics that governs desire according to the fragment?'
  },
  options: [
    { id: 'a', text: { es: 'Entropía negativa', en: 'Negative Entropy' }, correct: false },
    { id: 'b', text: { es: 'Equilibrio térmico', en: 'Thermal Equilibrium' }, correct: true },
    { id: 'c', text: { es: 'Inercia absoluta', en: 'Absolute Inertia' }, correct: false },
    { id: 'd', text: { es: 'Radiación de fondo', en: 'Background Radiation' }, correct: false },
  ]
}

export function SessionDock({ lang, hue = 292, onClose, setMascotState }: SessionDockProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'checking' | 'correct' | 'wrong'>('idle')
  const [toast, setToast] = useState(false)
  const dict = DICTIONARY[lang]

  const handleSubmit = async () => {
    if (!selected || status === 'checking') return

    setStatus('checking')
    setMascotState('thinking')

    await new Promise(resolve => setTimeout(resolve, 650))

    const isCorrect = SAMPLE_Q.options.find(o => o.id === selected)?.correct

    if (isCorrect) {
      setStatus('correct')
      setMascotState('celebrate')
      setTimeout(() => {
        setMascotState('idle')
        setStatus('idle')
        setSelected(null)
      }, 1400)
    } else {
      setStatus('wrong')
      setMascotState('sad')
      setToast(true)
      setTimeout(() => {
        setMascotState('idle')
        setStatus('idle')
        setToast(false)
      }, 1600)
    }
  }

  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 40, opacity: 0 }}
      className="fixed bottom-6 left-[280px] right-6 z-50 p-8 rounded-3xl bg-[var(--base)] border border-white/10 shadow-2xl shadow-black/50"
    >
      {/* Top Line Gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <button
        data-testid="session-dock-close"
        onClick={onClose}
        className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 text-white/20 hover:text-white transition-colors"
      >
        <X size={20} />
      </button>

      <div className="grid grid-cols-[1fr_auto] gap-12 items-center">
        {/* Question Area */}
        <div className="flex flex-col gap-8">
          <div className="flex items-center gap-4">
            <div className="px-3 py-1 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 text-[10px] font-bold text-fuchsia-400 uppercase tracking-widest">
              Pregunta 3/5
            </div>
            <div className="text-[10px] font-mono text-white/20 uppercase tracking-widest">
              03:42 / 07:00
            </div>
          </div>

          <h3 className="text-2xl font-semibold text-white/90 leading-tight max-w-[600px]">
            {SAMPLE_Q.title[lang]}
          </h3>

          <div className="grid grid-cols-2 gap-4">
            {SAMPLE_Q.options.map((opt) => {
              const isSelected = selected === opt.id
              const isCorrect = status === 'correct' && opt.correct
              const isWrong = status === 'wrong' && isSelected

              return (
                <button
                  key={opt.id}
                  onClick={() => status === 'idle' && setSelected(opt.id)}
                  disabled={status !== 'idle'}
                  className={`
                    relative flex items-center justify-between p-4 rounded-xl border transition-all text-left
                    ${isSelected && status === 'idle' ? 'bg-white/[0.08] border-white/20' : 'bg-white/[0.03] border-white/5'}
                    ${isCorrect ? 'bg-[#34D399]/18 border-[#34D399]/30 text-[#B8F0D8]' : ''}
                    ${isWrong ? 'bg-[#FB7185]/18 border-[#FB7185]/30 text-[#FBB6BE] animate-shake' : ''}
                    ${status === 'idle' ? 'hover:bg-white/[0.06] hover:border-white/10' : ''}
                  `}
                >
                  <span className="text-sm font-medium">{opt.text[lang]}</span>
                  {isCorrect && <Check size={16} />}
                  {isWrong && <X size={16} />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Mascot & Actions */}
        <div className="flex flex-col items-center gap-6">
          <Lumen 
            state={status === 'checking' ? 'thinking' : status === 'correct' ? 'celebrate' : status === 'wrong' ? 'sad' : 'idle'} 
            size={160} 
            interactive={false} 
          />
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={!selected || status !== 'idle'}
            className={`
              w-48 py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all
              ${selected && status === 'idle' ? 'bg-white text-black shadow-xl' : 'bg-white/5 text-white/20 cursor-not-allowed'}
              ${status === 'correct' ? 'bg-[#34D399] text-white' : ''}
              ${status === 'wrong' ? 'bg-[#FB7185] text-white' : ''}
            `}
          >
            {status === 'checking' ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                <ArrowRight size={20} />
              </motion.div>
            ) : status === 'correct' ? (
              dict.correct
            ) : (
              <>{lang === 'es' ? 'Enviar respuesta' : 'Submit answer'} <ArrowRight size={18} /></>
            )}
          </motion.button>
        </div>
      </div>

      {/* Wrong Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute bottom-6 right-6 p-4 rounded-2xl bg-[#FB7185]/15 border border-[#FB7185]/30 backdrop-blur-xl flex items-center gap-3 shadow-lg shadow-[#FB7185]/10"
          >
            <AlertCircle className="text-[#FB7185]" size={20} />
            <div>
              <p className="text-[#FBB6BE] text-sm font-bold">{dict.tryAgain}</p>
              <p className="text-[#FBB6BE]/60 text-[11px] font-medium">{dict.shake_err}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  )
}
