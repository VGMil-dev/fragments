const API_PUBLIC = () => process.env.NEXT_PUBLIC_API_URL ?? '';

export interface KeysStatus {
  hasGoogleKey: boolean;
  hasOpenRouterKey: boolean;
}

export async function getKeysStatus(): Promise<KeysStatus> {
  const res = await fetch(`${API_PUBLIC()}/api/v1/settings/api-keys`, {
    credentials: 'include',
    cache: 'no-store',
  });
  if (!res.ok) return { hasGoogleKey: false, hasOpenRouterKey: false };
  return res.json();
}

export async function saveApiKeys(
  googleKey: string,
  openRouterKey: string,
): Promise<void> {
  const res = await fetch(`${API_PUBLIC()}/api/v1/settings/api-keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      googleKey: googleKey || null,
      openRouterKey: openRouterKey || null,
    }),
  });
  if (!res.ok) throw new Error('Failed to save keys');
}
