import { test, expect } from "@playwright/test";

test("debe iniciar sesión con el usuario de prueba y redirigir al dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[placeholder="Email"]', "test@example.com");
  await page.fill('input[placeholder="Contraseña"]', "Test1234!");
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL("/dashboard");
  await expect(page.locator("text=Bienvenido, Test User")).toBeVisible();
});

test("debe mostrar error con contraseña incorrecta", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[placeholder="Email"]', "test@example.com");
  await page.fill('input[placeholder="Contraseña"]', "WrongPassword!");
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL("/login");
  // Better Auth provides error messages
  await expect(page.locator("text=Invalid")).toBeVisible();
});
