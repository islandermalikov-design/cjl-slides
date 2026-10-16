import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email = "demo@leadflow.local", password = "demo12345") {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click("button[type=submit]");
  await page.waitForURL("**/dashboard");
}

test("unauthenticated users are redirected to login", async ({ page }) => {
  await page.goto("/companies");
  await expect(page).toHaveURL(/\/login/);
  const res = await page.request.get("/api/search?q=test");
  expect(res.status()).toBe(401);
});

test("wrong password shows an error", async ({ page }) => {
  await page.goto("/login");
  await page.fill("#email", "demo@leadflow.local");
  await page.fill("#password", "wrong-password");
  await page.click("button[type=submit]");
  await expect(page.getByText("Неверный email или пароль")).toBeVisible();
});

test("dashboard shows KPIs from the database", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("heading", { name: "Главная" })).toBeVisible();
  await expect(page.getByText("Всего компаний")).toBeVisible();
  await expect(page.getByText("Воронка продаж").first()).toBeVisible();
});

test("all navigation pages open", async ({ page }) => {
  await login(page);
  for (const path of ["/analytics", "/discovery", "/companies", "/crm", "/contacts", "/proposals", "/messages", "/tasks", "/deals", "/ai/analysis", "/ai/proposals", "/ai/assistant", "/sources", "/jobs", "/integrations", "/settings", "/audit"]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
    await expect(page.locator("h1")).toBeVisible();
  }
});

test("create company, add contact, change CRM status", async ({ page }) => {
  await login(page);
  const stamp = Date.now();
  const name = `E2E Компания ${stamp}`;
  await page.goto("/companies");
  await page.getByRole("button", { name: "Добавить компанию" }).first().click();
  await page.fill("#name", name);
  await page.fill("#website", `e2e-${stamp}.example`);
  await page.fill("#publicEmail", `sales@e2e-${stamp}.example`);
  await page.fill("#sourceUrl", `https://e2e-${stamp}.example/contacts`);
  await page.getByRole("button", { name: "Сохранить" }).click();
  await page.waitForURL(/\/companies\/c/);
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await page.getByRole("button", { name: "+ Контакт" }).click();
  await page.fill("#c-name", "Отдел продаж");
  await page.fill("#c-email", `team@e2e-${stamp}.example`);
  await page.getByRole("dialog").getByRole("button", { name: "Сохранить" }).click();
  await expect(page.getByText("Отдел продаж")).toBeVisible();
  await page.getByRole("combobox", { name: "Статус в CRM" }).click();
  await page.getByRole("option", { name: "Проверен" }).click();
  await expect(page.getByText(/Статус: Проверен/).first()).toBeVisible();
});

test("AI analysis in DEMO_MODE and proposal PDF export", async ({ page }) => {
  await login(page);
  await page.goto("/companies?sort=createdAt&order=desc");
  await page.locator("table a[href^='/companies/c']").first().click();
  await page.getByRole("button", { name: /AI-анализ|Повторный анализ/ }).first().click();
  await expect(page.getByText(/из 100/)).toBeVisible();
  await page.goto("/proposals/new");
  await page.getByRole("combobox", { name: "Компания" }).click();
  await page.getByRole("option").first().click();
  await page.getByRole("button", { name: "Создать КП" }).click();
  await page.waitForURL(/\/proposals\/c/);
  const href = await page.getByRole("link", { name: "PDF" }).getAttribute("href");
  const pdf = await page.request.get(href!);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  expect((await pdf.body()).subarray(0, 4).toString()).toBe("%PDF");
});

test("viewer role cannot modify data", async ({ page }) => {
  await login(page, "viewer@leadflow.local", "viewer12345");
  await page.goto("/companies");
  await expect(page.getByRole("button", { name: "Добавить компанию" })).toHaveCount(0);
});
