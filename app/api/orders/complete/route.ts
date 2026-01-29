import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/orders/complete
 * 
 * Webhook/hook that triggers when an order is completed/paid.
 * Automatically:
 * 1. Converts pixel art PNG → STL
 * 2. Saves STL to database
 * 3. Notifies supplier via email
 * 4. Updates order status to SENT_TO_SUPPLIER
 * 
 * @body orderId - Order ID (internal database ID)
 * 
 * @returns { success, processedItems, errors }
 */
export async function POST(req: NextRequest) {
  try {
    const { orderId, orderNumber } = await req.json()

    if (!orderId && !orderNumber) {
      return NextResponse.json({
        success: false,
        error: 'Either orderId or orderNumber required'
      }, { status: 400 })
    }

    console.log('[Order Complete] Processing order:', orderId || orderNumber)

    // 1. Fetch order from database with all relations
    const order = await prisma.order.findUnique({
      where: orderId ? { id: orderId } : { orderNumber: orderNumber },
      include: {
        user: true,
        shippingAddress: true,
        items: {
          include: {
            product: true,
            variant: true
          }
        },
        aiGenerations: {
          where: {
            isApproved: true
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json({
        success: false,
        error: 'Order not found'
      }, { status: 404 })
    }

    console.log(`[Order Complete] Found order ${order.orderNumber} with ${order.aiGenerations.length} AI generations`)

    // 2. Process each AI generation (pixel art → 3D print)
    const processedItems: string[] = []
    const errors: string[] = []

    for (const aiGen of order.aiGenerations) {
      try {
        // Skip if no pixel art or already has STL
        if (!aiGen.pixelArtUrl) {
          console.log(`[Order Complete] Skipping AI generation ${aiGen.id} - no pixel art`)
          continue
        }

        if (aiGen.stlUrl) {
          console.log(`[Order Complete] Skipping AI generation ${aiGen.id} - STL already exists`)
          processedItems.push(aiGen.id)
          continue
        }

        console.log(`[Order Complete] Processing AI generation ${aiGen.id}`)

        // 2a. Convert PNG → STL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3200}`
        const convertRes = await fetch(`${baseUrl}/api/3d-print/convert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pixelArtImageUrl: aiGen.pixelArtUrl,
            orderNumber: order.orderNumber
          })
        })

        const convertData = await convertRes.json()

        if (!convertData.success) {
          throw new Error(`STL conversion failed: ${convertData.error}`)
        }

        console.log(`[Order Complete] ✅ STL created:`, convertData.stlUrl)

        // 2b. Update AI generation with STL data
        await prisma.aIGeneration.update({
          where: { id: aiGen.id },
          data: {
            stlUrl: convertData.stlUrl,
            stlStats: convertData.stats
          }
        })

        // 2c. Notify supplier
        const orderItem = order.items[0] // Assuming first item (adjust as needed)
        
        const notifyRes = await fetch(`${baseUrl}/api/supplier/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderNumber: order.orderNumber,
            stlUrl: convertData.stlUrl,
            pixelArtUrl: aiGen.pixelArtUrl,
            customerInfo: {
              name: order.user.name || 'N/A',
              email: order.user.email,
              phone: order.user.phone || 'N/A',
              address: formatAddress(order.shippingAddress)
            },
            productInfo: {
              name: orderItem.product.name,
              size: orderItem.variant.size,
              color: orderItem.variant.color,
              quantity: orderItem.quantity
            }
          })
        })

        const notifyData = await notifyRes.json()

        if (!notifyData.success) {
          console.warn('[Order Complete] ⚠️ Supplier notification failed:', notifyData.error)
          errors.push(`Supplier notification failed for ${aiGen.id}: ${notifyData.error}`)
        } else {
          console.log(`[Order Complete] ✅ Supplier notified:`, notifyData.emailId)
        }

        processedItems.push(aiGen.id)

      } catch (error: any) {
        console.error(`[Order Complete] ❌ Error processing AI generation ${aiGen.id}:`, error)
        errors.push(`${aiGen.id}: ${error.message}`)
      }
    }

    // 3. Update order status to SENT_TO_SUPPLIER (if at least one item processed)
    if (processedItems.length > 0) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'SENT_TO_SUPPLIER',
          sentToSupplierAt: new Date()
        }
      })

      console.log(`[Order Complete] ✅ Order ${order.orderNumber} marked as SENT_TO_SUPPLIER`)
    }

    // 4. Return summary
    return NextResponse.json({
      success: true,
      orderNumber: order.orderNumber,
      processedItems: processedItems.length,
      totalItems: order.aiGenerations.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully processed ${processedItems.length}/${order.aiGenerations.length} items`
    })

  } catch (error: any) {
    console.error('[Order Complete] ❌ Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 })
  }
}

/**
 * Helper: Format address for email
 */
function formatAddress(address: any): string {
  if (!address) return 'N/A'
  
  return `${address.fullName}
${address.addressLine1}
${address.addressLine2 ? address.addressLine2 + '\n' : ''}${address.district}, ${address.city} ${address.postalCode}
${address.country}
Tel: ${address.phone}`
}
