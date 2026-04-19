import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import DashboardShell from "./dashboard-shell"
import { getDashboardData } from "@/lib/dashboard-service"
import { DashboardUser } from "@/lib/dashboard-types"

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const apiUrl = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL
  
  const sessionRes = await fetch(
    `${apiUrl}/api/auth/get-session`,
    {
      headers: { cookie: cookieStore.toString() },
      cache: "no-store",
    }
  )

  const session = await sessionRes.json()

  if (!session || !session.user) {
    redirect("/login")
  }

  const dashboardData = await getDashboardData()

  const user: DashboardUser = {
    name: session.user.name,
    email: session.user.email,
    level: 7, // Mocked for now
    streak: 23, // Mocked for now
  }

  return <DashboardShell initialData={dashboardData} user={user} />
}
