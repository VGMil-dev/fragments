'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { authClient } from '@/lib/auth-client';
import { Activity, CheckCircle, XCircle, Clock, User } from 'lucide-react';

interface AnalyticsEvent {
  userId: string;
  challengeId: string;
  challengeTitle: string;
  phaseId: string;
  passed: boolean;
  timestamp: string;
}

export default function AnalyticsPage() {
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    let s: Socket;
    async function initSocket() {
      const { data: session } = await authClient.getSession();
      if (!session) return;

      s = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');
      
      s.on('connect', () => {
        console.log('Connected to analytics socket');
        s.emit('join:teacher', session.user.id);
      });

      s.on('analytics:submission', (event: AnalyticsEvent) => {
        setEvents(prev => [event, ...prev].slice(0, 50));
      });

      setSocket(s);
    }

    initSocket();

    return () => {
      if (s) s.disconnect();
    };
  }, []);

  return (
    <div className="p-8 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Monitoreo en Vivo</h1>
          <p className="text-white/50 text-sm">Seguimiento en tiempo real del progreso estudiantil</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/10 text-emerald-400 text-xs font-medium border border-emerald-400/20">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Sistema activo
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bento soft-stroke p-6">
          <div className="text-white/40 text-xs uppercase tracking-widest mb-1">Entregas Hoy</div>
          <div className="text-3xl font-bold text-white">{events.length}</div>
        </div>
        <div className="bento soft-stroke p-6">
          <div className="text-white/40 text-xs uppercase tracking-widest mb-1">% Aprobación</div>
          <div className="text-3xl font-bold text-white">
            {events.length > 0 
              ? Math.round((events.filter(e => e.passed).length / events.length) * 100) 
              : 0}%
          </div>
        </div>
        <div className="bento soft-stroke p-6">
          <div className="text-white/40 text-xs uppercase tracking-widest mb-1">Retos Activos</div>
          <div className="text-3xl font-bold text-white">
            {new Set(events.map(e => e.challengeId)).size}
          </div>
        </div>
      </div>

      <div className="bento soft-stroke overflow-hidden">
        <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center gap-2">
          <Activity size={16} className="text-[#E05BF5]" />
          <h2 className="text-sm font-medium text-white/70 uppercase tracking-widest">Actividad Reciente</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-white/30 border-b border-white/5">
                <th className="p-4 font-medium">Estudiante</th>
                <th className="p-4 font-medium">Reto</th>
                <th className="p-4 font-medium">Estado</th>
                <th className="p-4 font-medium">Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {events.map((event, i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40">
                        <User size={14} />
                      </div>
                      <span className="text-sm text-white/80">{event.userId.slice(0, 8)}...</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-white/60">{event.challengeTitle}</span>
                  </td>
                  <td className="p-4">
                    {event.passed ? (
                      <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                        <CheckCircle size={14} /> Aprobado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-red-400 text-xs font-medium">
                        <XCircle size={14} /> Fallido
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="text-xs text-white/30 flex items-center gap-1">
                      <Clock size={12} /> {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </td>
                </tr>
              ))}
              
              {events.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-white/20 italic text-sm">
                    Esperando actividad...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
