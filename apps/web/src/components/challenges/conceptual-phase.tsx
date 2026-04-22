'use client';

import { useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface Props {
  phaseId: string;
  challengeId: string;
  question: string;
  onResult: (passed: boolean, achEarned: number) => void;
  onActivity: () => void;
  isPreview?: boolean;
}

type Status = 'idle' | 'checking' | 'passed' | 'failed';

export function ConceptualPhase({ phaseId, challengeId, question, onResult, onActivity, isPreview = false }: Props) {
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [feedback, setFeedback] = useState('');

  async function handleSubmit() {
    if (!answer.trim()) return;
    setStatus('checking');

    if (isPreview) {
      setTimeout(() => {
        setStatus('passed');
        setFeedback('¡Excelente respuesta! (Simulación de preview)');
        onResult(true, 10);
      }, 1000);
      return;
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/challenges/${challengeId}/phases/${phaseId}/submit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ content: answer }),
        },
      );
      const data = await res.json();
      setStatus(data.passed ? 'passed' : 'failed');
      setFeedback(data.feedback.replace(/^(APROBADO|REVISAR):\s*/, ''));
      if (data.passed) onResult(true, data.achEarned);
    } catch {
      setStatus('failed');
      setFeedback('Error al evaluar la respuesta');
    }
  }

  return (
    <div className="flex flex-col gap-4 text-left">
      <p className="text-white/80 text-base leading-relaxed">{question}</p>

      <textarea
        value={answer}
        onChange={e => { setAnswer(e.target.value); onActivity(); }}
        onKeyDown={onActivity}
        placeholder="Escribe tu respuesta aquí..."
        rows={5}
        disabled={status === 'passed'}
        className="w-full bento soft-stroke rounded-xl p-4 text-sm text-white/90
                   bg-white/[0.03] placeholder:text-white/30 resize-none
                   focus:outline-none focus:ring-1 focus:ring-[#E05BF5]/50"
      />

      {status !== 'passed' && (
        <button
          onClick={handleSubmit}
          disabled={!answer.trim() || status === 'checking'}
          className="self-start px-4 py-2 rounded-lg text-sm font-medium
                     bg-[#E05BF5] text-white disabled:opacity-40 hover:brightness-110 transition-all"
        >
          {status === 'checking' ? 'Evaluando...' : 'Enviar respuesta'}
        </button>
      )}

      {(status === 'passed' || status === 'failed') && (
        <div className={`flex items-start gap-2 text-sm p-3 rounded-lg ${
          status === 'passed' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-red-400/10 text-red-300'
        }`}>
          {status === 'passed' ? <CheckCircle size={14} className="mt-0.5 shrink-0" /> : <XCircle size={14} className="mt-0.5 shrink-0" />}
          <span>{feedback}</span>
        </div>
      )}
    </div>
  );
}
