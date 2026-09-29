import { test, expect, type Page } from '@playwright/test'

async function firstPatientId(page: Page): Promise<string> {
  await page.goto('/patients')
  const link = page.locator('a[href^="/patients/pt_"]').first()
  await expect(link).toBeVisible()
  const href = await link.getAttribute('href')
  return href!.split('/')[2]
}

test.describe('v2 billing pillar', () => {
  test('invoice + ledger + package enrollment render on the patient billing tab', async ({ page }) => {
    const id = await firstPatientId(page)
    await page.goto(`/patients/${id}`)
    await page.getByRole('tab', { name: 'Payments' }).click()

    // balance strip
    await expect(page.getByText('Patient Balance', { exact: false }).first()).toBeVisible()
    await expect(page.getByText('Total', { exact: false }).first()).toBeVisible()
    await expect(page.getByText('Paid', { exact: false }).first()).toBeVisible()

    // invoices generated from seeded demographics (§68-70)
    await expect(page.getByText('Invoices', { exact: true })).toBeVisible()
    await expect(page.getByText('INV-1001', { exact: true })).toBeVisible()

    // ledger classifies CHARGE / PAYMENT
    await expect(page.getByText('Ledger', { exact: true })).toBeVisible()
    await expect(page.getByText('CHARGE', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('PAYMENT', { exact: true }).first()).toBeVisible()

    // seeded enrollment: 12-week program, 3 of 6 visits
    await expect(page.getByText('Care Programs', { exact: true })).toBeVisible()
    await expect(page.getByText('12-Week Metabolic Program', { exact: false }).first()).toBeVisible()
    await expect(page.getByText('Visit 3/6', { exact: false })).toBeVisible()
  })

  test('payments page renders transaction rows and dynamic care programs card', async ({ page }) => {
    await page.goto('/payments')
    await page.getByRole('link', { name: 'Transactions', exact: true }).last().click()
    await expect(page.getByRole('columnheader', { name: 'Invoice' })).toBeVisible()
    await expect(page.locator('tbody tr').first()).toBeVisible()

    // dynamic care programs card (was static demo card)
    await expect(page.getByText('Care Programs', { exact: true })).toBeVisible()
    await expect(page.getByText('Visit 3/6', { exact: false })).toBeVisible()
    await page.getByRole('button', { name: 'Enroll Patient' }).click()
    await expect(page.getByRole('combobox', { name: 'Program' })).toContainText('Hypertension Monitoring Pack')
  })
})