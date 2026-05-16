import { NextRequest, NextResponse } from "next/server";
import { OPERATOR_SESSION_COOKIE, isOperatorAuthEnabled } from "@/lib/operator-auth";

function hasSessionCookie(request: NextRequest) {
  return Boolean(request.cookies.get(OPERATOR_SESSION_COOKIE)?.value);
}

export async function proxy(request: NextRequest) {
  if (!isOperatorAuthEnabled()) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/v1/auth") ||
    pathname.startsWith("/api/v1/integrations/telegram/webhook") ||
    pathname.startsWith("/api/v1/integrations/n8n/") ||
    pathname.startsWith("/api/v1/agent-jobs/") ||
    pathname.startsWith("/api/v1/health") ||
    pathname.startsWith("/api/v1/worker-heartbeat") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico";

  if (isPublic) return NextResponse.next();

  if (hasSessionCookie(request)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
