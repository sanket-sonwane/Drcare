import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE ?? 'http://localhost:3000'
const OUT = process.env.OUT ?? 'test-runs/shots/before'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()

async function shot(page, name) {
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false })
  console.log(`saved ${name}`)
}

async function run() {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message))
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE:', m.text().slice(0, 200)) })

  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' })
  await shot(page, 'dashboard')
  await page.screenshot({ path: `${OUT}/dashboard-full.png`, fullPage: true })

  await page.goto(`${BASE}/patients`, { waitUntil: 'networkidle' })
  await shot(page, 'patients')
  await page.screenshot({ path: `${OUT}/patients-full.png`, fullPage: true })

  const link = page.locator('a[href^="/patients/pt_"]').first()
  await link.waitFor()
  const href = await link.getAttribute('href')
  const id = href.split('/')[2]

  await page.goto(`${BASE}/patients/${id}`, { waitUntil: 'networkidle' })
  await shot(page, 'patient-detail')
  await page.screenshot({ path: `${OUT}/patient-detail-full.png`, fullPage: true })

  await page.getByRole('tab', { name: 'Payments' }).click()
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${OUT}/patient-payments.png`, fullPage: true })

  await page.goto(`${BASE}/patients/${id}/consultations/new`, { waitUntil: 'networkidle' })
  await shot(page, 'followup-form')
  await page.screenshot({ path: `${OUT}/followup-form-full.png`, fullPage: true })

  await page.goto(`${BASE}/payments`, { waitUntil: 'networkidle' })
  await shot(page, 'payments')
  await page.screenshot({ path: `${OUT}/payments-full.png`, fullPage: true })

  await page.goto(`${BASE}/appointments`, { waitUntil: 'networkidle' })
  await shot(page, 'appointments')

  await page.goto(`${BASE}/insights`, { waitUntil: 'networkidle' })
  await shot(page, 'insights')

  await browser.close()
}

run().catch((e) => { console.error(e); process.exit(1) })