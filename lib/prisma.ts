import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Prisma 7: For builds without real database, we use a mock client
// In production, real DATABASE_URL from Vercel env will be used
const createPrismaClient = () => {
  try {
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      // Prisma 7 requires datasources or will use prisma.config.ts
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'file:./dev.db'
        }
      }
    })
  } catch (error) {
    console.warn('Prisma Client initialization failed, using mock client:', error)
    // Return a mock client for build time
    return new PrismaClient({
      log: ['error'],
      datasources: {
        db: {
          url: 'file:./dev.db'
        }
      }
    })
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
