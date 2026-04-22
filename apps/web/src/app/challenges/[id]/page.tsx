import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getChallenge } from '@/lib/challenges-service';
import { ChallengeShell } from '@/components/challenges/challenge-shell';

const API_INTERNAL = () => process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? '';

async function getUserLevel(cookieHeader: string): Promise<number> {
  try {
    const res = await fetch(`${API_INTERNAL()}/api/v1/economy/balance`, {
      headers: { Cookie: cookieHeader },
    });
    if (!res.ok) return 1;
    const data = await res.json();
    return data.level ?? 1;
  } catch {
    return 1;
  }
}

export default async function ChallengePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const [challenge, userLevel] = await Promise.all([
    getChallenge(id),
    getUserLevel(cookieHeader),
  ]);

  if (!challenge) notFound();

  return <ChallengeShell challenge={challenge} userLevel={userLevel} />;
}
