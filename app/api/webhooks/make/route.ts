import { NextRequest, NextResponse } from 'next/server'
import { verifyMakeWebhook } from '@/lib/make'
import { prisma } from '@/lib/prisma'
import { sendShippingNotificationEmail } from '@/lib/email'

/**
 * Make.com'dan gelen webhook'ları dinler
 * Kullanım senaryoları:
 * 1. Tedarikçi üretim tamamladı bildirimi
 * 2. Kargo şirketi gönderi oluşturdu
 * 3. Teslimat gerçekleşti
 */
export async function POST(req: NextRequest) {
  try {
    // Webhook doğrulama
    const isValid = verifyMakeWebhook(req, process.env.MAKE_WEBHOOK_SECRET)
    if (!isValid) {
      console.error('[Make Webhook] Invalid signature')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { event, data, timestamp } = body

    console.log(`[Make Webhook] Received: ${event}`, { data, timestamp })

    switch (event) {
      // Üretim tamamlandı
      case 'production.completed': {
        const { orderNumber } = data
        
        const order = await prisma.order.findUnique({
          where: { orderNumber },
        })

        if (!order) {
          return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        // Sipariş durumunu güncelle
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'IN_PRODUCTION',
          },
        })

        // Supplier order güncelle
        await prisma.supplierOrder.updateMany({
          where: { orderId: order.id },
          data: {
            productionCompleted: new Date(),
          },
        })

        console.log(`✅ Production completed for order: ${orderNumber}`)
        break
      }

      // Kargo oluşturuldu
      case 'shipment.created': {
        const { orderNumber, trackingNumber, carrier, estimatedDelivery } = data

        const order = await prisma.order.findUnique({
          where: { orderNumber },
          include: {
            user: true,
          },
        })

        if (!order) {
          return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        // Sipariş durumunu güncelle
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'SHIPPED',
            trackingNumber,
            shippingProvider: carrier,
            shippedAt: new Date(),
          },
        })

        // Müşteriye kargo bildirimi gönder
        const trackingUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/orders/${orderNumber}/tracking`
        
        await sendShippingNotificationEmail(
          order.user.email,
          orderNumber,
          trackingNumber,
          trackingUrl
        )

        console.log(`✅ Shipment created for order: ${orderNumber}`)
        break
      }

      // Teslimat tamamlandı
      case 'delivery.completed': {
        const { orderNumber } = data

        const order = await prisma.order.findUnique({
          where: { orderNumber },
        })

        if (!order) {
          return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        // Sipariş durumunu güncelle
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'DELIVERED',
            deliveredAt: new Date(),
          },
        })

        // TODO: Otomatik fatura kesimi tetikle
        // notifyInvoiceCreation(orderNumber)

        console.log(`✅ Delivery completed for order: ${orderNumber}`)
        break
      }

      default:
        console.log(`[Make Webhook] Unhandled event: ${event}`)
    }

    return NextResponse.json({ success: true, received: event })
  } catch (error: any) {
    console.error('[Make Webhook] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

// GET endpoint - webhook durumu kontrolü
export async function GET() {
  return NextResponse.json({
    status: 'active',
    service: 'Make.com Webhook Receiver',
    timestamp: new Date().toISOString(),
  })
}
