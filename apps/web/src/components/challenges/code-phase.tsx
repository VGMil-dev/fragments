'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Play, CheckCircle, XCircle } from 'lucide-react';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface Props {
  phaseId: string;
  challengeId: string;
  language: string;
  starter: string;
  onResult: (passed: boolean, achEarned: number) => void;
  onActivity: () => void;
  isPreview?: boolean;
}

type Status = 'idle' | 'running' | 'passed' | 'failed';

export function CodePhase({ phaseId, challengeId, language, starter, onResult, onActivity, isPreview = false }: Props) {
  const [code, setCode] = useState(starter);
  const [status, setStatus] = useState<Status>('idle');
  const [feedback, setFeedback] = useState('');

  async function handleSubmit() {
    setStatus('running');

    if (isPreview) {
      setTimeout(() => {
        setStatus('passed');
        setFeedback('¡Código correcto! (Simulación de preview)');
        onResult(true, 20);
      }, 1500);
      return;
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/challenges/${challengeId}/phases/${phaseId}/submit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ content: code }),
        },
      );
      const data = await res.json();
      setStatus(data.passed ? 'passed' : 'failed');
      setFeedback(data.feedback);
      if (data.passed) onResult(true, data.achEarned);
    } catch {
      setStatus('failed');
      setFeedback('Error al ejecutar el código');
    }
  }

  return (
    <div className="flex flex-col gap-4 text-left">
      <div className="bento soft-stroke overflow-hidden rounded-xl" onKeyDown={onActivity} onClick={onActivity}>
        <MonacoEditor
          height="300px"
          language={language}
          value={code}
          onChange={v => { setCode(v ?? ''); onActivity(); }}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={status === 'running'}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                     bg-[#E05BF5] text-white disabled:opacity-50 hover:brightness-110 transition-all"
        >
          <Play size={14} />
          {status === 'running' ? 'Ejecutando...' : 'Ejecutar'}
        </button>

        {status === 'passed' && (
          <span className="flex items-center gap-1 text-emerald-400 text-sm">
            <CheckCircle size={14} /> Todos los tests pasaron
          </span>
        )}
        {status === 'failed' && (
          <span className="flex items-center gap-1 text-red-400 text-sm text-left">
            <XCircle size={14} className="shrink-0" /> {feedback}
          </span>
        )}
      </div>
    </div>
  );
}
