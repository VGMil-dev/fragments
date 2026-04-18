import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const apiUrl = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL;
  const sessionRes = await fetch(
    `${apiUrl}/api/auth/get-session`,
    { headers: { cookie: request.headers.get("cookie") ?? "" } }
  );
  
  if (!sessionRes.ok) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const session = await sessionRes.json();
  
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard"],
};
