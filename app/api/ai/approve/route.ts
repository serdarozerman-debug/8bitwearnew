import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { generationId, isApproved, feedback } = body

    // AI generation kaydını bul
    const generation = await prisma.aIGeneration.findUnique({
      where: { id: generationId },
      include: {
        order: {
          include: {
            items: true,
          },
        },
      },
    })

    if (!generation) {
      return NextResponse.json(
        { error: 'Tasarım bulunamadı' },
        { status: 404 }
      )
    }

    if (isApproved) {
      // Tasarım onaylandı
      await prisma.aIGeneration.update({
        where: { id: generationId },
        data: { isApproved: true },
      })

      // Order item'a onaylanmış tasarımı ekle
      await prisma.orderItem.updateMany({
        where: { orderId: generation.orderId },
        data: { approvedDesignUrl: generation.generatedImageUrl },
      })

      // Sipariş durumunu güncelle
      await prisma.order.update({
        where: { id: generation.orderId },
        data: { status: 'APPROVED' },
      })

      return NextResponse.json({
        success: true,
        message: 'Tasarım onaylandı',
        nextStep: 'payment',
      })
    } else {
      // Tasarım reddedildi - feedback kaydedildi
      await prisma.aIGeneration.update({
        where: { id: generationId },
        data: { customerFeedback: feedback },
      })

      // Maksimum deneme kontrolü
      const totalAttempts = await prisma.aIGeneration.count({
        where: { orderId: generation.orderId },
      })

      if (totalAttempts >= 3) {
        return NextResponse.json({
          success: true,
          message: 'Maksimum deneme sayısına ulaşıldı',
          requiresSupport: true,
        })
      }

      return NextResponse.json({
        success: true,
        message: 'Geri bildiriminiz alındı',
        nextStep: 'regenerate',
        remainingAttempts: 3 - totalAttempts,
      })
    }
  } catch (error: any) {
    console.error('Approval API error:', error)
    return NextResponse.json(
      { error: error.message || 'Onay işlemi başarısız oldu' },
      { status: 500 }
    )
  }
}
