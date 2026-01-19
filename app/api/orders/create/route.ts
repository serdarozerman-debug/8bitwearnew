import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateOrderNumber } from '@/lib/utils'

// Force Node.js runtime for Prisma compatibility
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      userId,
      items, // [{ productId, variantId, quantity, customization, originalImageUrl }]
      addressId,
      trafficSource,
    } = body

    // Kullanıcı kontrolü
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı' },
        { status: 404 }
      )
    }

    // Adres kontrolü
    const address = await prisma.address.findUnique({
      where: { id: addressId },
    })

    if (!address || address.userId !== userId) {
      return NextResponse.json(
        { error: 'Geçersiz adres' },
        { status: 400 }
      )
    }

    // Ürünleri ve varyantları kontrol et, fiyatları hesapla
    let subtotal = 0
    const orderItemsData = []

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      })

      const variant = await prisma.productVariant.findUnique({
        where: { id: item.variantId },
      })

      if (!product || !variant || !product.isActive) {
        return NextResponse.json(
          { error: `Ürün bulunamadı: ${item.productId}` },
          { status: 400 }
        )
      }

      // Stok kontrolü
      if (variant.stock < item.quantity) {
        return NextResponse.json(
          { error: `Yetersiz stok: ${product.name} - ${variant.color} ${variant.size}` },
          { status: 400 }
        )
      }

      const unitPrice = parseFloat(product.basePrice.toString()) + parseFloat(variant.additionalPrice.toString())
      const totalPrice = unitPrice * item.quantity

      subtotal += totalPrice

      orderItemsData.push({
        productId: product.id,
        variantId: variant.id,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        customization: item.customization,
      })
    }

    // Kargo ve vergi hesapla
    const shippingCost = 50 // Sabit kargo ücreti, dinamik yapılabilir
    const taxRate = 0.18 // KDV %18
    const taxAmount = (subtotal + shippingCost) * taxRate
    const totalAmount = subtotal + shippingCost + taxAmount

    // Sipariş oluştur
    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId,
        addressId,
        subtotal,
        shippingCost,
        taxAmount,
        totalAmount,
        status: 'PENDING_PAYMENT',
        paymentStatus: 'PENDING',
        trafficSource: trafficSource?.source,
        utmSource: trafficSource?.utm_source,
        utmMedium: trafficSource?.utm_medium,
        utmCampaign: trafficSource?.utm_campaign,
        items: {
          create: orderItemsData,
        },
      },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
        shippingAddress: true,
      },
    })

    // Analytics kaydı oluştur
    await prisma.analytics.create({
      data: {
        sessionId: req.headers.get('x-session-id') || `session-${Date.now()}`,
        userId,
        trafficSource: trafficSource?.source,
        utmSource: trafficSource?.utm_source,
        utmMedium: trafficSource?.utm_medium,
        utmCampaign: trafficSource?.utm_campaign,
        page: '/checkout',
        event: 'order_created',
        eventData: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          totalAmount,
        },
      },
    })

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        items: order.items,
      },
    })
  } catch (error: any) {
    console.error('Order creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Sipariş oluşturulamadı' },
      { status: 500 }
    )
  }
}
