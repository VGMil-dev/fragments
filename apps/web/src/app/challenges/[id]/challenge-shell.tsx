'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import { Challenge } from '@/lib/challenges-service';
import { ConceptualPhase } from '@/components/challenges/conceptual-phase';
import { CodePhase } from '@/components/challenges/code-phase';
import { LumenHintTrigger } from '@/components/challenges/lumen-hint-trigger';

interface Props {
  challenge: Challenge;
  userLevel: number;
}

export function ChallengeShell({ challenge, userLevel }: Props) {
  const router = useRouter();
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [completedPhases, setCompletedPhases] = useState<Set<string>>(new Set());
  const [totalAch, setTotalAch] = useState(0);
  const [lastActivityAt, setLastActivityAt] = useState(Date.now());

  const currentPhase = challenge.phases[currentPhaseIndex];
  const isComplete = completedPhases.size === challenge.phases.length;

  const handleActivity = useCallback(() => {
    setLastActivityAt(Date.now());
  }, []);

  function handlePhaseResult(passed: boolean, achEarned: number) {
    if (!passed) return;
    setCompletedPhases(prev => new Set([...prev, currentPhase.id]));
    setTotalAch(prev => prev + achEarned);
    if (currentPhaseIndex < challenge.phases.length - 1) {
      setTimeout(() => setCurrentPhaseIndex(i => i + 1), 1200);
    }
  }

  const DIFFICULTY_LABEL = ['', 'Principiante', 'Básico', 'Intermedio', 'Avanzado', 'Experto'];

  return (
    <div className="min-h-screen bg-[var(--base)] p-8 text-left" onClick={handleActivity} onKeyDown={handleActivity}>
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => router.push('/challenges')}
          className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={14} /> Volver a retos
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs tracking-widest uppercase text-white/40">{challenge.topic}</span>
            <span className="text-xs text-white/40">{DIFFICULTY_LABEL[challenge.difficulty]}</span>
          </div>
          <h1 className="text-2xl font-semibold text-white">{challenge.title}</h1>
          <p className="text-white/50 mt-1 text-sm">{challenge.description}</p>
        </div>

        {/* Phase progress */}
        <div className="flex gap-2 mb-6">
          {challenge.phases.map((phase, i) => (
            <div
              key={phase.id}
              className={`h-1 flex-1 rounded-full transition-all ${
                completedPhases.has(phase.id)
                  ? 'bg-emerald-400'
                  : i === currentPhaseIndex
                  ? 'bg-[#E05BF5]'
                  : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        {isComplete ? (
          <div className="bento soft-stroke p-8 text-center">
            <CheckCircle size={48} className="text-emerald-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">¡Lumen aprendió algo nuevo!</h2>
            <p className="text-white/50 mb-4">Ganaste {totalAch} ACH en este reto</p>
            <button
              onClick={() => router.push('/challenges')}
              className="px-5 py-2 rounded-lg bg-[#E05BF5] text-white text-sm font-medium hover:brightness-110 transition-all"
            >
              Siguiente reto
            </button>
          </div>
        ) : (
          <div className="bento soft-stroke p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs tracking-widest uppercase text-white/40">
                {currentPhase.kind === 'conceptual' ? 'Fase conceptual' : 'Fase de código'}
              </span>
              <span className="text-xs text-white/30">
                {currentPhaseIndex + 1}/{challenge.phases.length}
              </span>
            </div>

            {currentPhase.kind === 'conceptual' ? (
              <ConceptualPhase
                phaseId={currentPhase.id}
                challengeId={challenge.id}
                question={(currentPhase.content as any).question ?? ''}
                onResult={handlePhaseResult}
                onActivity={handleActivity}
              />
            ) : (
              <CodePhase
                phaseId={currentPhase.id}
                challengeId={challenge.id}
                language={(currentPhase.content as any).language ?? 'python'}
                starter={(currentPhase.content as any).starter ?? ''}
                onResult={handlePhaseResult}
                onActivity={handleActivity}
              />
            )}
          </div>
        )}
      </div>

      {!isComplete && currentPhase && (
        <LumenHintTrigger
          challengeId={challenge.id}
          phaseId={currentPhase.id}
          userLevel={userLevel}
          lastActivityAt={lastActivityAt}
        />
      )}
    </div>
  );
}
