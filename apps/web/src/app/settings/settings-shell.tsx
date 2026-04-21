'use client';

import { ApiKeysForm } from '@/components/settings/api-keys-form';
import { KeysStatus } from '@/lib/settings-service';

interface Props {
  keysStatus: KeysStatus;
}

export function SettingsShell({ keysStatus }: Props) {
  return (
    <main className="min-h-screen bg-[var(--base)] p-8 text-left">
      <div className="max-w-xl mx-auto">
        <div className="mb-8">
          <p className="text-[11px] tracking-widest uppercase text-white/40 mb-1">Configuración</p>
          <h1 className="text-3xl font-semibold text-white">Claves de IA</h1>
          <p className="text-white/50 text-sm mt-2">
            Lumen usa IA para evaluar tus respuestas y darte pistas. Necesita tu clave personal
            para funcionar — así los costos son tuyos, no nuestros.
          </p>
        </div>
        <ApiKeysForm
          hasGoogleKey={keysStatus.hasGoogleKey}
          hasOpenRouterKey={keysStatus.hasOpenRouterKey}
        />
      </div>
    </main>
  );
}
