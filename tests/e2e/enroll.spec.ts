import { test, expect } from '@playwright/test'

test.describe('care program enrollment (PRD §71-73)', () => {
  test('enroll a patient from the payments page care programs card', async ({ page }) => {
    await page.goto('/payments')
    await expect(page.getByText('Care Programs', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Enroll Patient' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // pick a patient with no enrollment yet
    const patientSelect = dialog.getByLabel('Patient')
    const patientValue = await patientSelect.locator('option', { hasText: 'Suresh' }).getAttribute('value')
    await patientSelect.selectOption(patientValue!)
    const programSelect = dialog.getByLabel('Program')
    const programValue = await programSelect.locator('option', { hasText: 'Hypertension Monitoring Pack' }).getAttribute('value')
    await programSelect.selectOption(programValue!)

    await dialog.getByRole('button', { name: 'Enroll', exact: true }).click()
    await expect(page.getByText('Enrolled', { exact: false }).first()).toBeVisible()

    // enrollment card appears on the payments page
    await expect(page.getByText('Hypertension Monitoring Pack', { exact: false }).first()).toBeVisible()
    await expect(page.getByText('Visit 0/3', { exact: false }).first()).toBeVisible()
  })
})