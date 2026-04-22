import { test, expect } from '@playwright/test';

test.describe('Phase 2 — The Classroom: Teacher Flow', () => {
  const teacherEmail = `teacher-${Date.now()}@test.com`;
  const goldenTicket = 'fragments-secret';

  test('Teacher should be able to register, create a challenge and view analytics', async ({ page }) => {
    // 1. Registration
    await page.goto('http://localhost:3000/register/teacher');
    await page.fill('input[type="text"] >> nth=0', 'Test Teacher');
    await page.fill('input[type="email"]', teacherEmail);
    await page.fill('input[type="password"]', 'password123');
    await page.fill('input[placeholder="Introduce el ticket..."]', goldenTicket);
    await page.click('button:has-text("Registrarse como Docente")');

    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });

    // 2. Access Challenge Editor
    await page.goto('http://localhost:3000/teacher/challenges/new');
    await expect(page.getByTestId('page-title')).toContainText('Nuevo Reto');

    // 3. Fill challenge details
    await page.fill('input[placeholder="Ej: El misterio de los bucles"]', 'Reto Playwright');
    await page.fill('textarea[placeholder="Explica de qué trata este reto..."]', 'Un reto creado automáticamente por el bot de testing.');
    
    // 4. Add a conceptual phase
    await page.click('button[title="Agregar fase conceptual"]');
    await page.fill('textarea[placeholder="¿Qué hace la función print()?"]', '¿Cuál es el color del cielo?');
    
    // 5. Verify preview
    const previewTitle = page.locator('h1').filter({ hasText: 'Reto Playwright' });
    await expect(previewTitle).toBeVisible();
    // Use specific paragraph locator for the preview content
    await expect(page.locator('p').filter({ hasText: '¿Cuál es el color del cielo?' })).toBeVisible();

    // 6. Test Preview Interaction
    await page.fill('textarea[placeholder="Escribe tu respuesta aquí..."]', 'Azul');
    await page.click('button:has-text("Enviar respuesta")');
    // Check for the success state in the ChallengeShell
    await expect(page.getByText('Lumen aprendió algo nuevo')).toBeVisible();

    // 7. Save Draft
    await page.click('button:has-text("Guardar borrador")');

    // 8. View Analytics
    await page.goto('http://localhost:3000/teacher/analytics');
    await expect(page.getByRole('heading', { name: 'Monitoreo en Vivo' })).toBeVisible();
    await expect(page.locator('text=Sistema activo')).toBeVisible();
  });
});
