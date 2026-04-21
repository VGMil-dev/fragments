const API_PUBLIC = () => process.env.NEXT_PUBLIC_API_URL ?? '';

export interface AchBalance {
  balance: number;
  level: number;
}

export async function getBalance(): Promise<AchBalance> {
  const res = await fetch(`${API_PUBLIC()}/api/v1/economy/balance`, {
    credentials: 'include',
    cache: 'no-store',
  });
  if (!res.ok) return { balance: 0, level: 1 };
  return res.json();
}

export async function feedLumen(): Promise<{ newBalance: number; newLevel: number }> {
  const res = await fetch(`${API_PUBLIC()}/api/v1/economy/feed`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).message ?? 'Feed failed');
  }
  return res.json();
}
