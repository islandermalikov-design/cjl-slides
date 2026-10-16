import "server-only";
import { z } from "zod";

const bool = z
  .string()
  .optional()
  .transform((v) => v === "true" || v === "1");

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DEMO_MODE: bool,
  DATABASE_URL: z.string().min(1, "DATABASE_URL не задан"),
  REDIS_URL: z.string().optional().transform((v) => v || undefined),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET должен быть не короче 32 символов"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
  ALLOW_SIGNUP: z
    .string()
    .optional()
    .transform((v) => v !== "false"),
  ENCRYPTION_KEY: z.string().optional().transform((v) => v || undefined),
  ANTHROPIC_API_KEY: z.string().optional().transform((v) => v || undefined),
  ANTHROPIC_MODEL: z.string().default("claude-opus-5-5"),
  AI_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(256).max(64000).default(4000),
  AI_TIMEOUT_MS: z.coerce.number().int().min(5000).max(600000).default(60000),
  AI_MONTHLY_BUDGET_USD: z.coerce.number().min(0).default(20),
  COLLECTOR_URL: z.string().optional().transform((v) => v || undefined),
  COLLECTOR_TOKEN: z.string().optional().transform((v) => v || undefined),
  SMTP_HOST: z.string().optional().transform((v) => v || undefined),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  PDF_CHROMIUM_PATH: z.string().optional().transform((v) => v || undefined),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Некорректная конфигурация окружения: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}
