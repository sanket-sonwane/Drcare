import { test, expect } from '@playwright/test'

test.describe('payments pillar', () => {
  test('tabs, snapshots, reconciliation, outstanding actions', async ({ page }) => {
    await page.goto('/payments')
    await expect(page.getByText('Collected', { exact: false }).first()).toBeVisible()
    await expect(page.getByText('Expected', { exact: false }).first()).toBeVisible()
    await expect(page.getByText('Day Summary', { exact: false })).toBeVisible()
    await expect(page.getByText('Care Programs')).toBeVisible()

    for (const tab of ['Today', 'Transactions', 'Pending', 'Overdue']) {
      await expect(page.getByRole('link', { name: tab, exact: true }).first()).toBeVisible()
    }
    await page.getByRole('link', { name: 'Pending', exact: true }).last().click()
    await expect(page).toHaveURL(/tab=pending/)
    await expect(page.getByText('Outstanding Payments')).toBeVisible()

    await page.getByRole('link', { name: 'Overdue', exact: true }).last().click()
    await expect(page).toHaveURL(/tab=overdue/)
    await expect(page.getByText('Overdue Payments')).toBeVisible()
  })

  test('patient payments tab has quick collect', async ({ page }) => {
    await page.goto('/patients')
    const link = page.locator('a[href^="/patients/pt_"]').first()
    await expect(link).toBeVisible()
    await link.click()
    await page.getByRole('tab', { name: 'Payments' }).click()
    await expect(page.locator('body')).toContainText(/Collect Payment|All clear|Balance/)
  })
})
