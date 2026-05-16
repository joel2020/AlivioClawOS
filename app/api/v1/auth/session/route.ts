import { NextResponse } from "next/server";
import { buildSessionCookie, clearSessionCookie, isOperatorAuthEnabled } from "@/lib/operator-auth";
import { authenticateOperator, getOperatorFromRequest, revokeSessionFromRequest } from "@/lib/operator-rbac";
import { enforceRateLimit } from "@/lib/rate-limit";
import { badRequest, internalError, json, readJson } from "../../_utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const operator = await getOperatorFromRequest(request);
  return json({ authenticated: Boolean(operator) || !isOperatorAuthEnabled(), operator });
}

export async function POST(request: Request) {
  try {
    const limited = await enforceRateLimit(request, "auth", "login");
    if (limited) return limited;
    const body = await readJson<{ email?: string; password?: string }>(request);
    const password = body?.password?.trim() || "";
    if (!isOperatorAuthEnabled()) {
      const response = NextResponse.json({ ok: true, authenticated: true });
      response.cookies.set(buildSessionCookie("dev"));
      return response;
    }
    if (!password) return badRequest("password is required");
    const auth = await authenticateOperator(body?.email?.trim(), password);
    if (!auth) {
      return badRequest("Invalid password");
    }
    const response = NextResponse.json({ ok: true, authenticated: true });
    response.cookies.set(buildSessionCookie(auth.token));
    return response;
  } catch (error) {
    return internalError(error);
  }
}

export async function DELETE(request: Request) {
  await revokeSessionFromRequest(request);
  const response = NextResponse.json({ ok: true, authenticated: false });
  response.cookies.set(clearSessionCookie());
  return response;
}
