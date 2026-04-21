import { cookies } from 'next/headers';
import { SettingsShell } from './settings-shell';

const API_INTERNAL = () => process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? '';

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  let keysStatus = { hasGoogleKey: false, hasOpenRouterKey: false };
  try {
    const res = await fetch(`${API_INTERNAL()}/api/v1/settings/api-keys`, {
      headers: { Cookie: cookieHeader },
      cache: 'no-store',
    });
    if (res.ok) keysStatus = await res.json();
  } catch {
    // Show empty form if API is unreachable
  }

  return <SettingsShell keysStatus={keysStatus} />;
}
