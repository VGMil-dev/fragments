'use client';

import { useState } from 'react';
import { Check, Eye, EyeOff, Key } from 'lucide-react';
import { saveApiKeys } from '@/lib/settings-service';

interface Props {
  hasGoogleKey: boolean;
  hasOpenRouterKey: boolean;
}

export function ApiKeysForm({ hasGoogleKey: initialGoogle, hasOpenRouterKey: initialOR }: Props) {
  const [googleKey, setGoogleKey] = useState('');
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [showGoogle, setShowGoogle] = useState(false);
  const [showOR, setShowOR] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [hasGoogleKey, setHasGoogleKey] = useState(initialGoogle);
  const [hasORKey, setHasORKey] = useState(initialOR);

  async function handleSave() {
    setStatus('saving');
    try {
      await saveApiKeys(googleKey, openRouterKey);
      if (googleKey) setHasGoogleKey(true);
      if (openRouterKey) setHasORKey(true);
      setGoogleKey('');
      setOpenRouterKey('');
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2500);
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="flex flex-col gap-6 text-left">
      {/* Google AI Studio */}
      <div className="bento soft-stroke p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Key size={14} className="text-[#E05BF5]" />
          <span className="text-sm font-medium text-white">Google AI Studio</span>
          {hasGoogleKey && (
            <span className="flex items-center gap-1 text-[11px] text-emerald-400 ml-auto">
              <Check size={10} /> Configurada
            </span>
          )}
        </div>
        <p className="text-xs text-white/40">
          Obtén tu clave en{' '}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer"
             className="text-[#E05BF5] hover:underline">
            aistudio.google.com/apikey
          </a>
          {' '}— tier gratuito disponible.
        </p>
        <div className="relative">
          <input
            type={showGoogle ? 'text' : 'password'}
            value={googleKey}
            onChange={e => setGoogleKey(e.target.value)}
            placeholder={hasGoogleKey ? '••••••••••••••••••••••••••••••••' : 'AIzaSy...'}
            className="w-full bento soft-stroke rounded-lg px-4 py-2 pr-10 text-sm text-white/90
                       bg-white/[0.03] placeholder:text-white/20 focus:outline-none
                       focus:ring-1 focus:ring-[#E05BF5]/50"
          />
          <button
            type="button"
            onClick={() => setShowGoogle(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
          >
            {showGoogle ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      {/* OpenRouter */}
      <div className="bento soft-stroke p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Key size={14} className="text-amber-400" />
          <span className="text-sm font-medium text-white">OpenRouter</span>
          <span className="text-[11px] text-white/30 ml-1">(respaldo opcional)</span>
          {hasORKey && (
            <span className="flex items-center gap-1 text-[11px] text-emerald-400 ml-auto">
              <Check size={10} /> Configurada
            </span>
          )}
        </div>
        <p className="text-xs text-white/40">
          Clave de respaldo si Google AI falla. Obtén una en{' '}
          <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer"
             className="text-amber-400 hover:underline">
            openrouter.ai/keys
          </a>.
        </p>
        <div className="relative">
          <input
            type={showOR ? 'text' : 'password'}
            value={openRouterKey}
            onChange={e => setOpenRouterKey(e.target.value)}
            placeholder={hasORKey ? '••••••••••••••••••••••••••••••••' : 'sk-or-...'}
            className="w-full bento soft-stroke rounded-lg px-4 py-2 pr-10 text-sm text-white/90
                       bg-white/[0.03] placeholder:text-white/20 focus:outline-none
                       focus:ring-1 focus:ring-amber-400/50"
          />
          <button
            type="button"
            onClick={() => setShowOR(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
          >
            {showOR ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={(!googleKey && !openRouterKey) || status === 'saving'}
          className="px-5 py-2 rounded-lg bg-[#E05BF5] text-white text-sm font-medium
                     disabled:opacity-40 hover:brightness-110 transition-all"
        >
          {status === 'saving' ? 'Guardando...' : 'Guardar claves'}
        </button>
        {status === 'saved' && (
          <span className="flex items-center gap-1 text-emerald-400 text-sm">
            <Check size={14} /> Guardadas y encriptadas
          </span>
        )}
        {status === 'error' && (
          <span className="text-red-400 text-sm">Error al guardar. Intenta de nuevo.</span>
        )}
      </div>

      <p className="text-xs text-white/30 leading-relaxed">
        Tus claves se encriptan con AES-256-GCM antes de guardarse. Fragments nunca las usa para
        ningún otro propósito ni las comparte. Puedes cambiarlas en cualquier momento.
      </p>
    </div>
  );
}
