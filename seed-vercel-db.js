const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://neondb_owner:npg_mkpVd7TGaWQ5@ep-silent-surf-ah5hju6k-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
    }
  }
})

async function main() {
  console.log('🌱 Seeding Vercel database...')
  
  // Create product
  const product = await prisma.product.upsert({
    where: { slug: 'premium-tisort' },
    update: {},
    create: {
      slug: 'premium-tisort',
      name: 'Premium Tişört',
      description: '8-bit pixel art tasarımlarınızı hayata geçirin',
      category: 'TSHIRT',
      basePrice: 249.99,
      images: ['/white-tshirt.png']
    }
  })
  
  console.log('✅ Created product:', product.name)
  
  // Create variants
  const colors = ['white', 'black', 'navy', 'gray', 'burgundy', 'pink', 'yellow', 'green']
  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
  
  let count = 0
  for (const color of colors) {
    for (const size of sizes) {
      const sku = `PREMIUM-TSHIRT-${color.toUpperCase()}-${size}`
      await prisma.productVariant.upsert({
        where: { sku },
        update: {},
        create: {
          productId: product.id,
          color,
          size,
          sku,
          stock: 100
        }
      })
      count++
    }
  }
  
  console.log(`✅ Created ${count} variants`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
