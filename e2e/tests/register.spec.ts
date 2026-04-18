import { test, expect } from "@playwright/test";

test("debe registrar un nuevo usuario y redirigir al dashboard", async ({ page }) => {
  const email = `newuser-${Date.now()}@example.com`;
  
  await page.goto("/register");
  await page.fill('input[placeholder="Nombre"]', "Nuevo Usuario");
  await page.fill('input[placeholder="Email"]', email);
  await page.fill('input[placeholder="Contraseña"]', "Password123!");
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL("/dashboard");
  await expect(page.locator("text=Bienvenido, Nuevo Usuario")).toBeVisible();
});
