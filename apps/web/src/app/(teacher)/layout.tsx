'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { Sidebar } from '@/components/dashboard/sidebar';
import { DashboardUser } from '@/lib/dashboard-types';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [lang, setLang] = useState<'es' | 'en'>('es');

  useEffect(() => {
    async function checkTeacher() {
      const { data: session } = await authClient.getSession();
      if (!session || (session.user as any).role !== 'teacher') {
        router.push('/dashboard');
      } else {
        const sessionUser = session.user as any;
        setUser({
          name: sessionUser.name,
          email: sessionUser.email,
          level: 1, // Default for now
          streak: 0,
          role: sessionUser.role,
        });
        setLoading(false);
      }
    }
    checkTeacher();
  }, [router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[var(--base)] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E05BF5]/30 border-t-[#E05BF5] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[var(--base)]">
      <Sidebar 
        user={user} 
        lang={lang} 
        setLang={setLang} 
        activeNav="admin-challenges" 
        setActiveNav={() => {}} 
        onInvoke={() => {}} 
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
