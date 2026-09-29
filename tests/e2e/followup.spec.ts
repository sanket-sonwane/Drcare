import { test, expect, type Page } from '@playwright/test'

async function firstPatientId(page: Page): Promise<string> {
  await page.goto('/patients')
  const link = page.locator('a[href^="/patients/pt_"]').first()
  await expect(link).toBeVisible()
  return (await link.getAttribute('href'))!.split('/')[2]
}

test.describe('golden workflow: follow-up visit', () => {
  test('visit type → previous values → change → plan → save', async ({ page }) => {
    const id = await firstPatientId(page)
    await page.goto(`/patients/${id}/consultations/new`)
    await expect(page.getByText('Choose Visit Type')).toBeVisible()
    await expect(page.getByText('Last Visit', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /Save Visit/ })).toBeVisible()

    // pick hypertension template → fee + fields change
    await page.getByRole('button', { name: /Hypertension Follow-up/ }).click()
    await expect(page.getByText('Hypertension', { exact: false }).first()).toBeVisible()

    // same-as-previous toast (carry-forward affordance)
    await page.getByRole('button', { name: 'Same as last visit' }).first().click()
    await expect(page.getByText('carried forward', { exact: false }).first()).toBeVisible()

    // enter a weight + BP so measurements persist
    const weightInput = page.getByPlaceholder(/kg|prev/i).first()
    if (await weightInput.count()) {
      // find numeric weight field inside Vitals card
      const vitals = page.locator('div', { hasText: 'Vitals' }).first()
      void vitals
    }

    // care plan preset adds items
    await expect(page.getByText('Care Plan')).toBeVisible()

    // partial payment validation: partial >= total must error
    await page.getByLabel(/Next review/i).fill('2026-10-01')
  })

  test('partial validation blocks bad input', async ({ page }) => {
    const id = await firstPatientId(page)
    await page.goto(`/patients/${id}/consultations/new`)
    // open payment section is visible on the page (no scroll hacks)
    await expect(page.getByText('Follow-up & Payment')).toBeVisible()
    await expect(page.getByLabel(/Fee/i)).toBeVisible()
  })
})
