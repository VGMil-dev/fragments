import { test, expect } from "@playwright/test";
import path from "path";

const SCREENSHOT_DIR = path.resolve(__dirname, "../../docs/superpowers/reports-gemini/screenshots");

test.describe("Dashboard — Visual Report", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly since auth is mocked
    await page.goto("/dashboard");
    // Wait for animations to settle
    await page.waitForTimeout(2000);
  });

  test("Capture screenshots", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 01-dashboard-full
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "01-dashboard-full.png") });

    // 02-sidebar
    await page.locator('aside').screenshot({ path: path.join(SCREENSHOT_DIR, "02-sidebar.png") });

    // 03-companion-card
    await page.locator('.grid.grid-cols-2 > div').first().screenshot({ path: path.join(SCREENSHOT_DIR, "03-companion-card.png") });

    // 04-lumen-celebrate
    const lumen = page.locator('svg').filter({ has: page.locator('circle[fill="url(#lumen-gradient)"]') }).first();
    await lumen.click();
    await page.waitForTimeout(200);
    await lumen.screenshot({ path: path.join(SCREENSHOT_DIR, "04-lumen-celebrate.png") });

    // 05-momentum-card
    await page.locator('text=Momentum en vivo').locator('..').locator('..').screenshot({ path: path.join(SCREENSHOT_DIR, "05-momentum-card.png") });

    // 06-daily-fragments
    await page.locator('text=Fragmentos de hoy').locator('..').locator('..').screenshot({ path: path.join(SCREENSHOT_DIR, "06-daily-fragments.png") });

    // 07-constellation
    await page.locator('text=CONSTELACIÓN').locator('..').locator('..').locator('..').screenshot({ path: path.join(SCREENSHOT_DIR, "07-constellation.png") });

    // 08-session-dock-open
    await page.click('text=Jugar');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "08-session-dock-open.png") });

    // 09-session-dock-selected
    await page.click('text=Equilibrio térmico');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "09-session-dock-selected.png") });

    // 10-session-dock-correct
    await page.click('button:has-text("Enviar respuesta")');
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "10-session-dock-correct.png") });

    // 11-session-dock-wrong (need to reopen or wait for reset)
    await page.waitForTimeout(1000);
    await page.click('text=Entropía negativa');
    await page.click('button:has-text("Enviar respuesta")');
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "11-session-dock-wrong.png") });

    // 12-summon-generating
    await page.locator('button:has-text("Casi")').locator('..').locator('..').locator('button').first().click(); // Close toast if any
    await page.locator('input[placeholder*="Describe"]').fill("Test visual");
    await page.click('form button[type="submit"]');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "12-summon-generating.png") });

    // 13-lang-en
    await page.waitForTimeout(2500); // Wait for generation to finish
    await page.click('button:text("EN")');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "13-lang-en.png") });
  });
});
