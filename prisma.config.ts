import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  // A placeholder is used when no database is configured yet (demo mode),
  // so Prisma CLI commands like `generate`/`format` still work offline.
  datasource: {
    url: process.env.DATABASE_URL || 'postgresql://demo:demo@localhost:5432/demo',
  },
})