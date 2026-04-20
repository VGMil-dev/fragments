'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Lang, DashboardUser, WeekDay, DICTIONARY } from '@/lib/dashboard-types'
import { Flame } from 'lucide-react'

interface MomentumCardProps {
  lang: Lang
  user: DashboardUser
  week: WeekDay[]
}

export function MomentumCard({ lang, user, week }: MomentumCardProps) {
  const dict = DICTIONARY[lang]

  return (
    <div className="col-span-1 row-span-1 p-8 rounded-3xl bg-white/[0.03] border border-white/5 flex flex-col justify-between relative overflow-hidden">
      {/* Top row */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-semibold text-white/90 mb-1">{dict.momentumTitle}</h3>
          <p className="text-xs text-white/30 italic">{dict.momentumMuted}</p>
        </div>
        <div className="flex flex-col items-end">
          <Flame className="text-white/20 mb-1" size={20} />
          <motion.div 
            initial={{ scale: 0.7, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            className="text-4xl font-bold bg-gradient-to-br from-[#FBD48A] to-[#F59E0B] bg-clip-text text-transparent"
          >
            {user.streak}
          </motion.div>
          <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
            {dict.days} {dict.streak}
          </span>
        </div>
      </div>

      {/* Week Visualization */}
      <div className="flex flex-col gap-4">
        <div className="flex gap-2 h-12 items-end">
          {week.map((day, i) => (
            <div key={i} data-testid="momentum-segment" className="flex-1 flex flex-col items-center gap-2">
              <div className="relative w-full h-8 rounded-md bg-white/5 overflow-hidden">
                {day.done && (
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.08 * i, type: 'spring', stiffness: 100 }}
                    className={`absolute inset-0 origin-left ${day.deep ? 'bg-gradient-to-t from-[#F59E0B] to-[#FBD48A]' : 'bg-[#F59E0B]/40'}`}
                  />
                )}
                {day.today && (
                  <div className="absolute inset-0 border border-fuchsia-500/40 rounded-md" />
                )}
              </div>
              <span className={`text-[10px] font-bold ${day.today ? 'text-fuchsia-400' : 'text-white/20'}`}>
                {day.d}
              </span>
            </div>
          ))}
        </div>
        <p className="text-[13px] text-white/40 leading-tight">
          {lang === 'es' 
            ? `Has mantenido tu foco por ${user.streak} días consecutivos. La maestría está cerca.`
            : `You have maintained your focus for ${user.streak} consecutive days. Mastery is near.`}
        </p>
      </div>
    </div>
  )
}
