'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { Sidebar } from '@/components/dashboard/sidebar';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkTeacher() {
      const { data: session } = await authClient.getSession();
      if (!session || (session.user as any).role !== 'teacher') {
        router.push('/dashboard');
      } else {
        setLoading(false);
      }
    }
    checkTeacher();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--base)] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E05BF5]/30 border-t-[#E05BF5] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[var(--base)]">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
