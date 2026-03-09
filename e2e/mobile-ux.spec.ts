import { expect, test } from "@playwright/test";

test("mobile UX: порядок полей, tap-target и работа InfoTip", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chrome", "Проверка только для mobile viewport");

  await page.goto("/tools/rice");

  const addButton = page.getByRole("button", { name: "Добавить в бэклог" });
  const addButtonBox = await addButton.boundingBox();
  expect(addButtonBox).not.toBeNull();
  expect(addButtonBox!.height).toBeGreaterThanOrEqual(44);

  const reach = await page.getByTestId("field-reach").boundingBox();
  const effort = await page.getByTestId("field-effort").boundingBox();
  const impact = await page.getByTestId("field-impact").boundingBox();
  const confidence = await page.getByTestId("field-confidence").boundingBox();

  expect(reach).not.toBeNull();
  expect(effort).not.toBeNull();
  expect(impact).not.toBeNull();
  expect(confidence).not.toBeNull();

  const rowTolerance = 8;
  expect(Math.abs(reach!.y - effort!.y)).toBeLessThanOrEqual(rowTolerance);
  expect(Math.abs(impact!.y - confidence!.y)).toBeLessThanOrEqual(rowTolerance);
  expect(reach!.y).toBeLessThan(impact!.y);

  const firstInfoTip = page.getByLabel("Показать подсказку").first();
  await firstInfoTip.tap();
  await expect(page.getByText("Сколько пользователей столкнётся с этой фичей в месяц.", { exact: false })).toBeVisible();
  await firstInfoTip.tap();
  await expect(page.getByText("Сколько пользователей столкнётся с этой фичей в месяц.", { exact: false })).toBeHidden();

  const hasHorizontalScroll = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  expect(hasHorizontalScroll).toBeFalsy();
});

