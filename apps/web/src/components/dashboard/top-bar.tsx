'use client'

import React from 'react'
import { Search, Bell } from 'lucide-react'
import { Lang, DashboardUser, DICTIONARY } from '@/lib/dashboard-types'

interface TopBarProps {
  lang: Lang
  user: DashboardUser
}

export function TopBar({ lang, user }: TopBarProps) {
  const dict = DICTIONARY[lang]

  return (
    <header className="flex items-center justify-between w-full">
      <div className="flex flex-col">
        <h2 className="text-[10px] font-mono tracking-[0.28em] uppercase text-white/30">
          Fragments
        </h2>
        <h1 className="text-xl font-semibold text-white/90">
          {dict.greeting.replace('{name}', user.name)}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Search Bar */}
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-fuchsia-400 transition-colors" size={16} />
          <input 
            type="text"
            placeholder={dict.searchPlaceholder}
            className="w-[340px] bg-white/[0.03] border border-white/5 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:bg-white/[0.06] focus:border-fuchsia-500/40 transition-all"
          />
        </div>

        {/* Notification Bell */}
        <button className="relative p-2 rounded-xl bg-white/[0.03] border border-white/5 text-white/40 hover:text-white/80 transition-colors">
          <Bell size={18} />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-fuchsia-500 border-2 border-[var(--base)]" />
        </button>
      </div>
    </header>
  )
}
