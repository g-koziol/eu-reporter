import { expect, test } from '@playwright/test';

test('creates an activity and restores it after reload', async ({ page }) => {
  await page.goto('/');

  const day = page.locator('app-day-card article.day:not(.off)').first();
  await expect(day).toBeVisible();
  await day.getByRole('button', { name: '+ Dodaj działanie' }).click();
  await day.getByPlaceholder('Co zostało wykonane?').fill('Playwright: przygotowanie raportu');

  await expect(day.locator('details summary').first()).toContainText('Działania w ciągu dnia (1)');
  await expect(page.locator('.stat').filter({ hasText: 'Liczba działań' })).toContainText('1');
  await expect(page.locator('.toast-host')).toContainText('Zapisano zmiany');

  await page.reload();

  const restoredDay = page.locator('app-day-card article.day:not(.off)').first();
  await expect(restoredDay.getByPlaceholder('Co zostało wykonane?')).toHaveValue('Playwright: przygotowanie raportu');
  await expect(restoredDay.locator('details summary').first()).toContainText('Działania w ciągu dnia (1)');
});

test('adds a profile from the configuration page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '⋯' }).click();
  await page.getByRole('button', { name: 'Konfiguracja' }).click();

  await page.getByRole('button', { name: /Dodaj profil/ }).click();

  const profileSelect = page.locator('app-reporter-toolbar select').first();
  await expect(profileSelect).toContainText('Nowy profil');
  await expect(profileSelect).toHaveValue(/^profile-/);
});

test('submits batch entries for selected weekdays', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Masowe dodawanie wpisów' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: /Dodaj wpisy dla/ })).toBeVisible();
  await dialog.getByLabel('Opis działania').fill('Playwright: wpis zbiorczy');
  const estimate = await dialog.getByText(/^Dni do uzupełnienia:/).innerText();
  const expectedEntries = Number(estimate.match(/\d+/)?.[0]);
  expect(expectedEntries).toBeGreaterThan(0);

  await dialog.getByRole('button', { name: 'Dodaj wpisy' }).click();

  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.stat').filter({ hasText: 'Liczba działań' })).toContainText(String(expectedEntries));
  await expect(page.locator('app-day-card article.day:not(.off) textarea[placeholder="Co zostało wykonane?"]')).toHaveCount(expectedEntries);
});