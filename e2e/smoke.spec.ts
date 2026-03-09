import { expect, test } from "@playwright/test";

test("главная страница открывается и ведет в приоритизатор", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "ProductHub" })).toBeVisible();
  const toolCard = page.getByRole("link", { name: /Приоритизатор фич/i });
  await expect(toolCard).toBeVisible();

  await toolCard.click();
  await expect(page).toHaveURL(/\/tools\/rice$/);
  await expect(page.getByRole("heading", { name: /Приоритизатор фич/i })).toBeVisible();
});

test("можно добавить новую фичу в бэклог", async ({ page }) => {
  await page.goto("/tools/rice");

  await page.getByLabel("Название").fill("E2E: новая фича");
  await page.getByLabel("Описание (необязательно)").fill("Проверка e2e флоу");
  await page.getByPlaceholder("1000").fill("120");
  await page.getByPlaceholder("2").fill("1");

  await page.getByRole("button", { name: "Добавить в бэклог" }).click();

  await expect(page.getByRole("button", { name: 'Редактировать фичу "E2E: новая фича"' })).toBeVisible();
});
