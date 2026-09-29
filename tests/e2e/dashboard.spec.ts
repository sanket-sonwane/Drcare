import { test, expect } from '@playwright/test'

test.describe('dashboard command center', () => {
  test('KPI cards, revenue snapshot, queue Open actions', async ({ page }) => {
    await page.goto('/dashboard')
    // KPI cards clickable
    await expect(page.getByText("Today's Patients", { exact: true })).toBeVisible()
    await expect(page.getByText('Follow-ups Due', { exact: true })).toBeVisible()
    await expect(page.getByText("Today's Collection", { exact: true })).toBeVisible()
    await expect(page.getByText('Pending Payments', { exact: true })).toBeVisible()
    // revenue snapshot: collected / expected / pending
    await expect(page.getByText('Collected', { exact: false }).first()).toBeVisible()
    await expect(page.getByText('Expected', { exact: false }).first()).toBeVisible()
    await expect(page.getByText('Pending', { exact: false }).first()).toBeVisible()
    // progress snapshot is now derived live (no illustrative baseline)
    await expect(page.getByText('Patients Improving')).toBeVisible()
    await expect(page.getByText('Follow-ups Completed')).toBeVisible()
    await expect(page.getByText('Care Plan Adherence')).toBeVisible()
    await expect(page.getByText('Derived live', { exact: false })).toBeVisible()
    await expect(page.getByText('Illustrative', { exact: false })).toHaveCount(0)
    // queue columns Time/Patient/Visit Type/Status/Payment/Action
    await expect(page.getByText("Today's Queue")).toBeVisible()
    const openButtons = page.getByRole('link', { name: 'Open' })
    expect(await openButtons.count()).toBeGreaterThan(0)
    // attention center
    await expect(page.getByText('Attention Center')).toBeVisible()
  })
})
