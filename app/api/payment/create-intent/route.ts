import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createPaymentIntent } from '@/lib/stripe'

// Force Node.js runtime for Prisma compatibility
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { orderId } = body

    // Siparişi kontrol et
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Sipariş bulunamadı' },
        { status: 404 }
      )
    }

    // Sipariş durumu kontrolü - tasarım onaylanmış mı?
    if (order.status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Tasarım henüz onaylanmadı' },
        { status: 400 }
      )
    }

    // Zaten ödenmiş mi kontrolü
    if (order.paymentStatus === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Bu sipariş zaten ödenmiş' },
        { status: 400 }
      )
    }

    // Stripe payment intent oluştur
    const totalAmountInKurus = Math.round(parseFloat(order.totalAmount.toString()) * 100)
    
    const { clientSecret, paymentIntentId } = await createPaymentIntent({
      amount: totalAmountInKurus,
      orderId: order.id,
      customerEmail: order.user.email,
      metadata: {
        orderNumber: order.orderNumber,
        userId: order.userId,
      },
    })

    // Stripe payment ID'yi kaydet
    await prisma.order.update({
      where: { id: orderId },
      data: {
        stripePaymentId: paymentIntentId,
        status: 'PENDING_PAYMENT',
      },
    })

    return NextResponse.json({
      success: true,
      clientSecret,
      amount: totalAmountInKurus,
      currency: 'try',
    })
  } catch (error: any) {
    console.error('Payment intent creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Ödeme oluşturulamadı' },
      { status: 500 }
    )
  }
}
