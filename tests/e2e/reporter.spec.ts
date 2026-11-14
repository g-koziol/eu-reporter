import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

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

test('stores a project dictionary value and selects it from a day field', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: '⋯' }).click();
  await page.getByRole('button', { name: 'Słowniki' }).click();
  await expect(page.locator('app-dictionaries-page select')).toHaveValue(/^project-/);

  await page.getByLabel('Klucz pola').fill('day.area');
  await page.getByRole('button', { name: 'Dodaj słownik' }).click();
  await page.getByPlaceholder('Nowa wartość').fill('Placówka szkolna');
  await page.getByRole('button', { name: 'Dodaj wartość' }).click();
  const savedValue = page.locator('.dictionary-value-row input').first();
  await expect(savedValue).toHaveValue('Placówka szkolna');
  await savedValue.fill('Wsparcie w szkole');
  await page.locator('.dictionary-value-row button').filter({ hasText: 'Zapisz' }).click();
  await expect(savedValue).toHaveValue('Wsparcie w szkole');

  await page.getByRole('button', { name: 'Powrót do kalendarza' }).click();
  const day = page.locator('app-day-card article.day:not(.off)').first();
  await day.getByRole('button', { name: 'Otwórz słownik dla pola day.area' }).click();
  await page.getByRole('searchbox', { name: 'Szukaj zapisanych wartości' }).fill('szkol');
  await page.getByRole('button', { name: 'Wsparcie w szkole' }).click();

  await expect(day.getByPlaceholder('Opisz miejsce lub obszar wykonanej pracy')).toHaveValue('Wsparcie w szkole');
  page.on('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: '⋯' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Eksport JSON' }).click();
  const download = await downloadPromise;
  const exported = JSON.parse(await readFile(await download.path(), 'utf8'));
  expect(exported.data.dictionaries).toContainEqual({
    id: JSON.stringify([await page.locator('app-reporter-toolbar select').nth(1).inputValue(), 'day.area']),
    projectId: await page.locator('app-reporter-toolbar select').nth(1).inputValue(),
    fieldKey: 'day.area',
    values: ['Wsparcie w szkole']
  });
  expect(pageErrors).toEqual([]);
});

test('rejects malformed JSON imports without crashing the calendar', async ({ page }) => {
  const pageErrors: string[] = [];
  const dialogs: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('dialog', async (dialog) => {
    dialogs.push(dialog.message());
    await dialog.accept();
  });

  await page.goto('/');
  const month = await page.locator('input[type="month"]').inputValue();
  const profileId = await page.locator('app-reporter-toolbar select').nth(0).inputValue();
  const projectId = await page.locator('app-reporter-toolbar select').nth(1).inputValue();
  const malformedImport = {
    config: {},
    months: {
      [month]: {
        [profileId]: {
          [projectId]: { days: [] }
        }
      }
    }
  };
  await page.getByRole('button', { name: '⋯' }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'malformed.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(malformedImport))
  });

  await expect.poll(() => dialogs).toContain('Import zastąpi bieżącą konfigurację i wszystkie lokalnie zapisane dane. Czy kontynuować?');
  await expect.poll(() => dialogs.length).toBe(2);
  await expect.poll(() => dialogs[1]).toContain('Nieprawidłowa struktura danych miesięcznych');
  await expect(page.locator('app-calendar-view')).toBeVisible();
  expect(pageErrors).toEqual([]);
});