import { testDatabaseUrl } from "./env";

process.env.DATABASE_URL = testDatabaseUrl();
process.env.REDIS_URL = "";
process.env.ANTHROPIC_API_KEY = "";
process.env.COLLECTOR_URL = "";
process.env.SMTP_HOST = "";
process.env.DEMO_MODE = "true";
