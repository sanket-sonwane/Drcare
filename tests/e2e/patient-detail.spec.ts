import { test, expect, type Page } from '@playwright/test'

async function firstPatientId(page: Page): Promise<string> {
  await page.goto('/patients')
  const link = page.locator('a[href^="/patients/pt_"]').first()
  await expect(link).toBeVisible()
  const href = await link.getAttribute('href')
  return href!.split('/')[2]
}

test.describe('patient 360 story', () => {
  test('snapshot, balance, banner, tabs, progress, timeline, care plan', async ({ page }) => {
    const id = await firstPatientId(page)
    await page.goto(`/patients/${id}`)
    // header + conditions
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /Start Follow-up/ })).toBeVisible()
    // health snapshot
    const snapshot = page.getByLabel('Health snapshot')
    await expect(snapshot).toBeVisible()
    await expect(snapshot.getByText('Weight')).toBeVisible()
    await expect(snapshot.getByText('HbA1c')).toBeVisible()
    // financial snapshot
    await expect(page.getByText('Patient Balance')).toBeVisible()
    await expect(page.getByText('Pending', { exact: false }).first()).toBeVisible()
    // progress banner (per-domain, no single score)
    await expect(page.getByText('Current Status')).toBeVisible()
    // tabs
    for (const tab of ['Overview', 'Progress', 'Visits', 'Care Plan', 'Payments']) {
      await expect(page.getByRole('tab', { name: tab })).toBeVisible()
    }
    // cardio board
    await expect(page.getByText('Cardiometabolic Snapshot')).toBeVisible()
    await expect(page.getByText('Risk Factor Board')).toBeVisible()
    // progress tab → previous-vs-today
    await page.getByRole('tab', { name: 'Progress' }).click()
    await expect(page.getByText('Previous', { exact: false }).first()).toBeVisible()
    await expect(page.getByText('Today', { exact: false }).first()).toBeVisible()
    // visits tab → timeline + measurements filter
    await page.getByRole('tab', { name: 'Visits' }).click()
    await expect(page.getByText('Patient Story Timeline')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Measurements', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Measurements', exact: true }).click()
    // care plan tab
    await page.getByRole('tab', { name: 'Care Plan' }).click()
    await expect(page.locator('body')).toContainText(/Care Plan|No care plan/i)
    // payments tab → balance + collect
    await page.getByRole('tab', { name: 'Payments' }).click()
    await expect(page.locator('body')).toContainText(/Balance|Payment/i)
  })
})
