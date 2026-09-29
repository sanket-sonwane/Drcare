import { test, expect, type Page } from '@playwright/test'

async function firstPatientId(page: Page): Promise<string> {
  await page.goto('/patients')
  const link = page.locator('a[href^="/patients/pt_"]').first()
  await expect(link).toBeVisible()
  const href = await link.getAttribute('href')
  return href!.split('/')[2]
}

test.describe('refund flow (PRD §69)', () => {
  test('refund a paid payment → REFUNDED badge + ledger REFUND entry', async ({ page }) => {
    const id = await firstPatientId(page)
    await page.goto(`/patients/${id}`)
    await page.getByRole('tab', { name: 'Payments' }).click()

    await expect(page.getByText('Patient Balance', { exact: false }).first()).toBeVisible()
    const refundButton = page.getByRole('button', { name: 'Refund' }).first()
    if ((await refundButton.count()) === 0) {
      test.skip(true, 'no paid payment left to refund in this store session')
      return
    }
    await refundButton.click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('Refund Payment')).toBeVisible()
    await dialog.getByLabel('Reason').fill('Duplicate charge')

    await dialog.getByRole('button', { name: 'Confirm Refund' }).click()
    await expect(page.getByText('Refund recorded', { exact: false })).toBeVisible()

    // payment row now Refunded + ledger gains a REFUND line
    await expect(page.getByLabel('Refunded (REFUNDED)')).toBeVisible()
    await expect(page.getByText('REFUND', { exact: true }).first()).toBeVisible()
  })
})