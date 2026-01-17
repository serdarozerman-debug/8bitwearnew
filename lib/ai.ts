import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 3,
  timeout: 60000, // 60 saniye timeout
})

export interface AIGenerationParams {
  originalImageUrl?: string
  customizationDetails: {
    type: 'logo' | 'print' | 'label' | 'embroidery' | 'text'
    placement: string
    size: string
    colors?: string[]
    text?: string // Metin tasarımları için
    fontFamily?: string
    additionalNotes?: string
  }
  attemptNumber: number
  previousFeedback?: string
}

/**
 * OpenAI DALL-E 3 için optimize edilmiş prompt oluşturma
 * KRITIK: Prompt uzunluğu ve yapısı dikkatle ele alınmalı
 * - Max 4000 karakter (OpenAI limiti)
 * - Net, spesifik talimatlar
 * - Gereksiz kelimeler yok
 */
function buildOptimizedPrompt(params: AIGenerationParams): string {
  const { customizationDetails, attemptNumber, previousFeedback } = params
  
  // Tip'e göre kısa, net açıklama
  const typeDescriptions: Record<string, string> = {
    logo: 'professional logo design',
    print: '3D print-ready design',
    embroidery: 'embroidery-suitable design with clear lines',
    label: 'clothing label design',
    text: 'typographic text design',
  }

  // Yerleşim ve boyut bilgisi kısalt
  const placementMap: Record<string, string> = {
    'front-center': 'centered',
    'front-left': 'left chest',
    'front-right': 'right chest',
    'back-center': 'back centered',
    'sleeve-left': 'left sleeve',
    'sleeve-right': 'right sleeve',
  }

  const sizeMap: Record<string, string> = {
    small: '10x10cm',
    medium: '15x15cm',
    large: '20x20cm',
    xlarge: '25x25cm',
  }

  // Core prompt - kısa ve net
  let promptParts: string[] = [
    `Create a ${typeDescriptions[customizationDetails.type] || 'custom design'}`,
  ]

  // Metin tasarımı ise
  if (customizationDetails.type === 'text' && customizationDetails.text) {
    promptParts.push(
      `with text: "${customizationDetails.text.substring(0, 100)}"`,
      customizationDetails.fontFamily ? `in ${customizationDetails.fontFamily} font` : 'modern font'
    )
  }

  // Renk bilgisi
  if (customizationDetails.colors && customizationDetails.colors.length > 0) {
    const colorStr = customizationDetails.colors.slice(0, 3).join(', ') // Max 3 renk
    promptParts.push(`using colors: ${colorStr}`)
  }

  // Teknik gereksinimler - kısa
  promptParts.push(
    'High quality, clean design',
    'Suitable for clothing print',
    'White or transparent background',
    'Sharp edges, bold contrast'
  )

  // Önceki feedback varsa - max 200 karakter
  if (previousFeedback && attemptNumber > 1) {
    const trimmedFeedback = previousFeedback.substring(0, 200)
    promptParts.push(`Customer feedback: ${trimmedFeedback}`)
  }

  // Ek notlar - max 150 karakter
  if (customizationDetails.additionalNotes) {
    const trimmedNotes = customizationDetails.additionalNotes.substring(0, 150)
    promptParts.push(trimmedNotes)
  }

  // Prompt'u birleştir - Max 1000 karakter (güvenli limit)
  const fullPrompt = promptParts.join('. ') + '.'
  const finalPrompt = fullPrompt.substring(0, 1000)

  console.log('[AI] Prompt length:', finalPrompt.length, 'chars')
  
  return finalPrompt
}

/**
 * AI görsel üretimi - Gelişmiş hata yönetimi ve retry logic
 */
export async function generateCustomDesign(params: AIGenerationParams): Promise<string> {
  const maxRetries = 3
  let lastError: Error | null = null

  // Prompt oluştur ve validate et
  let prompt: string
  try {
    prompt = buildOptimizedPrompt(params)
    
    if (prompt.length < 10) {
      throw new Error('Prompt too short - insufficient design details')
    }
    if (prompt.length > 4000) {
      throw new Error('Prompt too long - will be truncated')
    }
  } catch (error: any) {
    console.error('[AI] Prompt building error:', error)
    throw new Error(`Prompt oluşturulamadı: ${error.message}`)
  }

  // Retry loop ile API çağrısı
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[AI] DALL-E 3 request attempt ${attempt}/${maxRetries}`)
      console.log('[AI] Prompt:', prompt.substring(0, 200) + '...')

      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        style: "vivid",
      })

      // Response validation
      if (!response || !response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid API response structure')
      }

      if (response.data.length === 0) {
        throw new Error('No images returned from API')
      }

      const imageUrl = response.data[0]?.url
      if (!imageUrl || typeof imageUrl !== 'string') {
        throw new Error('Invalid image URL in response')
      }

      // URL validation
      if (!imageUrl.startsWith('http')) {
        throw new Error('Image URL is not valid HTTP(S) URL')
      }

      console.log('[AI] Success! Image generated:', imageUrl.substring(0, 50) + '...')
      
      return imageUrl
    } catch (error: any) {
      lastError = error
      
      // Error logging
      console.error(`[AI] Attempt ${attempt} failed:`, {
        message: error.message,
        code: error.code,
        type: error.type,
        status: error.status,
      })

      // Rate limit hatası
      if (error.code === 'rate_limit_exceeded') {
        const waitTime = Math.min(5000 * attempt, 30000)
        console.log(`[AI] Rate limited. Waiting ${waitTime}ms...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        continue
      }

      // Content policy hatası - tekrar deneme
      if (error.code === 'content_policy_violation') {
        console.error('[AI] Content policy violation - prompt may need adjustment')
        throw new Error('Tasarım içeriği politikalara uygun değil. Lütfen farklı bir tasarım deneyin.')
      }

      // Invalid API key
      if (error.status === 401) {
        throw new Error('OpenAI API key geçersiz. Lütfen sistem yöneticisi ile iletişime geçin.')
      }

      // Son denemeden önce bekle
      if (attempt < maxRetries) {
        const waitTime = 2000 * attempt
        console.log(`[AI] Waiting ${waitTime}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
  }

  // Tüm denemeler başarısız
  console.error('[AI] All retry attempts failed')
  
  throw new Error(
    lastError?.message || 
    'AI görsel üretimi başarısız oldu. Lütfen tekrar deneyin veya destek ekibi ile iletişime geçin.'
  )
}

// Alternatif: GPT-4 Vision ile görsel analizi
export async function analyzeCustomerImage(imageUrl: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Bu görseli analiz et ve 3D baskı için hangi detayların önemli olduğunu, renkleri ve genel tasarım önerilerini Türkçe olarak açıkla. Kısa ve öz tut."
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
              }
            }
          ]
        }
      ],
      max_tokens: 300,
    })

    return response.choices[0]?.message?.content || 'Analiz yapılamadı'
  } catch (error) {
    console.error('Image analysis error:', error)
    throw new Error('Görsel analizi başarısız oldu')
  }
}
