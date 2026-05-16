import { beforeEach, vi } from "vitest";
import { resetRateLimitsForTests } from "@/lib/rate-limit";

process.env.CLAWBOT_TEST_MODE = "true";
process.env.CLAWBOT_OPERATOR_SECRET = "test-secret";
delete process.env.DATABASE_URL;
delete process.env.TELEGRAM_BOT_TOKEN;

beforeEach(() => {
  resetRateLimitsForTests();
  vi.unstubAllEnvs();
  process.env.CLAWBOT_TEST_MODE = "true";
  process.env.CLAWBOT_OPERATOR_SECRET = "test-secret";
  delete process.env.DATABASE_URL;
  delete process.env.TELEGRAM_BOT_TOKEN;
});
