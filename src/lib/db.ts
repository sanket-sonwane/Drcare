import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

export function isLive() {
  return Boolean(process.env.NEXT_PUBLIC_DEMO_MODE !== 'true' && process.env.DATABASE_URL)
}

// Single shared PrismaClient instance stored on globalThis to avoid
// exhausting the connection pool in dev / hot-reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export function getPrisma(): PrismaClient {
  if (!isLive()) {
    throw new Error('Prisma is not configured. Set DATABASE_URL and NEXT_PUBLIC_DEMO_MODE=false.')
  }
  if (!globalForPrisma.prisma) {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    })
    globalForPrisma.prisma = new PrismaClient({ adapter })
  }
  return globalForPrisma.prisma
}