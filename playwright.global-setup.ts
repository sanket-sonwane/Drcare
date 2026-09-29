import { request } from '@playwright/test'

// Reset the demo store before each run so tests stay order-independent.
async function globalSetup() {
  const ctx = await request.newContext()
  await ctx.get('http://localhost:3106/api/demo/reset')
  await ctx.dispose()
}

export default globalSetup