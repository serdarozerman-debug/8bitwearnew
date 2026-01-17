// Make.com webhook entegrasyonu için yardımcı fonksiyonlar
// Make.com, n8n'e göre daha stabil ve hızlı çalışıyor

export interface MakeWebhookPayload {
  event: string
  timestamp: string
  data: any
}

export interface MakeWebhookResponse {
  success: boolean
  message?: string
  error?: string
}

/**
 * Make.com'a webhook gönderimi
 * @param webhookUrl - Make.com'dan alınan webhook URL
 * @param payload - Gönderilecek data
 * @param retries - Hata durumunda retry sayısı (default: 3)
 */
export async function sendToMake(
  webhookUrl: string,
  payload: MakeWebhookPayload,
  retries: number = 3
): Promise<MakeWebhookResponse> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[Make.com] Attempt ${attempt}/${retries}:`, payload.event)

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': '8BitWear/1.0',
        },
        body: JSON.stringify(payload),
        // Timeout 30 saniye
        signal: AbortSignal.timeout(30000),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      
      console.log(`[Make.com] Success:`, payload.event)
      
      return {
        success: true,
        message: result.message || 'Webhook sent successfully',
      }
    } catch (error: any) {
      lastError = error
      console.error(`[Make.com] Attempt ${attempt} failed:`, error.message)

      // Son denemeden önce bekle (exponential backoff)
      if (attempt < retries) {
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
        console.log(`[Make.com] Waiting ${waitTime}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
  }

  // Tüm denemeler başarısız
  console.error(`[Make.com] All attempts failed for event: ${payload.event}`)
  
  return {
    success: false,
    error: lastError?.message || 'Unknown error',
  }
}

/**
 * Sipariş oluşturulduğunda Make.com'a bildirim
 */
export async function notifyOrderCreated(orderData: {
  orderNumber: string
  userId: string
  items: any[]
  totalAmount: number
  customerEmail: string
  customerName: string
}) {
  const webhookUrl = process.env.MAKE_WEBHOOK_ORDER_CREATED
  if (!webhookUrl) {
    console.warn('[Make.com] MAKE_WEBHOOK_ORDER_CREATED not configured')
    return { success: false, error: 'Webhook URL not configured' }
  }

  return sendToMake(webhookUrl, {
    event: 'order.created',
    timestamp: new Date().toISOString(),
    data: orderData,
  })
}

/**
 * Ödeme tamamlandığında Make.com'a bildirim
 */
export async function notifyPaymentCompleted(paymentData: {
  orderNumber: string
  amount: number
  currency: string
  paymentIntentId: string
  customerEmail: string
}) {
  const webhookUrl = process.env.MAKE_WEBHOOK_PAYMENT_COMPLETED
  if (!webhookUrl) {
    console.warn('[Make.com] MAKE_WEBHOOK_PAYMENT_COMPLETED not configured')
    return { success: false, error: 'Webhook URL not configured' }
  }

  return sendToMake(webhookUrl, {
    event: 'payment.completed',
    timestamp: new Date().toISOString(),
    data: paymentData,
  })
}

/**
 * AI tasarım oluşturulduğunda Make.com'a bildirim
 */
export async function notifyDesignCreated(designData: {
  orderNumber: string
  designUrl: string
  attemptNumber: number
  isApproved: boolean
}) {
  const webhookUrl = process.env.MAKE_WEBHOOK_DESIGN_CREATED
  if (!webhookUrl) {
    console.warn('[Make.com] MAKE_WEBHOOK_DESIGN_CREATED not configured')
    return { success: false, error: 'Webhook URL not configured' }
  }

  return sendToMake(webhookUrl, {
    event: 'design.created',
    timestamp: new Date().toISOString(),
    data: designData,
  })
}

/**
 * Kargo gönderildiğinde Make.com'a bildirim
 */
export async function notifyShipmentCreated(shipmentData: {
  orderNumber: string
  trackingNumber: string
  carrier: string
  customerEmail: string
  estimatedDelivery?: string
}) {
  const webhookUrl = process.env.MAKE_WEBHOOK_SHIPMENT_CREATED
  if (!webhookUrl) {
    console.warn('[Make.com] MAKE_WEBHOOK_SHIPMENT_CREATED not configured')
    return { success: false, error: 'Webhook URL not configured' }
  }

  return sendToMake(webhookUrl, {
    event: 'shipment.created',
    timestamp: new Date().toISOString(),
    data: shipmentData,
  })
}

/**
 * Make.com'dan gelen webhook'ları doğrulama
 */
export function verifyMakeWebhook(
  request: Request,
  expectedSecret?: string
): boolean {
  if (!expectedSecret) {
    // Secret yoksa doğrulama yapma (development için)
    return true
  }

  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false
  }

  const token = authHeader.substring(7)
  return token === expectedSecret
}
