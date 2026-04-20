import { test, expect, Page } from "@playwright/test";

async function loginAsTestUser(page: Page) {
  await page.goto("/login");
  await page.fill("#email", "test@example.com");
  await page.fill("#password", "Test1234!");
  await page.click('button[type="submit"]');
  await page.waitForURL("/dashboard");
}

// ─── Auth & redirect ─────────────────────────────────────────────────────────

test.describe("Dashboard — Auth guard", () => {
  test("redirige a /login si no hay sesión activa", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL("/login");
  });
});

// ─── Functional suite (requires auth) ────────────────────────────────────────

test.describe("Dashboard — Functional", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  // ── Render inicial ──────────────────────────────────────────────────────────

  test("saludo personalizado muestra el nombre real del usuario", async ({ page }) => {
    await expect(page.locator("text=Hola, Test User. Lumen tejió algo para ti.")).toBeVisible();
  });

  test("los cuatro bentos del grid son visibles", async ({ page }) => {
    await expect(page.locator("text=COMPAÑERO ACTIVO")).toBeVisible();
    await expect(page.locator("text=Momentum en vivo")).toBeVisible();
    await expect(page.locator("text=Fragmentos de hoy")).toBeVisible();
    await expect(page.locator("text=CONSTELACIÓN")).toBeVisible();
  });

  test("la SummonBar está visible en estado inicial", async ({ page }) => {
    await expect(page.locator('input[placeholder*="Describe"]')).toBeVisible();
  });

  test("el SessionDock NO está montado en el render inicial", async ({ page }) => {
    await expect(page.locator("text=Pregunta 3/5")).not.toBeVisible();
  });

  // ── Sidebar ─────────────────────────────────────────────────────────────────

  test("sidebar muestra nombre de usuario y nivel", async ({ page }) => {
    const sidebar = page.locator("aside");
    await expect(sidebar.locator("text=Test User")).toBeVisible();
    await expect(sidebar.locator("text=Nivel 7 · Alma")).toBeVisible();
  });

  test("sidebar tiene los 5 nav items principales", async ({ page }) => {
    const aside = page.locator("aside");
    await expect(aside.locator("text=Dashboard")).toBeVisible();
    await expect(aside.locator("text=Inteligencia")).toBeVisible();
    await expect(aside.locator("text=Momentum")).toBeVisible();
    await expect(aside.locator("text=Flujo")).toBeVisible();
    await expect(aside.locator("text=Ajustes")).toBeVisible();
  });

  test("sidebar tiene nav items secundarios", async ({ page }) => {
    const aside = page.locator("aside");
    await expect(aside.locator("text=Biblioteca")).toBeVisible();
    await expect(aside.locator("text=Archivo")).toBeVisible();
  });

  test("botón Invocar IA es visible en el sidebar", async ({ page }) => {
    await expect(page.locator("aside").locator("text=Invocar IA")).toBeVisible();
  });

  // ── Language toggle ─────────────────────────────────────────────────────────

  test("lang toggle: ES es el idioma por defecto", async ({ page }) => {
    await expect(page.locator("text=Racha")).toBeVisible();
    await expect(page.locator("text=Momentum en vivo")).toBeVisible();
    await expect(page.locator("aside button:has-text('es')")).toBeVisible();
  });

  test("lang toggle: cambiar a EN traduce la UI", async ({ page }) => {
    await page.locator("aside button:has-text('en')").click();
    await expect(page.locator("text=Hi, Test User. Lumen wove something for you.")).toBeVisible();
    await expect(page.locator("text=Streak")).toBeVisible();
    await expect(page.locator("text=Live Momentum")).toBeVisible();
    await expect(page.locator("text=ACTIVE COMPANION")).toBeVisible();
  });

  test("lang toggle: la preferencia persiste tras recarga", async ({ page }) => {
    await page.locator("aside button:has-text('en')").click();
    await expect(page.locator("text=Streak")).toBeVisible();
    await page.reload();
    await page.waitForURL("/dashboard");
    await expect(page.locator("text=Streak")).toBeVisible();
  });

  // ── Lumen mascota ──────────────────────────────────────────────────────────

  test("clic en Lumen dispara el estado celebrate y vuelve a idle", async ({ page }) => {
    const lumen = page.locator('[data-testid="lumen-mascot"]').first();
    await lumen.click();
    // Burst de celebrate debe aparecer brevemente
    await expect(page.locator('[data-testid="lumen-burst"]')).toBeVisible();
    // Después del timeout vuelve a idle (no más burst)
    await expect(page.locator('[data-testid="lumen-burst"]')).not.toBeVisible({ timeout: 2000 });
  });

  test("botón Alimentar a Lumen está visible y es clickeable", async ({ page }) => {
    const feedBtn = page.locator("text=Alimentar a Lumen");
    await expect(feedBtn).toBeVisible();
    await feedBtn.click();
    // No error lanzado
  });

  // ── Fragment cards ──────────────────────────────────────────────────────────

  test("los 6 fragmentos del día son visibles", async ({ page }) => {
    await expect(page.locator("text=Termodinámica del deseo")).toBeVisible();
    await expect(page.locator("text=Cómo piensa un pulpo")).toBeVisible();
    await expect(page.locator("text=Kanji del agua 水")).toBeVisible();
    await expect(page.locator("text=El teorema de la lentitud")).toBeVisible();
    await expect(page.locator("text=Acordes que respiran")).toBeVisible();
    await expect(page.locator("text=Probabilidades en la niebla")).toBeVisible();
  });

  test("el fragmento pinneado tiene indicador de pin", async ({ page }) => {
    // Termodinámica del deseo tiene pinned: true
    const pinnedCard = page.locator('[data-testid="fragment-card-1"]');
    await expect(pinnedCard.locator('[data-testid="pin-indicator"]')).toBeVisible();
  });

  test("fragmentos con progress > 0 muestran el ring de progreso", async ({ page }) => {
    const progressCard = page.locator('[data-testid="fragment-card-1"]');
    await expect(progressCard.locator('[data-testid="progress-ring"]')).toBeVisible();
  });

  test("fragmentos con progress === 0 muestran el botón play", async ({ page }) => {
    const noProgressCard = page.locator('[data-testid="fragment-card-2"]');
    await expect(noProgressCard.locator('[data-testid="play-button"]')).toBeVisible();
  });

  test("clic en un fragmento abre el SessionDock", async ({ page }) => {
    await page.locator("text=Termodinámica del deseo").click();
    await expect(page.locator("text=Pregunta 3/5")).toBeVisible();
  });

  // ── SessionDock — flujo completo ────────────────────────────────────────────

  test("SessionDock se abre con el botón Jugar", async ({ page }) => {
    await page.locator("text=Jugar").click();
    await expect(page.locator("text=Pregunta 3/5")).toBeVisible();
    await expect(page.locator("text=03:42 / 07:00")).toBeVisible();
  });

  test("SessionDock: botón Enviar respuesta deshabilitado sin selección", async ({ page }) => {
    await page.locator("text=Jugar").click();
    const submitBtn = page.locator('button:has-text("Enviar respuesta")');
    await expect(submitBtn).toBeDisabled();
  });

  test("SessionDock: seleccionar una opción habilita el botón Enviar", async ({ page }) => {
    await page.locator("text=Jugar").click();
    await page.locator('button:has-text("Entropía negativa")').click();
    const submitBtn = page.locator('button:has-text("Enviar respuesta")');
    await expect(submitBtn).toBeEnabled();
  });

  test("SessionDock: respuesta correcta — muestra Preciso y estado celebrate", async ({ page }) => {
    await page.locator("text=Jugar").click();
    await page.locator('button:has-text("Equilibrio térmico")').click();
    await page.locator('button:has-text("Enviar respuesta")').click();
    // Estado checking → correct
    await expect(page.locator("text=Preciso")).toBeVisible({ timeout: 2500 });
    // La opción correcta tiene fondo verde
    await expect(page.locator('button:has-text("Equilibrio térmico")')).toHaveClass(/\[#34D399\]/, { timeout: 2500 });
  });

  test("SessionDock: respuesta incorrecta — muestra toast y estado sad", async ({ page }) => {
    await page.locator("text=Jugar").click();
    await page.locator('button:has-text("Entropía negativa")').click();
    await page.locator('button:has-text("Enviar respuesta")').click();
    // Toast con el texto de error
    await expect(page.locator("text=Casi")).toBeVisible({ timeout: 2500 });
    await expect(page.locator("text=Fragmento esquivo")).toBeVisible({ timeout: 2500 });
    // La opción incorrecta tiene fondo rojo
    await expect(page.locator('button:has-text("Entropía negativa")')).toHaveClass(/\[#FB7185\]/, { timeout: 2500 });
  });

  test("SessionDock: no se puede cambiar respuesta después de enviar", async ({ page }) => {
    await page.locator("text=Jugar").click();
    await page.locator('button:has-text("Entropía negativa")').click();
    await page.locator('button:has-text("Enviar respuesta")').click();
    // Todas las opciones están disabled tras submit
    await expect(page.locator('button:has-text("Equilibrio térmico")')).toBeDisabled({ timeout: 2500 });
  });

  test("SessionDock: botón X cierra el dock", async ({ page }) => {
    await page.locator("text=Jugar").click();
    await expect(page.locator("text=Pregunta 3/5")).toBeVisible();
    await page.locator('[data-testid="session-dock-close"]').click();
    await expect(page.locator("text=Pregunta 3/5")).not.toBeVisible();
  });

  // ── SummonBar ───────────────────────────────────────────────────────────────

  test("SummonBar: submit deshabilitado con input vacío", async ({ page }) => {
    await expect(page.locator('form button[type="submit"]')).toBeDisabled();
  });

  test("SummonBar: escribir texto habilita el submit", async ({ page }) => {
    await page.locator('input[placeholder*="Describe"]').fill("cuéntame sobre física cuántica");
    await expect(page.locator('form button[type="submit"]')).toBeEnabled();
  });

  test("SummonBar: estado generating bloquea el input y muestra texto", async ({ page }) => {
    await page.locator('input[placeholder*="Describe"]').fill("cuéntame sobre física cuántica");
    await page.locator('form button[type="submit"]').click();
    const input = page.locator('input[placeholder*="Describe"], input[disabled]').first();
    await expect(input).toBeDisabled({ timeout: 500 });
    await expect(input).toHaveValue("Tejiendo conocimiento", { timeout: 500 });
  });

  test("SummonBar: tras 2.4s vuelve al estado inicial", async ({ page }) => {
    await page.locator('input[placeholder*="Describe"]').fill("física cuántica");
    await page.locator('form button[type="submit"]').click();
    await page.waitForTimeout(2600);
    const input = page.locator('input[placeholder*="Describe"]');
    await expect(input).toBeEnabled();
    await expect(input).toHaveValue("");
  });

  // ── Momentum card ───────────────────────────────────────────────────────────

  test("Momentum card muestra el número de racha", async ({ page }) => {
    await expect(page.locator(".text-4xl").filter({ hasText: "23" })).toBeVisible();
  });

  test("Momentum card muestra la barra de segmentos semanales", async ({ page }) => {
    await expect(page.locator("text=Momentum en vivo")).toBeVisible();
    // 7 segmentos en el DOM
    const segments = page.locator('[data-testid="momentum-segment"]');
    await expect(segments).toHaveCount(7);
  });

  // ── Constellation ───────────────────────────────────────────────────────────

  test("Constellation renderiza los nodos SVG", async ({ page }) => {
    const nodes = page.locator('[data-testid="constellation-node"]');
    await expect(nodes).toHaveCount(7);
  });

  test("Constellation: clic en un nodo lo marca como activo", async ({ page }) => {
    const node = page.locator('[data-testid="constellation-node"]').first();
    await node.click();
    await expect(node).toHaveAttribute("data-active", "true");
  });

  // ── Logout ──────────────────────────────────────────────────────────────────

  test("logout redirige a /login y limpia la sesión", async ({ page }) => {
    await page.locator("aside button:has-text('Logout')").click();
    await expect(page).toHaveURL("/login");
  });

  test("tras logout, /dashboard redirige a /login", async ({ page }) => {
    await page.locator("aside button:has-text('Logout')").click();
    await expect(page).toHaveURL("/login");
    await page.goto("/dashboard");
    await expect(page).toHaveURL("/login");
  });
});

// ─── Visual suite ─────────────────────────────────────────────────────────────

test.describe("Dashboard — Visual", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    // Esperar a que las animaciones de entrada terminen
    await page.waitForTimeout(800);
  });

  test("captura del dashboard completo", async ({ page }) => {
    await page.screenshot({ path: "test-results/screenshots/01-dashboard-full.png", fullPage: false });
  });

  test("captura del SessionDock abierto", async ({ page }) => {
    await page.locator("text=Jugar").click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: "test-results/screenshots/02-session-dock.png" });
  });

  test("captura del estado celebrate de Lumen", async ({ page }) => {
    await page.locator('[data-testid="lumen-mascot"]').first().click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: "test-results/screenshots/03-lumen-celebrate.png" });
  });

  test("captura del SummonBar en estado generating", async ({ page }) => {
    await page.locator('input[placeholder*="Describe"]').fill("física cuántica");
    await page.locator('form button[type="submit"]').click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: "test-results/screenshots/04-summon-generating.png" });
  });

  test("captura del dashboard en idioma EN", async ({ page }) => {
    await page.locator("aside button:has-text('en')").click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: "test-results/screenshots/05-dashboard-en.png" });
  });
});
