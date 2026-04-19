'use client'

import React, { useState } from 'react'
import { Reorder } from 'framer-motion'
import { Fragment, Lang, DICTIONARY } from '@/lib/dashboard-types'
import { FragmentCard } from './fragment-card'

interface DailyFragmentsCardProps {
  lang: Lang
  fragments: Fragment[]
  onOpen: (id: string) => void
}

export function DailyFragmentsCard({ lang, fragments: initialFragments, onOpen }: DailyFragmentsCardProps) {
  const [items, setItems] = useState(initialFragments)
  const dict = DICTIONARY[lang]

  return (
    <div className="col-span-1 row-span-1 p-8 rounded-3xl bg-white/[0.03] border border-white/5 flex flex-col gap-6 relative overflow-hidden">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-white/90">{dict.fragmentsToday}</h3>
        <button className="text-[10px] font-bold text-fuchsia-400 uppercase tracking-widest hover:text-fuchsia-300 transition-colors">
          {dict.viewAll}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        <Reorder.Group axis="y" values={items} onReorder={setItems} className="flex flex-col gap-3">
          {items.map((frag) => (
            <Reorder.Item key={frag.id} value={frag}>
              <FragmentCard 
                frag={frag} 
                lang={lang} 
                onOpen={() => onOpen(frag.id)} 
              />
            </Reorder.Item>
          ))}
        </Reorder.Group>
      </div>
      
    </div>
  )
}
