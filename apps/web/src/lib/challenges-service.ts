const API = () => process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? '';

export interface ChallengePhaseContent {
  question?: string;
  rubric?: string;
  language?: string;
  starter?: string;
  tests?: Array<{ stdin: string; expected_stdout: string }>;
}

export interface ChallengeHint {
  id: string;
  level: number;
  content: string;
}

export interface ChallengePhase {
  id: string;
  order_index: number;
  kind: 'conceptual' | 'code';
  content: ChallengePhaseContent;
  hints: ChallengeHint[];
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: number;
  topic: string;
  created_at: string;
  phases: ChallengePhase[];
}

export async function getChallenges(): Promise<Omit<Challenge, 'phases'>[]> {
  const res = await fetch(`${API()}/api/v1/challenges`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch challenges');
  return res.json();
}

export async function getChallenge(id: string): Promise<Challenge | null> {
  const res = await fetch(`${API()}/api/v1/challenges/${id}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch challenge');
  return res.json();
}

export async function submitPhase(
  challengeId: string,
  phaseId: string,
  content: string,
  cookies: string,
): Promise<{ passed: boolean; feedback: string; achEarned: number }> {
  const res = await fetch(
    `${API()}/api/v1/challenges/${challengeId}/phases/${phaseId}/submit`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookies },
      body: JSON.stringify({ content }),
    },
  );
  if (!res.ok) throw new Error('Submit failed');
  return res.json();
}

export async function requestHint(
  challengeId: string,
  phaseId: string,
  level: number,
  cookies: string,
): Promise<{ hint: string; level: number; source: string }> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/challenges/${challengeId}/phases/${phaseId}/hint`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookies },
      body: JSON.stringify({ level }),
      credentials: 'include',
    },
  );
  if (!res.ok) throw new Error('Hint request failed');
  return res.json();
}
