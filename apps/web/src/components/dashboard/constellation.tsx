'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ConstellationNode, Lang, DICTIONARY } from '@/lib/dashboard-types'
import { Compass, ArrowRight } from 'lucide-react'

interface ConstellationProps {
  lang: Lang
  nodes: ConstellationNode[]
  edges: [string, string][]
  onPick: (id: string) => void
}

export function Constellation({ lang, nodes, edges, onPick }: ConstellationProps) {
  const [activeId, setActiveId] = useState(nodes.find(n => n.active)?.id || nodes[0]?.id)
  const dict = DICTIONARY[lang]
  const activeNode = nodes.find(n => n.id === activeId)

  return (
    <div className="col-span-1 row-span-1 p-8 rounded-3xl bg-white/[0.03] border border-white/5 flex flex-col relative overflow-hidden group">
      {/* Background stars (ambient-grid) */}
      <div className="absolute inset-0 opacity-20 pointer-events-none ambient-grid stars" />

      {/* Header */}
      <div className="relative z-10 flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Compass className="text-white/20" size={16} />
          <span className="text-[10px] font-bold text-white/30 tracking-widest uppercase">
            {dict.constellationLabel}
          </span>
        </div>
        <div className="px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-[10px] font-medium text-white/40">
          TERMODINÁMICA
        </div>
      </div>

      {/* SVG Map */}
      <div className="relative flex-1 min-h-[200px]">
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {edges.map(([from, to], i) => {
            const startNode = nodes.find(n => n.id === from)
            const endNode = nodes.find(n => n.id === to)
            if (!startNode || !endNode) return null
            
            const isDone = startNode.done && endNode.done
            
            return (
              <line 
                key={i}
                x1={`${startNode.x}%`} y1={`${startNode.y}%`}
                x2={`${endNode.x}%`} y2={`${endNode.y}%`}
                stroke="white"
                strokeWidth={isDone ? 1 : 0.5}
                strokeOpacity={isDone ? 0.2 : 0.06}
                strokeDasharray={isDone ? "" : "4 4"}
              />
            )
          })}
        </svg>

        {nodes.map((node) => {
          const isActive = activeId === node.id
          
          return (
            <motion.button
              key={node.id}
              data-testid="constellation-node"
              data-active={isActive ? "true" : "false"}
              onClick={() => {
                setActiveId(node.id)
                onPick(node.id)
              }}
              whileHover={{ scale: 1.25 }}
              whileTap={{ scale: 0.88 }}
              transition={{ type: 'spring', bounce: 0.5, duration: 0.4 }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group/node"
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
            >
              <div 
                className={`
                  rounded-full transition-all duration-500 relative
                  ${node.core ? 'bg-gradient-to-br from-fuchsia-400 to-fuchsia-600 shadow-[0_0_20px_rgba(217,70,239,0.4)]' : ''}
                  ${!node.core && node.done ? 'bg-white/20' : ''}
                  ${!node.core && !node.done ? 'bg-white/5 border border-white/5' : ''}
                  ${isActive ? 'ring-2 ring-fuchsia-500 ring-offset-4 ring-offset-transparent' : ''}
                `}
                style={{ width: node.size, height: node.size }}
              >
                {isActive && (
                  <motion.div 
                    layoutId="constellation-glow"
                    className="absolute inset-0 rounded-full bg-fuchsia-500/20 blur-xl"
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </div>
              
              {/* Tooltip on hover */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 rounded bg-black/80 backdrop-blur-sm border border-white/10 text-[9px] font-bold text-white whitespace-nowrap opacity-0 group-hover/node:opacity-100 transition-opacity pointer-events-none">
                {node.label.toUpperCase()}
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Active Node Detail */}
      <div className="relative z-10 mt-auto flex items-end justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Enfoque actual</span>
          <h4 className="text-lg font-semibold text-white tracking-tight leading-none">
            {activeNode?.label}
          </h4>
        </div>
        <motion.button 
          whileHover={{ x: 4 }}
          className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-white/40 hover:text-white/80 transition-all"
        >
          <ArrowRight size={18} />
        </motion.button>
      </div>
    </div>
  )
}
