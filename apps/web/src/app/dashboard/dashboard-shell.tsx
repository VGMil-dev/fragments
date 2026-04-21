'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sidebar } from '@/components/dashboard/sidebar'
import { TopBar } from '@/components/dashboard/top-bar'
import { CompanionCard } from '@/components/dashboard/companion-card'
import { MomentumCard } from '@/components/dashboard/momentum-card'
import { DailyFragmentsCard } from '@/components/dashboard/daily-fragments-card'
import { Constellation } from '@/components/dashboard/constellation'
import { SummonBar } from '@/components/dashboard/summon-bar'
import { SessionDock } from '@/components/dashboard/session-dock'
import { AmbientParticles } from '@/components/ambient-particles'
import { DashboardData, DashboardUser, Lang, LumenState, LumenEconomy } from '@/lib/dashboard-types'

interface DashboardShellProps {
  initialData: DashboardData
  user: DashboardUser
  economy: LumenEconomy
}

export default function DashboardShell({ initialData, user, economy }: DashboardShellProps) {
  const [lang, setLang] = useState<Lang>('es')
  const [mascotState, setMascotState] = useState<LumenState>('idle')
  const [sessionOpen, setSessionOpen] = useState(false)
  const [activeNav, setActiveNav] = useState('dashboard')
  // Load lang from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('frag-lang') as Lang
    if (saved) setLang(saved)
  }, [])

  // Persist lang
  useEffect(() => {
    localStorage.setItem('frag-lang', lang)
  }, [lang])

  // Inactivity timer
  useEffect(() => {
    let timer: NodeJS.Timeout
    const reset = () => {
      if (mascotState === 'sleepy') setMascotState('idle')
      clearTimeout(timer)
      timer = setTimeout(() => setMascotState('sleepy'), 45000)
    }

    window.addEventListener('mousemove', reset)
    window.addEventListener('keydown', reset)
    reset()

    return () => {
      window.removeEventListener('mousemove', reset)
      window.removeEventListener('keydown', reset)
      clearTimeout(timer)
    }
  }, [mascotState])

  const handlePoke = () => {
    setMascotState('celebrate')
    setTimeout(() => setMascotState('idle'), 1000)
  }

  const handleFeed = () => {
    setMascotState('curious')
    setTimeout(() => setMascotState('idle'), 1200)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--base)] text-white font-sans selection:bg-fuchsia-500/30">
      <AmbientParticles />
      
      <Sidebar 
        lang={lang} 
        setLang={setLang} 
        user={user} 
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        onInvoke={() => {}} 
      />

      <main className="flex-1 overflow-y-auto p-8 flex flex-col gap-8 custom-scrollbar relative">
        <TopBar lang={lang} user={user} />

        <div className="grid grid-cols-2 gap-6 auto-rows-[340px]">
          <CompanionCard 
            lang={lang}
            user={user}
            economy={economy}
            mascotState={mascotState}
            onPoke={handlePoke}
            onFeed={handleFeed}
            onPlay={() => setSessionOpen(true)}
          />
          
          <MomentumCard 
            lang={lang}
            user={user}
            week={initialData.week}
          />

          <DailyFragmentsCard 
            lang={lang}
            fragments={initialData.fragments}
            onOpen={() => setSessionOpen(true)}
          />

          <Constellation 
            lang={lang}
            nodes={initialData.constellation}
            edges={initialData.edges}
            onPick={() => {}}
          />
        </div>

        <div className="mt-auto">
          <SummonBar lang={lang} />
        </div>

        <AnimatePresence>
          {sessionOpen && (
            <SessionDock 
              lang={lang}
              onClose={() => setSessionOpen(false)}
              setMascotState={setMascotState}
            />
          )}
        </AnimatePresence>
      </main>

    </div>
  )
}
