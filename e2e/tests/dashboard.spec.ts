import { test, expect } from "@playwright/test";

test("debe redirigir al login si no está autenticado", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL("/login");
});

test("debe cerrar sesión correctamente", async ({ page }) => {
  // Primero iniciamos sesión
  await page.goto("/login");
  await page.fill("#email", "test@example.com");
  await page.fill("#password", "Test1234!");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL("/dashboard");

  // Luego cerramos sesión
  await page.click('button:text("Cerrar sesión")');
  await expect(page).toHaveURL("/login");

  // Verificamos que ya no podemos entrar al dashboard
  await page.goto("/dashboard");
  await expect(page).toHaveURL("/login");
});
