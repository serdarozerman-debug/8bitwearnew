import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { constructWebhookEvent } from '@/lib/stripe'
import { sendOrderConfirmationEmail, sendSupplierEmail } from '@/lib/email'
import { notifyPaymentCompleted, notifyOrderCreated } from '@/lib/make'

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      )
    }

    // Webhook event'i doğrula
    const event = await constructWebhookEvent(body, signature)

    // Event type'a göre işlem yap
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object
        const orderId = paymentIntent.metadata.orderId

        if (!orderId) {
          console.error('No orderId in payment intent metadata')
          break
        }

        console.log('[Stripe Webhook] Payment succeeded for order:', orderId)

        // Siparişi güncelle
        const order = await prisma.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: 'COMPLETED',
            status: 'PAID',
            paidAt: new Date(),
          },
          include: {
            user: true,
            shippingAddress: true,
            items: {
              include: {
                product: true,
                variant: true,
              },
            },
          },
        })

        // Müşteriye onay emaili gönder
        await sendOrderConfirmationEmail(
          order.user.email,
          order.orderNumber,
          order.totalAmount.toString()
        )

        // Tedarikçiye email gönder
        const supplierEmailData = {
          orderNumber: order.orderNumber,
          customerName: order.user.name || order.user.email,
          customerEmail: order.user.email,
          items: order.items.map((item) => ({
            productName: item.product.name,
            variant: `${item.variant.color} - ${item.variant.size}`,
            quantity: item.quantity,
            customization: item.customization,
            designUrl: item.approvedDesignUrl || '',
          })),
          shippingAddress: {
            fullName: order.shippingAddress.fullName,
            phone: order.shippingAddress.phone,
            addressLine1: order.shippingAddress.addressLine1,
            addressLine2: order.shippingAddress.addressLine2 || undefined,
            city: order.shippingAddress.city,
            district: order.shippingAddress.district,
            postalCode: order.shippingAddress.postalCode,
          },
          totalAmount: order.totalAmount.toString(),
        }

        await sendSupplierEmail(supplierEmailData)

        // Supplier order kaydı oluştur
        await prisma.supplierOrder.create({
          data: {
            orderId: order.id,
            supplierEmail: process.env.SUPPLIER_EMAIL || 'supplier@example.com',
            supplierName: process.env.SUPPLIER_NAME || 'Tedarikçi',
            emailSentAt: new Date(),
            emailStatus: 'sent',
          },
        })

        // Sipariş durumunu güncelle
        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: 'SENT_TO_SUPPLIER',
          },
        })

        // Make.com'a bildirim gönder (async)
        Promise.all([
          notifyPaymentCompleted({
            orderNumber: order.orderNumber,
            amount: parseFloat(order.totalAmount.toString()),
            currency: 'TRY',
            paymentIntentId: paymentIntent.id,
            customerEmail: order.user.email,
          }),
          notifyOrderCreated({
            orderNumber: order.orderNumber,
            userId: order.userId,
            items: order.items.map(item => ({
              productName: item.product.name,
              quantity: item.quantity,
              customization: item.customization,
            })),
            totalAmount: parseFloat(order.totalAmount.toString()),
            customerEmail: order.user.email,
            customerName: order.user.name || order.user.email,
          }),
        ]).catch(err => console.error('[Make.com] Webhook notifications failed:', err))

        console.log(`✅ Order ${order.orderNumber} payment completed and sent to supplier`)
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object
        const orderId = paymentIntent.metadata.orderId

        if (orderId) {
          await prisma.order.update({
            where: { id: orderId },
            data: {
              paymentStatus: 'FAILED',
            },
          })
        }

        console.log(`❌ Payment failed for order ${orderId}`)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 400 }
    )
  }
}
