import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createInvoice, generateInvoiceNumber } from '@/lib/invoice'

// Bu endpoint kargo teslim edildiğinde tetiklenir (webhook veya manuel)
// Force Node.js runtime for Prisma compatibility
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { orderNumber, deliveryConfirmed } = body

    if (!deliveryConfirmed) {
      return NextResponse.json(
        { error: 'Teslimat onayı gerekli' },
        { status: 400 }
      )
    }

    // Siparişi bul
    const order = await prisma.order.findUnique({
      where: { orderNumber },
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

    if (!order) {
      return NextResponse.json(
        { error: 'Sipariş bulunamadı' },
        { status: 404 }
      )
    }

    // Zaten fatura kesilmiş mi kontrol et
    if (order.invoiceNumber) {
      return NextResponse.json(
        { 
          success: true,
          message: 'Fatura zaten kesilmiş',
          invoiceNumber: order.invoiceNumber,
          invoiceUrl: order.invoiceUrl,
        }
      )
    }

    // Fatura numarası oluştur
    const invoiceNumber = generateInvoiceNumber()

    // Fatura verilerini hazırla
    const invoiceItems = order.items.map((item) => ({
      description: `${item.product.name} - ${item.variant.color} ${item.variant.size}`,
      quantity: item.quantity,
      unitPrice: parseFloat(item.unitPrice.toString()),
      vatRate: 18, // KDV %18
      vatAmount: parseFloat(item.totalPrice.toString()) * 0.18,
      totalAmount: parseFloat(item.totalPrice.toString()) * 1.18,
    }))

    // Kargo için fatura kalemi ekle
    if (parseFloat(order.shippingCost.toString()) > 0) {
      invoiceItems.push({
        description: 'Kargo Ücreti',
        quantity: 1,
        unitPrice: parseFloat(order.shippingCost.toString()),
        vatRate: 18,
        vatAmount: parseFloat(order.shippingCost.toString()) * 0.18,
        totalAmount: parseFloat(order.shippingCost.toString()) * 1.18,
      })
    }

    const invoiceData = {
      invoiceNumber,
      invoiceDate: new Date(),
      customerInfo: {
        name: order.shippingAddress.fullName,
        taxNumber: undefined, // Bireysel müşteriler için genelde yok
        taxOffice: undefined,
        address: `${order.shippingAddress.addressLine1} ${order.shippingAddress.addressLine2 || ''}`.trim(),
        city: `${order.shippingAddress.district} / ${order.shippingAddress.city}`,
        country: order.shippingAddress.country,
        email: order.user.email,
        phone: order.shippingAddress.phone,
      },
      items: invoiceItems,
      subtotal: parseFloat(order.subtotal.toString()),
      totalVat: parseFloat(order.taxAmount.toString()),
      totalAmount: parseFloat(order.totalAmount.toString()),
      currency: 'TRY',
      notes: `Sipariş No: ${order.orderNumber}`,
    }

    // E-Fatura oluştur
    const invoiceResult = await createInvoice(invoiceData)

    if (!invoiceResult.success) {
      throw new Error('Fatura oluşturulamadı')
    }

    // Siparişi güncelle
    await prisma.order.update({
      where: { id: order.id },
      data: {
        invoiceNumber: invoiceResult.invoiceNumber,
        invoiceUrl: invoiceResult.invoiceUrl,
        invoicedAt: invoiceResult.invoiceDate,
        deliveredAt: new Date(),
        status: 'DELIVERED',
      },
    })

    console.log(`✅ Invoice created for order ${order.orderNumber}: ${invoiceResult.invoiceNumber}`)

    return NextResponse.json({
      success: true,
      invoice: {
        invoiceNumber: invoiceResult.invoiceNumber,
        invoiceUrl: invoiceResult.invoiceUrl,
        invoiceDate: invoiceResult.invoiceDate,
      },
    })
  } catch (error: any) {
    console.error('Invoice creation API error:', error)
    return NextResponse.json(
      { error: error.message || 'Fatura oluşturulamadı' },
      { status: 500 }
    )
  }
}
