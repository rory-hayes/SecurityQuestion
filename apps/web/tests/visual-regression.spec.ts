import { test, expect } from '@playwright/test'

test('landing page visual baseline', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveScreenshot('landing.png', { fullPage: true })
})

test('review queue visual baseline', async ({ page }) => {
  await page.goto('/app/review')
  await expect(page).toHaveScreenshot('review-queue.png', { fullPage: true })
})
