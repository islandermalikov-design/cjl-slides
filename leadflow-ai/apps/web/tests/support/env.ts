import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const here = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(here, "../../../../.env"), quiet: true });

/** Тесты всегда работают с отдельной БД — никогда с рабочей. */
export function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL не задан — интеграционные тесты не запускаются на рабочей БД");
  if (url === process.env.DATABASE_URL) throw new Error("TEST_DATABASE_URL совпадает с DATABASE_URL");
  return url;
}
