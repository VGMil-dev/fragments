'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Save, Send, Code, Lightbulb, Type } from 'lucide-react';
import { ChallengeShell } from '@/components/challenges/challenge-shell';
import { Challenge } from '@/lib/challenges-service';

export default function NewChallengePage() {
  const router = useRouter();
  const [challenge, setChallenge] = useState<Partial<Challenge>>({
    title: '',
    description: '',
    difficulty: 1,
    topic: 'Programación',
    phases: [],
  });

  const [saving, setSaving] = useState(false);

  function addPhase(kind: 'conceptual' | 'code') {
    const newPhase = {
      id: `temp-${Date.now()}`,
      kind,
      order_index: (challenge.phases?.length || 0),
      content: kind === 'conceptual' ? { question: '' } : { language: 'python', starter: '' },
      hints: [],
    };
    setChallenge(prev => ({ ...prev, phases: [...(prev.phases || []), newPhase] as any }));
  }

  function updatePhase(index: number, content: any) {
    const newPhases = [...(challenge.phases || [])];
    newPhases[index] = { ...newPhases[index], content: { ...newPhases[index].content, ...content } };
    setChallenge(prev => ({ ...prev, phases: newPhases }));
  }

  function removePhase(index: number) {
    const newPhases = (challenge.phases || []).filter((_, i) => i !== index);
    setChallenge(prev => ({ ...prev, phases: newPhases }));
  }

  async function handleSave(status: 'draft' | 'published') {
    setSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/challenges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...challenge, status }),
      });
      if (res.ok) {
        router.push('/teacher/challenges');
      }
    } catch (error) {
      console.error('Error saving challenge:', error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-screen bg-[var(--base)] overflow-hidden">
      {/* Editor Panel */}
      <div className="w-1/2 overflow-y-auto p-8 border-r border-white/5 custom-scrollbar">
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-semibold text-white">Nuevo Reto</h1>
          <div className="flex gap-2">
            <button
              onClick={() => handleSave('draft')}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-white/5 text-white/70 text-sm hover:bg-white/10 transition-all flex items-center gap-2"
            >
              <Save size={16} /> Guardar borrador
            </button>
            <button
              onClick={() => handleSave('published')}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-[#E05BF5] text-white text-sm font-medium hover:brightness-110 transition-all flex items-center gap-2"
            >
              <Send size={16} /> Publicar
            </button>
          </div>
        </header>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-white/40">Título</label>
            <input
              type="text"
              value={challenge.title}
              onChange={e => setChallenge(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ej: El misterio de los bucles"
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder:text-white/20 focus:outline-none focus:border-[#E05BF5]/50 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-white/40">Descripción</label>
            <textarea
              value={challenge.description}
              onChange={e => setChallenge(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Explica de qué trata este reto..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder:text-white/20 focus:outline-none focus:border-[#E05BF5]/50 transition-all resize-none"
            />
          </div>

          <div className="flex gap-6">
            <div className="flex-1 space-y-2">
              <label className="text-xs uppercase tracking-widest text-white/40">Tema</label>
              <input
                type="text"
                value={challenge.topic}
                onChange={e => setChallenge(prev => ({ ...prev, topic: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#E05BF5]/50 transition-all"
              />
            </div>
            <div className="w-1/3 space-y-2">
              <label className="text-xs uppercase tracking-widest text-white/40">Dificultad (1-5)</label>
              <input
                type="number"
                min="1"
                max="5"
                value={challenge.difficulty}
                onChange={e => setChallenge(prev => ({ ...prev, difficulty: parseInt(e.target.value) }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#E05BF5]/50 transition-all"
              />
            </div>
          </div>

          <div className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-white/70 uppercase tracking-widest">Fases</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => addPhase('conceptual')}
                  className="p-2 rounded-lg bg-white/5 text-white/50 hover:text-white/90 hover:bg-white/10 transition-all"
                  title="Agregar fase conceptual"
                >
                  <Type size={18} />
                </button>
                <button
                  onClick={() => addPhase('code')}
                  className="p-2 rounded-lg bg-white/5 text-white/50 hover:text-white/90 hover:bg-white/10 transition-all"
                  title="Agregar fase de código"
                >
                  <Code size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {challenge.phases?.map((phase, i) => (
                <div key={phase.id} className="bento soft-stroke p-4 space-y-4 relative group">
                  <button
                    onClick={() => removePhase(i)}
                    className="absolute top-4 right-4 text-white/20 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#E05BF5] bg-[#E05BF5]/10 px-2 py-0.5 rounded">
                      Fase {i + 1}: {phase.kind === 'conceptual' ? 'Conceptual' : 'Código'}
                    </span>
                  </div>

                  {phase.kind === 'conceptual' ? (
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-white/30">Pregunta</label>
                      <textarea
                        value={(phase.content as any).question}
                        onChange={e => updatePhase(i, { question: e.target.value })}
                        placeholder="¿Qué hace la función print()?"
                        rows={2}
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#E05BF5]/50 transition-all resize-none"
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest text-white/30">Lenguaje</label>
                        <select
                          value={(phase.content as any).language}
                          onChange={e => updatePhase(i, { language: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none"
                        >
                          <option value="python">Python</option>
                          <option value="javascript">JavaScript</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest text-white/30">Código inicial</label>
                        <textarea
                          value={(phase.content as any).starter}
                          onChange={e => updatePhase(i, { starter: e.target.value })}
                          placeholder="# Escribe aquí..."
                          rows={4}
                          className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-xs font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-[#E05BF5]/50 transition-all resize-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {(!challenge.phases || challenge.phases.length === 0) && (
                <div className="border-2 border-dashed border-white/5 rounded-2xl p-12 text-center text-white/20">
                  <Plus className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Agrega una fase para comenzar</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Preview Panel */}
      <div className="w-1/2 bg-[var(--base)] relative">
        <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
          <ChallengeShell
            challenge={challenge as Challenge}
            userLevel={1}
            isPreview={true}
          />
        </div>
      </div>
    </div>
  );
}
