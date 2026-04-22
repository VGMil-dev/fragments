'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Lang, DashboardUser, DICTIONARY } from '@/lib/dashboard-types'
import { 
  LayoutDashboard, 
  BrainCircuit, 
  Zap, 
  Wind, 
  Settings, 
  Library, 
  Archive, 
  LogOut,
  Sparkles
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

interface SidebarProps {
  lang: Lang
  setLang: (lang: Lang) => void
  user: DashboardUser
  activeNav: string
  setActiveNav: (id: string) => void
  onInvoke: () => void
}

const NAV_ITEMS = [
  { id: 'dashboard', icon: LayoutDashboard, label: { es: 'Dashboard', en: 'Dashboard' }, href: '/dashboard' },
  { id: 'intel', icon: BrainCircuit, label: { es: 'Inteligencia', en: 'Intelligence' }, href: '/challenges' },
  { id: 'momentum', icon: Zap, label: { es: 'Momentum', en: 'Momentum' }, href: '#' },
  { id: 'flow', icon: Wind, label: { es: 'Flujo', en: 'Flow' }, href: '#' },
  { id: 'settings', icon: Settings, label: { es: 'Ajustes', en: 'Settings' }, href: '/settings' },
]

const TEACHER_NAV = [
  { id: 'admin-challenges', icon: Library, label: { es: 'Retos (Admin)', en: 'Challenges (Admin)' }, href: '/teacher/challenges/new' },
  { id: 'analytics', icon: Sparkles, label: { es: 'Analytics', en: 'Analytics' }, href: '/teacher/analytics' },
]

const SECONDARY_NAV = [
  { id: 'library', icon: Library, label: { es: 'Biblioteca', en: 'Library' } },
  { id: 'archive', icon: Archive, label: { es: 'Archivo', en: 'Archive' } },
]

export function Sidebar({ 
  lang, 
  setLang, 
  user, 
  activeNav, 
  setActiveNav, 
  onInvoke 
}: SidebarProps) {
  const router = useRouter()
  const dict = DICTIONARY[lang]

  const handleLogout = async () => {
    await authClient.signOut()
    router.push('/login')
  }

  const primaryNav = user.role === 'teacher' ? [...NAV_ITEMS, ...TEACHER_NAV] : NAV_ITEMS

  return (
    <aside className="w-[240px] shrink-0 h-screen bg-[var(--base)] border-r border-white/5 flex flex-col p-5 gap-8 overflow-y-auto">
      {/* Identity */}
      <div className="flex items-center gap-3 px-2">
        <motion.div 
          className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#E05BF5] to-[#B33CDA]"
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        />
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white leading-none">Fragments</h1>
          <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Curador digital</p>
        </div>
      </div>

      {/* User Mini-Card */}
      <motion.div 
        whileHover={{ scale: 1.01 }}
        className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-lg font-medium text-white/80">
          {user.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{user.name}</p>
          <p className="text-[11px] text-white/40 truncate">
            {user.role === 'teacher' ? 'Docente' : `${dict.level} ${user.level} · ${dict.alma}`}
          </p>
        </div>
      </motion.div>

      {/* Primary Nav */}
      <nav className="flex flex-col gap-1">
        {primaryNav.map((item) => {
          const isActive = activeNav === item.id
          return (
            <Link 
              key={item.id} 
              href={item.href}
              onClick={() => setActiveNav(item.id)}
            >
              <motion.div
                whileHover={{ x: 6, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', bounce: 0.4, duration: 0.4 }}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg transition-colors relative
                  ${isActive ? 'bg-white/[0.06] text-white' : 'text-white/50 hover:text-white/80'}
                `}
              >
                <item.icon size={18} />
                <span className="text-sm font-medium">{item.label[lang]}</span>
                {isActive && (
                  <motion.div 
                    layoutId="active-nav-dot"
                    className="absolute right-3 w-1 h-1 rounded-full bg-white" 
                  />
                )}
              </motion.div>
            </Link>
          )
        })}
      </nav>

      {/* Invocar IA Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', bounce: 0.5, duration: 0.4 }}
        onClick={onInvoke}
        className="mt-2 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-tr from-[#E05BF5] to-[#B33CDA] text-white font-semibold text-sm shadow-lg shadow-fuchsia-500/20"
      >
        <Sparkles size={16} />
        {dict.invoke}
      </motion.button>

      {/* Secondary Nav */}
      <div className="flex flex-col gap-1 mt-auto">
        {SECONDARY_NAV.map((item) => (
          <div 
            key={item.id}
            className="flex items-center gap-3 px-3 py-2 text-white/40 hover:text-white/60 cursor-not-allowed transition-colors"
          >
            <item.icon size={16} />
            <span className="text-xs font-medium">{item.label[lang]}</span>
          </div>
        ))}

        {/* Lang Toggle */}
        <div className="flex items-center bg-white/[0.03] border border-white/5 p-1 rounded-lg mt-4 mb-2">
          {(['es', 'en'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`
                flex-1 py-1 text-[10px] font-bold uppercase rounded transition-colors
                ${lang === l ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50'}
              `}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 text-white/40 hover:text-white/80 hover:bg-white/[0.03] rounded-lg transition-all"
        >
          <LogOut size={16} />
          <span className="text-xs font-medium uppercase tracking-wider">Logout</span>
        </button>
      </div>
    </aside>
  )
}
