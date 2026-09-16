import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Middleware ini cuma cek KEHADIRAN cookie sesi (cepat, jalan di edge).
// Validasi penuh (apakah user beneran admin) tetap dilakukan di server
// component /admin/layout.tsx karena butuh query DB.
export function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/checkout", "/orders/:path*"],
};
