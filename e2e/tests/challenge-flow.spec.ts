import { test, expect } from '@playwright/test';

const CHALLENGE_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

test.describe('Challenge flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as seed user
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'Test1234!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('challenge list page shows seeded challenges', async ({ page }) => {
    await page.goto('/challenges');
    await expect(page.getByText('Tu primer condicional')).toBeVisible();
    await expect(page.getByText('Contando con bucles')).toBeVisible();
  });

  test('challenge detail shows conceptual phase first', async ({ page }) => {
    await page.goto(`/challenges/${CHALLENGE_ID}`);
    await expect(page.getByText('Fase conceptual')).toBeVisible();
    await expect(page.getByText('¿Qué hace un if/else?')).toBeVisible();
    await expect(page.getByPlaceholder('Escribe tu respuesta aquí...')).toBeVisible();
  });

  test('submit button is disabled with empty answer', async ({ page }) => {
    await page.goto(`/challenges/${CHALLENGE_ID}`);
    const submitBtn = page.getByRole('button', { name: 'Enviar respuesta' });
    await expect(submitBtn).toBeDisabled();
  });

  test('submit button enables after typing', async ({ page }) => {
    await page.goto(`/challenges/${CHALLENGE_ID}`);
    await page.fill('textarea', 'Un if evalúa una condición booleana.');
    const submitBtn = page.getByRole('button', { name: 'Enviar respuesta' });
    await expect(submitBtn).toBeEnabled();
  });

  test('correct conceptual answer advances to code phase', async ({ page }) => {
    // This test might be slow due to AI evaluation
    await page.goto(`/challenges/${CHALLENGE_ID}`);
    await page.fill(
      'textarea',
      'Un if/else evalúa una condición. Si es verdadera ejecuta el primer bloque, si es falsa ejecuta el bloque else.',
    );
    await page.click('button:has-text("Enviar respuesta")');

    // Wait for AI evaluation (may take a few seconds)
    await expect(page.getByText('Fase de código')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('.monaco-editor')).toBeVisible();
  });

  test('back button returns to challenge list', async ({ page }) => {
    await page.goto(`/challenges/${CHALLENGE_ID}`);
    await page.click('button:has-text("Volver a retos")');
    await page.waitForURL('/challenges');
    await expect(page.getByText('Tu primer condicional')).toBeVisible();
  });
});
