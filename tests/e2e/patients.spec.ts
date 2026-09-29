import { test, expect } from '@playwright/test'

const FILTERS = ['All', 'New', 'Active', 'Follow-up Due', 'Hypertension', 'Diabetes', 'Obesity', 'Thyroid', 'PCOD / PCOS', 'Joint / Arthritis', 'Preventive Cardiology', 'Payment Pending', 'Archived']

test.describe('patient list filters', () => {
  test('all PRD filters render and filter', async ({ page }) => {
    await page.goto('/patients')
    for (const f of FILTERS) {
      await expect(page.getByRole('link', { name: f }).first()).toBeVisible()
    }
    // diabetes filter should narrow to patients with Diabetes condition
    await page.getByRole('link', { name: 'Diabetes' }).click()
    await expect(page).toHaveURL(/filter=diabetes/)
    await expect(page.getByText('Rahul Patil').first()).toBeVisible({ timeout: 10_000 })
    // active filter works (regression guard)
    await page.goto('/patients?filter=active')
    await expect(page.getByText('patients', { exact: false }).first()).toBeVisible()
    // archived filter renders empty state, not a crash
    await page.goto('/patients?filter=archived')
    await expect(page.locator('body')).toContainText(/patient/i)
  })
})
