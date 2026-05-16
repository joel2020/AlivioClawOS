import { describe, expect, it, beforeEach } from "vitest";
import { POST as loginPost, DELETE as logoutDelete } from "@/app/api/v1/auth/session/route";
import { POST as leadPost } from "@/app/api/v1/leads/route";
import { resetAppStateForTests } from "@/lib/clawbot-service";

function jsonRequest(url: string, body: unknown, cookie?: string) {
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("auth and permission route behavior", () => {
  beforeEach(() => {
    resetAppStateForTests();
  });

  it("logs in, sets a session cookie, and clears it on logout", async () => {
    const login = await loginPost(jsonRequest("http://localhost/api/v1/auth/session", { password: "test-secret" }));
    expect(login.status).toBe(200);
    const setCookie = login.headers.get("set-cookie");
    expect(setCookie).toContain("clawbot_operator_session=");

    const logout = await logoutDelete(new Request("http://localhost/api/v1/auth/session", { method: "DELETE", headers: { cookie: setCookie || "" } }));
    expect(logout.status).toBe(200);
    expect(logout.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("blocks sensitive mutation routes without a valid session", async () => {
    const response = await leadPost(jsonRequest("http://localhost/api/v1/leads", { companyName: "Blocked Co" }));
    expect(response.status).toBe(401);
  });

  it("allows lead creation with a valid operator session", async () => {
    const login = await loginPost(jsonRequest("http://localhost/api/v1/auth/session", { password: "test-secret" }));
    const cookie = login.headers.get("set-cookie") || "";
    const response = await leadPost(jsonRequest("http://localhost/api/v1/leads", { companyName: "Allowed Co" }, cookie));
    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.lead.companyName).toBe("Allowed Co");
  });
});
