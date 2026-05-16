import { describe, expect, it } from "vitest";
import { persistDbState } from "@/lib/clawbot-db-state";
import { setPoolForTests } from "@/lib/db";
import { seedAppState } from "@/lib/clawbot-service";

describe("database persistence smoke", () => {
  it("writes app state through the Postgres transaction path", async () => {
    process.env.DATABASE_URL = "postgresql://test";
    const queries: string[] = [];
    const client = {
      query: async (sql: string) => {
        queries.push(sql);
        return { rows: [], rowCount: 0 };
      },
      release: () => undefined,
    };
    setPoolForTests({
      connect: async () => client,
      query: async (sql: string) => {
        queries.push(sql);
        return { rows: [], rowCount: 0 };
      },
      end: async () => undefined,
    } as never);

    const persisted = await persistDbState(seedAppState());
    expect(persisted).toBe(true);
    expect(queries.some((sql) => sql.includes("BEGIN"))).toBe(true);
    expect(queries.some((sql) => sql.includes("INSERT INTO app_state"))).toBe(true);
    expect(queries.some((sql) => sql.includes("INSERT INTO clients"))).toBe(true);
    expect(queries.some((sql) => sql.includes("INSERT INTO agent_definitions"))).toBe(true);
    expect(queries.some((sql) => sql.includes("INSERT INTO leads"))).toBe(true);
    expect(queries.some((sql) => sql.includes("COMMIT"))).toBe(true);
    setPoolForTests(null);
    delete process.env.DATABASE_URL;
  });
});
