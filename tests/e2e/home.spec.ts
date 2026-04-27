import { test, expect } from '@playwright/test';

test('home renders hero and taller section', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Gestioná tus miedos');
  await expect(page.getByText('Taller de Coloquio')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Abriendo Caminos' })).toBeVisible();
});

test('whatsapp button is present and has correct link', async ({ page }) => {
  await page.goto('/');
  const wa = page.getByRole('link', { name: 'Contactar por WhatsApp' });
  await expect(wa).toBeVisible();
  await expect(wa).toHaveAttribute('href', /wa\.me\/541126132412/);
});

test('navigating to taller detail works', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Ver detalle completo' }).click();
  await expect(page).toHaveURL(/\/talleres\/coloquio/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Taller de Coloquio');
});
