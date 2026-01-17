import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateCustomDesign } from '@/lib/ai'
import { notifyDesignCreated } from '@/lib/make'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { orderId, designElements, previousFeedback } = body

    // Sipariş kontrolü
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        aiGenerations: {
          orderBy: { attemptNumber: 'desc' },
          take: 1,
        },
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Sipariş bulunamadı' },
        { status: 404 }
      )
    }

    // Attempt sayısını belirle
    const attemptNumber = order.aiGenerations[0]
      ? order.aiGenerations[0].attemptNumber + 1
      : 1

    // Maximum 3 deneme kontrolü
    if (attemptNumber > 3) {
      return NextResponse.json(
        { 
          error: 'Maksimum deneme sayısına ulaşıldı',
          message: 'En fazla 3 tasarım üretimi yapılabilir. Lütfen müşteri hizmetleri ile iletişime geçin.'
        },
        { status: 400 }
      )
    }

    // Design elements'ten customization details oluştur
    const hasText = designElements.some((el: any) => el.type === 'text')
    const hasImage = designElements.some((el: any) => el.type === 'image')
    
    const textElement = designElements.find((el: any) => el.type === 'text')
    const imageElement = designElements.find((el: any) => el.type === 'image')

    const customizationDetails = {
      type: hasText ? 'text' as const : 'print' as const,
      placement: 'custom',
      size: 'custom',
      text: textElement?.text,
      fontFamily: textElement?.fontFamily,
      colors: textElement?.color ? [textElement.color] : undefined,
      additionalNotes: `Design with ${designElements.length} elements: ${
        designElements.map((el: any) => el.type).join(', ')
      }`,
    }

    // AI ile görsel üret
    console.log('[API] Starting AI generation...')
    const generatedImageUrl = await generateCustomDesign({
      originalImageUrl: imageElement?.imageUrl,
      customizationDetails,
      attemptNumber,
      previousFeedback,
    })

    console.log('[API] AI generation successful')

    // Veritabanına kaydet
    const aiGeneration = await prisma.aIGeneration.create({
      data: {
        orderId,
        originalImageUrl: imageElement?.imageUrl || '',
        prompt: JSON.stringify({ customizationDetails, designElements }),
        generatedImageUrl,
        attemptNumber,
        customerFeedback: previousFeedback,
        isApproved: false,
        aiModel: 'dall-e-3',
        aiParameters: designElements,
      },
    })

    // Sipariş durumunu güncelle
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'AWAITING_APPROVAL',
      },
    })

    // Make.com'a bildirim gönder (async, hata olsa bile devam et)
    notifyDesignCreated({
      orderNumber: order.orderNumber,
      designUrl: generatedImageUrl,
      attemptNumber,
      isApproved: false,
    }).catch(err => console.error('[Make.com] Notification failed:', err))

    return NextResponse.json({
      success: true,
      generation: {
        id: aiGeneration.id,
        imageUrl: generatedImageUrl,
        attemptNumber,
        maxAttempts: 3,
        remainingAttempts: 3 - attemptNumber,
      },
    })
  } catch (error: any) {
    console.error('[API] AI generation error:', error)
    
    // Hata detaylarını logla
    return NextResponse.json(
      { 
        error: error.message || 'Görsel üretimi başarısız oldu',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
