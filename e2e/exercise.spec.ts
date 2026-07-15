import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('opens the editorial studio with no detectable accessibility violations', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /make every small word count/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /three writing desks/i })).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('completes a guided academic draft and saves progress', async ({ page }) => {
  await page.goto('/?genre=academic&mode=guided&draft=academic-urban-trees');

  await expect(page.getByRole('heading', { name: 'Urban trees and summer heat' })).toBeVisible();
  const answers = ['the', 'an', 'the', 'a', 'an', 'the', 'a', 'the', 'the', 'the', 'the'];
  const gaps = page.locator('#guided-editor select');
  await expect(gaps).toHaveCount(answers.length);
  for (const [index, answer] of answers.entries()) {
    await gaps.nth(index).selectOption(answer);
  }
  await page.getByRole('button', { name: /check this draft/i }).click();

  await expect(page.getByText(/clean copy/i)).toBeVisible();
  await expect(page.locator('#score-value')).toHaveText(String(answers.length));
  await expect(page.locator('#session-count')).toHaveText('1');
});

test('grades exact placements in editor mode', async ({ page }) => {
  await page.goto('/?genre=business&mode=editor&draft=business-bakery');

  const textarea = page.getByLabel('Article-free working copy');
  await expect(textarea).not.toHaveValue(/\b(?:a|an|the)\b/iu);
  await textarea.fill(
    'The bakery plans to open a second site near the railway station in September. An independent survey found strong demand for an early breakfast service, but the new location will require a larger production team. The owners have secured a five-year lease and expect the shop to reach a monthly profit within the first year.',
  );
  await page.getByRole('button', { name: /check this draft/i }).click();

  await expect(page.getByText(/clean copy/i)).toBeVisible();
  await expect(page.locator('#score-value')).toHaveText('12');
});

test('fits the exercise on a mobile viewport without horizontal overflow', async ({ page }) => {
  await page.goto('/?genre=fiction&mode=guided&draft=fiction-night-train');
  await expect(page.locator('#practice')).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
