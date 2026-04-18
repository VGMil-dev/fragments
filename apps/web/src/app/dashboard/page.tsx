import { cookies } from "next/headers";
import { LogoutButton } from "./logout-button";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const apiUrl = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL;
  const sessionRes = await fetch(
    `${apiUrl}/api/auth/get-session`,
    {
      headers: { cookie: cookieStore.toString() },
      cache: "no-store",
    }
  );

  const session = await sessionRes.json();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p>Bienvenido, {session?.user?.name}</p>
      <LogoutButton />
    </div>
  );
}
