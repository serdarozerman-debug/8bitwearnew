import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Prisma 7: For builds without real database, we use datasources config
// TypeScript doesn't recognize datasources in type definition, but it works at runtime
const createPrismaClient = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    // @ts-ignore - Prisma 7 datasources is not in type definition but works at runtime
    datasources: {
      db: {
        url: process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || 'file:./dev.db'
      }
    }
  } as any)
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
