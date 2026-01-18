import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Next.js App Router body size config (10MB)
export const runtime = 'nodejs'
export const maxDuration = 120 // 120 seconds max
export const dynamic = 'force-dynamic'

const openaiKey = process.env.OPENAI_API_KEY
const replicateToken = process.env.REPLICATE_API_TOKEN

const openai = new OpenAI({
  apiKey: openaiKey,
  maxRetries: 3,
  timeout: 120000, // 120 seconds for image processing
})

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, prompt, provider } = await req.json()

    if (!imageUrl || !prompt) {
      return NextResponse.json(
        { error: 'imageUrl and prompt are required' },
        { status: 400 }
      )
    }

    if (!openaiKey && !replicateToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI sağlayıcısı yapılandırılmamış (OPENAI_API_KEY veya REPLICATE_API_TOKEN gerekli)',
        },
        { status: 500 }
      )
    }

    if (provider === 'replicate' && !replicateToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Replicate kullanılamıyor: REPLICATE_API_TOKEN eksik',
        },
        { status: 400 }
      )
    }

    console.log('[AI Convert] Starting IMAGE-TO-IMAGE transformation using OpenAI Images API...')
    console.log('[AI Convert] Input image size:', imageUrl.length, 'bytes')

    // Dynamic import sharp for Next.js compatibility
    const sharp = (await import('sharp')).default
    
    // Base64 data URL'i buffer'a çevir
    const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '')
    const inputBuffer = Buffer.from(base64Data, 'base64')
    
    console.log('[AI Convert] Converting to PNG format...')
    
    // Sharp ile PNG'ye çevir ve 4MB altına düşür
    const pngBuffer = await sharp(inputBuffer)
      .resize(1024, 1024, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .png()
      .toBuffer()
    
    // PNG metadata'yı al (boyut için)
    const metadata = await sharp(pngBuffer).metadata()
    const width = metadata.width || 1024
    const height = metadata.height || 1024
    
    console.log('[AI Convert] PNG created, size:', pngBuffer.length, 'bytes', `${width}x${height}`)
    
    // PNG File objesi oluştur
    const imageFile = new File([pngBuffer], 'input.png', { type: 'image/png' })
    
    // Mask oluştur (aynı boyutta, tamamen transparent - tüm görüntüyü edit et)
    const maskBuffer = await sharp({
      create: {
        width: width,
        height: height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
    .png()
    .toBuffer()
    
    const maskFile = new File([maskBuffer], 'mask.png', { type: 'image/png' })
    
    console.log('[AI Convert] Mask created, size:', maskBuffer.length, 'bytes', `${width}x${height}`)

    // ULTRA FLAT PROMPT - Her parça TEK RENK (no shading at all) + VIBRANT COLORS
    const standardPrompt = `Create a COLORFUL VIBRANT pixel art character from this photo. 64x64 pixels. TRANSPARENT BACKGROUND.

CRITICAL RULES - EACH BODY PART MUST BE ONE SOLID BRIGHT FLAT COLOR:
- Hair: ONE solid DARK/BRIGHT color (brown/black/blonde/red), rounded blob, NO strands, NO shading
- Face/skin: ONE solid peachy/tan color, NO shading, simple oval shape
- Jacket/top: ONE solid BRIGHT color (white/red/blue/green), simple shape, NO folds, NO shading
- Pants: ONE solid DARK color (black/blue), NO shading
- Shoes: ONE solid BRIGHT color, NO shading

Use VIBRANT, SATURATED colors - NOT gray, NOT washed out, NOT pale.
BLACK OUTLINES ONLY around each shape to separate parts.

Style: Like classic NES/Game Boy Color sprites - FLAT solid colors, simple geometric shapes, BRIGHT and COLORFUL.
NO gradients, NO shading, NO highlights, NO shadows, NO texture, NO details, NO gray tones.

Background MUST be completely transparent (alpha=0). NO scenery, NO ground, NO sky.`

    const finalPrompt = standardPrompt.substring(0, 1000)

    console.log('[AI Convert] ===== PROMPT (len:', finalPrompt.length, ') =====')
    console.log(finalPrompt)
    console.log('[AI Convert] ===== END PROMPT =====')

    const preferReplicate = provider === 'replicate'
    let convertedImageUrl: string | null = null
    let providerUsed: 'openai-edit' | 'replicate' | '' = ''

    // Common helper: Replicate fallback (SDXL image-to-image)
    const tryReplicate = async (): Promise<string | null> => {
      if (!replicateToken) {
        console.warn('[AI Convert] Replicate token not configured, skipping replicate fallback')
        return null
      }

      // SDXL image-to-image model version (stability-ai/sdxl image-to-image)
      const modelVersion =
        process.env.REPLICATE_SDXL_VERSION ||
        'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a089f5b1c712de7dfd16655c0cd860e19fd5d7151a'

      const dataUri = `data:image/png;base64,${pngBuffer.toString('base64')}`

      console.log('[AI Convert] Replicate: creating prediction...')
      const createRes = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${replicateToken}`,
        },
        body: JSON.stringify({
          version: modelVersion,
          input: {
            prompt: finalPrompt + ' Single figure centered.',
            negative_prompt:
              'two people, multiple characters, duplicate, twins, crowd, extra person, clone, mirror, shading, gradients, blur, background, text, watermark, lighting effects, realistic details, strands, texture',
            image: dataUri,
            num_outputs: 1,
            num_inference_steps: 28,
            guidance_scale: 6.5, // Düşürdük (çoğaltma riski azalır)
            strength: 0.75, // Biraz düşürdük
            output_format: 'png',
          },
        }),
      })

      if (!createRes.ok) {
        const errText = await createRes.text().catch(() => '')
        console.warn('[AI Convert] Replicate create failed:', createRes.status, errText)
        return null
      }

      const createJson: any = await createRes.json()
      const predictionId = createJson?.id
      if (!predictionId) {
        console.warn('[AI Convert] Replicate create missing id')
        return null
      }

      // Poll prediction
      const pollUrl = `https://api.replicate.com/v1/predictions/${predictionId}`
      const maxAttempts = 15
      const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

      for (let i = 0; i < maxAttempts; i++) {
        const pollRes = await fetch(pollUrl, {
          headers: { Authorization: `Bearer ${replicateToken}` },
        })
        if (!pollRes.ok) {
          console.warn('[AI Convert] Replicate poll failed:', pollRes.status)
          return null
        }
        const pollJson: any = await pollRes.json()
        if (pollJson?.status === 'succeeded') {
          const out = pollJson.output?.[0]
          if (out) {
            console.log('[AI Convert] Replicate success')
            return out as string
          }
          return null
        }
        if (pollJson?.status === 'failed' || pollJson?.status === 'canceled') {
          console.warn('[AI Convert] Replicate failed status:', pollJson?.status)
          return null
        }
        await delay(1500)
      }

      console.warn('[AI Convert] Replicate timed out')
      return null
    }

    // 1) If requested, try Replicate first
    if (preferReplicate) {
      convertedImageUrl = await tryReplicate()
      if (convertedImageUrl) providerUsed = 'replicate'
    }

    // 2) OpenAI edit with image+mask (primary path when available)
    if (!convertedImageUrl && openaiKey) {
      try {
        console.log('[AI Convert] Calling OpenAI Images API edit (gpt-image-1, img2img)...')
        const editResponse = await openai.images.edit({
          model: 'gpt-image-1',
          prompt: finalPrompt,
          size: '1024x1024',
          image: imageFile,
          mask: maskFile,
          n: 1,
        })

        const choice = editResponse.data?.[0]
        if (choice?.url) {
          convertedImageUrl = choice.url
        } else if (choice?.b64_json) {
          convertedImageUrl = `data:image/png;base64,${choice.b64_json}`
        } else {
          convertedImageUrl = null
        }
        if (convertedImageUrl) providerUsed = 'openai-edit'
      } catch (err: any) {
        console.warn('[AI Convert] OpenAI edit failed, will try Replicate...', err?.message || err)
      }
    }

    // 3) Replicate fallback if OpenAI path failed
    if (!convertedImageUrl) {
      convertedImageUrl = await tryReplicate()
      if (convertedImageUrl) providerUsed = 'replicate'
    }

    if (!convertedImageUrl) {
      throw new Error('No image URL returned from providers')
    }

    console.log('[AI Convert] ✅ SUCCESS! Image-to-image transformation completed')
    console.log('[AI Convert] Output URL:', convertedImageUrl)

    // POST-PROCESSING: Convert to true 64x64 pixel art with nearest-neighbor
    console.log('[AI Convert] Post-processing: Converting to 64x64 pixel art...')
    let finalImageUrl = convertedImageUrl

    try {
      // Download the AI output
      const aiImageRes = await fetch(convertedImageUrl.startsWith('data:') 
        ? convertedImageUrl 
        : convertedImageUrl)
      
      let aiImageBuffer: Buffer
      if (convertedImageUrl.startsWith('data:image/png;base64,')) {
        // Already base64
        const b64 = convertedImageUrl.replace(/^data:image\/png;base64,/, '')
        aiImageBuffer = Buffer.from(b64, 'base64')
      } else {
        // Fetch from URL
        aiImageBuffer = Buffer.from(await aiImageRes.arrayBuffer())
      }

      // Resize to 64x64 with nearest-neighbor to preserve blocky pixels
      let pixelArtBuffer = await sharp(aiImageBuffer)
        .resize(64, 64, {
          kernel: 'nearest',
          fit: 'cover',
          position: 'center', // Center the character
        })
        .png()
        .toBuffer()

      console.log('[AI Convert] 64x64 resize complete, applying cleanup...')

      // CLEANUP: Aggressive background removal + Island removal + tone flattening
      // Read pixel data
      const { data, info } = await sharp(pixelArtBuffer)
        .raw()
        .toBuffer({ resolveWithObject: true })

      const width = info.width
      const height = info.height
      const channels = info.channels

      // Helper: Get pixel at (x, y)
      const getPixel = (x: number, y: number) => {
        if (x < 0 || x >= width || y < 0 || y >= height) return null
        const idx = (y * width + x) * channels
        return {
          r: data[idx],
          g: data[idx + 1],
          b: data[idx + 2],
          a: channels === 4 ? data[idx + 3] : 255,
        }
      }

      // Helper: Set pixel at (x, y)
      const setPixel = (x: number, y: number, r: number, g: number, b: number, a: number) => {
        const idx = (y * width + x) * channels
        data[idx] = r
        data[idx + 1] = g
        data[idx + 2] = b
        if (channels === 4) data[idx + 3] = a
      }

      // 0) SMART BACKGROUND REMOVAL: Flood fill from edges (only remove edge gray pixels)
      console.log('[AI Convert] Smart background removal (flood fill from edges)...')
      const visited = new Set<string>()
      const toRemove = new Set<string>()
      
      // Flood fill from all 4 edges to find connected background pixels
      const floodFill = (startX: number, startY: number) => {
        const stack: [number, number][] = [[startX, startY]]
        
        while (stack.length > 0) {
          const [x, y] = stack.pop()!
          const key = `${x},${y}`
          
          if (visited.has(key)) continue
          if (x < 0 || x >= width || y < 0 || y >= height) continue
          
          const p = getPixel(x, y)
          if (!p) continue
          
          visited.add(key)
          
          // Check if this pixel is "background-like" (grayish and light)
          const brightness = (p.r + p.g + p.b) / 3
          const isGrayish = Math.abs(p.r - p.g) < 40 && Math.abs(p.g - p.b) < 40
          
          // If bright AND grayish, it's background - mark for removal and continue flood
          if (brightness > 140 && isGrayish) {
            toRemove.add(key)
            // Continue flooding to neighbors
            stack.push([x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1])
          }
          // Otherwise it's character - stop flooding in this direction
        }
      }
      
      // Start flood fill from all 4 edges
      for (let x = 0; x < width; x++) {
        floodFill(x, 0)              // Top edge
        floodFill(x, height - 1)      // Bottom edge
      }
      for (let y = 0; y < height; y++) {
        floodFill(0, y)              // Left edge
        floodFill(width - 1, y)      // Right edge
      }
      
      // Remove marked pixels
      for (const key of toRemove) {
        const [x, y] = key.split(',').map(Number)
        setPixel(x, y, 0, 0, 0, 0)
      }
      
      console.log(`[AI Convert] Removed ${toRemove.size} background pixels`)

      // 1) Island removal: Remove 1-3 pixel isolated regions
      console.log('[AI Convert] Removing pixel islands...')
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const p = getPixel(x, y)
          if (!p || p.a < 128) continue // Skip transparent

          // Check 4-neighbors
          const neighbors = [
            getPixel(x - 1, y),
            getPixel(x + 1, y),
            getPixel(x, y - 1),
            getPixel(x, y + 1),
          ]

          const solidNeighbors = neighbors.filter(n => n && n.a >= 128)
          
          // If isolated (0-1 neighbors), make transparent
          if (solidNeighbors.length <= 1) {
            setPixel(x, y, 0, 0, 0, 0)
          }
        }
      }

      // 2) Tone flattening: Merge similar colors within tolerance (ULTRA AGGRESSIVE)
      console.log('[AI Convert] Flattening similar tones (tolerance: 80 - ULTRA AGGRESSIVE)...')
      const colorMap = new Map<string, { r: number; g: number; b: number; count: number }>()
      
      // Build color histogram
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const p = getPixel(x, y)
          if (!p || p.a < 128) continue
          const key = `${p.r},${p.g},${p.b}`
          const existing = colorMap.get(key)
          if (existing) {
            existing.count++
          } else {
            colorMap.set(key, { r: p.r, g: p.g, b: p.b, count: 1 })
          }
        }
      }

      // Merge similar colors (tolerance = 80 - çok agresif)
      const tolerance = 80  // Her parça tek renk olsun diye çok yüksek
      const mergedColors = new Map<string, string>() // original -> merged
      
      const colors = Array.from(colorMap.entries()).sort((a, b) => b[1].count - a[1].count)
      
      for (let i = 0; i < colors.length; i++) {
        const [key1, color1] = colors[i]
        if (mergedColors.has(key1)) continue
        
        for (let j = i + 1; j < colors.length; j++) {
          const [key2, color2] = colors[j]
          if (mergedColors.has(key2)) continue
          
          const dist = Math.sqrt(
            Math.pow(color1.r - color2.r, 2) +
            Math.pow(color1.g - color2.g, 2) +
            Math.pow(color1.b - color2.b, 2)
          )
          
          if (dist < tolerance) {
            mergedColors.set(key2, key1) // Merge color2 into color1
          }
        }
      }

      // Apply color merges
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const p = getPixel(x, y)
          if (!p || p.a < 128) continue
          
          const key = `${p.r},${p.g},${p.b}`
          const merged = mergedColors.get(key)
          if (merged) {
            const [r, g, b] = merged.split(',').map(Number)
            setPixel(x, y, r, g, b, p.a)
          }
        }
      }

      // Write cleaned buffer back
      pixelArtBuffer = await sharp(data, {
        raw: {
          width,
          height,
          channels,
        },
      })
        .png()
        .toBuffer()

      // Convert back to base64 data URL
      finalImageUrl = `data:image/png;base64,${pixelArtBuffer.toString('base64')}`
      console.log('[AI Convert] Post-processing complete: 64x64 pixel art with cleanup')
    } catch (postErr: any) {
      console.warn('[AI Convert] Post-processing failed, returning original:', postErr?.message)
      // Keep original if post-processing fails
    }

    return NextResponse.json({
      success: true,
      convertedImageUrl: finalImageUrl,
      method: providerUsed || 'unknown',
      originalPrompt: prompt,
    })
  } catch (error: any) {
    console.error('[AI Convert] ❌ Error:', error)
    console.error('[AI Convert] Error details:', {
      message: error.message,
      code: error.code,
      type: error.type,
      status: error.status,
    })

    if (error.code === 'content_policy_violation') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Görsel içeriği OpenAI politikalarına uygun değil',
          details: error.message,
        },
        { status: 400 }
      )
    }

    if (error.code === 'rate_limit_exceeded') {
      return NextResponse.json(
        { 
          success: false,
          error: 'API limiti aşıldı, lütfen biraz bekleyin',
          details: error.message,
        },
        { status: 429 }
      )
    }

    if (error.code === 'invalid_api_key') {
      return NextResponse.json(
        { 
          success: false,
          error: 'API key geçersiz',
          details: 'Lütfen OPENAI_API_KEY ortam değişkenini kontrol edin',
        },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Görsel dönüştürülemedi',
        code: error.code,
        type: error.type,
      },
      { status: 500 }
    )
  }
}
