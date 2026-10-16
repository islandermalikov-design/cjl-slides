// Проверка конфигурации при запуске сервера: понятная ошибка вместо сбоев в рантайме.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { env } = await import("./server/env");
  const config = env();
  if (config.NODE_ENV === "production" && !config.ENCRYPTION_KEY) {
    throw new Error("ENCRYPTION_KEY обязателен в production (32 байта в base64: openssl rand -base64 32)");
  }
  console.log(
    JSON.stringify({
      level: "info",
      message: "LeadFlow AI запущен",
      demoMode: config.DEMO_MODE,
      redis: Boolean(config.REDIS_URL),
      collector: Boolean(config.COLLECTOR_URL),
      ai: config.ANTHROPIC_API_KEY ? "env-key" : "integration-or-demo",
    }),
  );
}
