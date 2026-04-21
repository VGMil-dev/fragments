'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles, X } from 'lucide-react';

const INACTIVITY_MS = 45_000; // 45 seconds

interface Props {
  challengeId: string;
  phaseId: string;
  userLevel: number;
  lastActivityAt: number;
}

type TriggerState = 'hidden' | 'restless' | 'hint-available' | 'loading' | 'showing';

export function LumenHintTrigger({ challengeId, phaseId, userLevel, lastActivityAt }: Props) {
  const [state, setState] = useState<TriggerState>('hidden');
  const [hint, setHint] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState('hidden');

    timerRef.current = setTimeout(() => {
      setState('restless');
      setTimeout(() => setState('hint-available'), 3000);
    }, INACTIVITY_MS);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [lastActivityAt]);

  async function handleRequestHint() {
    setState('loading');
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/challenges/${challengeId}/phases/${phaseId}/hint`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ level: Math.min(userLevel, 5) }),
        },
      );
      const data = await res.json();
      setHint(data.hint);
      setState('showing');
    } catch {
      setState('hint-available');
    }
  }

  if (state === 'hidden') return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 text-right">
      {state === 'showing' && (
        <div className="bento soft-stroke p-4 max-w-sm text-sm text-white/80 leading-relaxed
                        animate-in slide-in-from-bottom-2 text-left">
          <div className="flex justify-between items-start gap-3 mb-2">
            <span className="text-xs text-[#D946EF] font-medium tracking-wider uppercase">Lumen dice</span>
            <button onClick={() => setState('hidden')} className="text-white/30 hover:text-white/60">
              <X size={12} />
            </button>
          </div>
          {hint}
        </div>
      )}

      {(state === 'restless' || state === 'hint-available') && (
        <div className="text-xs text-white/40 animate-pulse">
          {state === 'restless' ? 'Lumen parece inquieto...' : ''}
        </div>
      )}

      {state === 'hint-available' && (
        <button
          onClick={handleRequestHint}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
                     bg-[#E05BF5]/20 text-[#E05BF5] border border-[#E05BF5]/30
                     hover:bg-[#E05BF5]/30 transition-all animate-in slide-in-from-bottom-2"
        >
          <Sparkles size={14} />
          ¿Lumen quiere ayudarte?
        </button>
      )}

      {state === 'loading' && (
        <div className="text-xs text-white/40 animate-pulse">Lumen está pensando...</div>
      )}
    </div>
  );
}
