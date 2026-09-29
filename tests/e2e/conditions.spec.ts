import { test, expect, type Page } from '@playwright/test'

async function firstPatientId(page: Page): Promise<string> {
  await page.goto('/patients')
  const link = page.locator('a[href^="/patients/pt_"]').first()
  await expect(link).toBeVisible()
  const href = await link.getAttribute('href')
  return href!.split('/')[2]
}

test.describe('condition tagging (PRD §14)', () => {
  test('toggle a condition chip on the patient header', async ({ page }) => {
    const id = await firstPatientId(page)
    await page.goto(`/patients/${id}`)

    // seeded chips for Rahul
    await expect(page.getByRole('button', { name: 'Remove Hypertension' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Remove Diabetes' })).toBeVisible()

    // enters editor, tags PCOD / PCOS (not seeded for Rahul)
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    await page.getByRole('button', { name: 'PCOD / PCOS', exact: true }).click()
    await expect(page.getByText('Conditions updated', { exact: false })).toBeVisible()

    // chip appears on header after persist+refresh
    await expect(page.getByRole('button', { name: 'Remove PCOD / PCOS' })).toBeVisible({ timeout: 10000 })
  })

  test('untag a seeded condition', async ({ page }) => {
    const id = await firstPatientId(page)
    await page.goto(`/patients/${id}`)

    await page.getByRole('button', { name: 'Remove Diabetes', exact: true }).click()
    await expect(page.getByText('Conditions updated', { exact: false })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Remove Diabetes', exact: true })).toHaveCount(0)

    // restore the seed set so downstream specs (diabetes filter) stay valid
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    await page.getByRole('button', { name: 'Diabetes', exact: true }).click()
    await expect(page.getByText('Conditions updated', { exact: false })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Remove Diabetes', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Done', exact: true }).click()
  })
})