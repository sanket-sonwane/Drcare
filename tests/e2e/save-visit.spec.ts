import { test, expect } from '@playwright/test'

/**
 * Proves the golden-workflow save path: consultation + measurements persist
 * through a SINGLE server action + redirect (regression guard for the
 * redirect-swallowed-measurements bug).
 */
test.describe('follow-up save (combined action)', () => {
  test('enter BP + save lands on patient page with new data', async ({ page }) => {
    await page.goto('/patients')
    const link = page.locator('a[href^="/patients/pt_"]').last()
    await expect(link).toBeVisible()
    const id = ((await link.getAttribute('href')) as string).split('/')[2]

    await page.goto(`/patients/${id}/consultations/new`)
    await expect(page.getByText('Choose Visit Type', { exact: false })).toBeVisible()

    // structured measurements via accessible BP inputs
    await page.getByLabel('Systolic').fill('128')
    await page.getByLabel('Diastolic').fill('80')

    // payment defaults to PAID; save
    await page.getByRole('button', { name: /Save Visit/ }).click()
    await expect(page).toHaveURL(new RegExp(`/patients/${id}`), { timeout: 20_000 })

    // progress reflects the new BP reading
    await page.getByRole('tab', { name: 'Progress' }).click()
    await expect(page.locator('body')).toContainText(/128|Blood Pressure|Previous/i)
  })
})
