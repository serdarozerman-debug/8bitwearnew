import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import Replicate from 'replicate'
import sharp from 'sharp'

// ========================================
// DETERMINISTIK PIXEL ART POST-PROCESSOR (HYBRID APPROACH)
// No palette lock, no blue background - just flatten + quantize + outline + transparent
// ========================================
async function convertToRealPixelArt(imageUrl: string): Promise<Buffer> {
  console.log('[PixelArt] 🎨 Starting HYBRID post-processing (transparent PNG)...')
  
  // STEP 0: Fetch AI-generated image
  const response = await fetch(imageUrl)
  const arrayBuffer = await response.arrayBuffer()
  const inputBuffer = Buffer.from(arrayBuffer)
  const meta = await sharp(inputBuffer).metadata()
  const hasAlpha = !!meta.hasAlpha
  
  // STEP 0.5: AUTO-CROP TO LARGEST OPAQUE REGION (eliminate duplicates/mirrors)
  // Only if the source already has alpha; if not, skip cropping to avoid "fake transparency"
  let cropped = inputBuffer
  if (hasAlpha) {
    console.log('[PixelArt] ✂️  Auto-cropping to largest opaque region (alpha detected)...')
    cropped = await autoCropToLargestRegion(inputBuffer)
  } else {
    console.log('[PixelArt] ✂️  Skipping auto-crop (no alpha in source, keep full frame)')
  }
  
  // STEP 1: Resize to 64x64 with nearest-neighbor (NO interpolation!)
  console.log('[PixelArt] 📐 Resizing to 64x64 (nearest-neighbor)...')
  let base = sharp(cropped)
  // If no alpha, force full opaque alpha so mask is 255 everywhere
  if (!hasAlpha) {
    base = base.ensureAlpha(1) // alpha = 255
  } else {
    base = base.ensureAlpha()
  }

  const resized = await base
    .resize(64, 64, {
      kernel: 'nearest', // CRITICAL: no smoothing
      fit: 'cover', // CROP to fill (not contain) - ensures single character
      position: 'center',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  
  const { data, info } = resized
  const width = info.width
  const height = info.height
  
  // STEP 2: EXTRACT ALPHA MASK (binary, separate from RGB)
  console.log('[PixelArt] 🎭 Extracting alpha mask (binary)...')
  const alphaMask = new Uint8Array(width * height)
  if (!hasAlpha) {
    // No alpha in source: treat everything as fully opaque
    alphaMask.fill(255)
  } else {
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3]
      alphaMask[i / 4] = alpha > 0 ? 255 : 0 // Binary mask
    }
  }

  // STEP 2.5: UN-PREMULTIPLY COLORS (if alpha existed) TO PREVENT GREYING
  const rgbData = Buffer.from(data)
  if (hasAlpha) {
    for (let i = 0; i < rgbData.length; i += 4) {
      const a = rgbData[i + 3]
      if (a === 0) continue
      const factor = 255 / a
      rgbData[i] = Math.min(255, Math.round(rgbData[i] * factor))
      rgbData[i + 1] = Math.min(255, Math.round(rgbData[i + 1] * factor))
      rgbData[i + 2] = Math.min(255, Math.round(rgbData[i + 2] * factor))
    }
  }
  
  // STEP 3: QUANTIZE TO ≤16 COLORS (extract from image, not locked)
  console.log('[PixelArt] 🎨 Quantizing to ≤16 colors (DALL-E colors preserved)...')
  const palette = extractPaletteAlphaSafe(rgbData, alphaMask, 16)
  const quantized = Buffer.from(rgbData) // Clone
  
  for (let i = 0; i < data.length; i += 4) {
    if (alphaMask[i / 4] === 0) continue // Skip transparent
    
    const r = rgbData[i]
    const g = rgbData[i + 1]
    const b = rgbData[i + 2]
    
    // Find nearest palette color
    let minDist = Infinity
    let bestColor = [r, g, b]
    
    for (const color of palette) {
      const dist = Math.sqrt(
        Math.pow(r - color[0], 2) +
        Math.pow(g - color[1], 2) +
        Math.pow(b - color[2], 2)
      )
      if (dist < minDist) {
        minDist = dist
        bestColor = color
      }
    }
    
    quantized[i] = bestColor[0]
    quantized[i + 1] = bestColor[1]
    quantized[i + 2] = bestColor[2]
  }
  
  // STEP 3.5: TONE FLATTEN (merge similar shades to kill shading) - LESS AGGRESSIVE
  console.log('[PixelArt] 🎭 Tone flattening (merge similar shades, preserve color strength)...')
  const flattened = toneFlattening(quantized, alphaMask, width, height, 40) // Increased threshold: less flattening, preserve colors
  
  // STEP 4: REGION MERGE (stronger: remove small islands, merge same colors)
  console.log('[PixelArt] 🔗 Merging color regions (stronger, remove islands)...')
  const merged = regionMergeStrong(flattened, alphaMask, width, height)
  
  // STEP 5: ADD 1PX BLACK OUTLINE (based on alpha mask edges)
  console.log('[PixelArt] 🖊️  Adding black outlines (1px)...')
  const outlined = addOutlineAlphaSafe(merged, alphaMask, width, height)
  
  // STEP 6: RESTORE ALPHA (transparent background - NO BLUE FILL)
  console.log('[PixelArt] 🎭 Restoring alpha (transparent PNG for printing)...')
  for (let i = 0; i < outlined.length; i += 4) {
    outlined[i + 3] = alphaMask[i / 4] // 0 = transparent, 255 = opaque
  }
  
  // STEP 7: Convert back to PNG
  console.log('[PixelArt] 💾 Converting to PNG...')
  const finalBuffer = await sharp(outlined, {
    raw: {
      width,
      height,
      channels: 4
    }
  })
  .png()
  .toBuffer()
  
  console.log('[PixelArt] ✅ ALPHA-SAFE post-processing complete!')
  return finalBuffer
}

// AUTO-CROP TO LARGEST OPAQUE REGION (eliminates checkerboard and duplicate characters)
async function autoCropToLargestRegion(inputBuffer: Buffer): Promise<Buffer> {
  const image = sharp(inputBuffer)
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  
  const width = info.width
  const height = info.height
  
  // Find bounding box of all opaque pixels
  let minX = width, minY = height, maxX = 0, maxY = 0
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const alpha = data[i + 3]
      
      if (alpha > 127) { // Opaque pixel
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  
  // If no opaque pixels, return original
  if (minX >= maxX || minY >= maxY) {
    return inputBuffer
  }
  
  // Add 5% padding
  const cropWidth = maxX - minX + 1
  const cropHeight = maxY - minY + 1
  const padding = Math.round(Math.max(cropWidth, cropHeight) * 0.05)
  
  minX = Math.max(0, minX - padding)
  minY = Math.max(0, minY - padding)
  maxX = Math.min(width - 1, maxX + padding)
  maxY = Math.min(height - 1, maxY + padding)
  
  const finalCropWidth = maxX - minX + 1
  const finalCropHeight = maxY - minY + 1
  
  console.log(`[PixelArt] ✂️  Cropping from ${width}x${height} to ${finalCropWidth}x${finalCropHeight} (removed ${width - finalCropWidth}x${height - finalCropHeight} transparent/checkerboard area)`)
  
  // Crop to bounding box
  return await sharp(inputBuffer)
    .extract({
      left: minX,
      top: minY,
      width: finalCropWidth,
      height: finalCropHeight
    })
    .toBuffer()
}

// Extract dominant colors (ALPHA-SAFE: skip transparent pixels)
function extractPaletteAlphaSafe(data: Buffer, alphaMask: Uint8Array, maxColors: number): number[][] {
  const colorCounts = new Map<string, number>()
  
  for (let i = 0; i < data.length; i += 4) {
    if (alphaMask[i / 4] === 0) continue // SKIP TRANSPARENT
    
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    
    const key = `${r},${g},${b}`
    colorCounts.set(key, (colorCounts.get(key) || 0) + 1)
  }
  
  // Sort by frequency and take top N colors
  const sorted = Array.from(colorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxColors)
  
  return sorted.map(([key]) => key.split(',').map(Number))
}

// TONE FLATTENING: merge similar shades (kills shading, keeps color identity)
function toneFlattening(data: Buffer, alphaMask: Uint8Array, width: number, height: number, threshold: number): Buffer {
  const result = Buffer.from(data)
  
  // For each pixel, check neighbors and flatten to dominant shade
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = (y * width + x) * 4
      
      if (alphaMask[i / 4] === 0) continue
      
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      
      // Check 8-neighbors for similar colors
      const neighbors = [
        { x: x - 1, y: y - 1 }, { x: x, y: y - 1 }, { x: x + 1, y: y - 1 },
        { x: x - 1, y: y },                         { x: x + 1, y: y },
        { x: x - 1, y: y + 1 }, { x: x, y: y + 1 }, { x: x + 1, y: y + 1 },
      ]
      
      let sumR = r, sumG = g, sumB = b, count = 1
      
      for (const n of neighbors) {
        const ni = (n.y * width + n.x) * 4
        if (alphaMask[ni / 4] === 0) continue
        
        const nr = data[ni]
        const ng = data[ni + 1]
        const nb = data[ni + 2]
        
        // If color is similar (within threshold), merge
        const diff = Math.abs(r - nr) + Math.abs(g - ng) + Math.abs(b - nb)
        if (diff < threshold) {
          sumR += nr
          sumG += ng
          sumB += nb
          count++
        }
      }
      
      // Average similar colors (flattens tones)
      if (count >= 3) { // If at least 2 neighbors are similar
        result[i] = Math.round(sumR / count)
        result[i + 1] = Math.round(sumG / count)
        result[i + 2] = Math.round(sumB / count)
      }
    }
  }
  
  return result
}

// REGION MERGE STRONG: merge same-color regions + remove small islands
function regionMergeStrong(data: Buffer, alphaMask: Uint8Array, width: number, height: number): Buffer {
  const result = Buffer.from(data)
  
  // Pass 1: Merge same-color adjacent pixels (stronger threshold)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = (y * width + x) * 4
      
      if (alphaMask[i / 4] === 0) continue
      
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      
      // Check 4 neighbors
      const neighbors = [
        { x: x, y: y - 1 }, // top
        { x: x, y: y + 1 }, // bottom
        { x: x - 1, y: y }, // left
        { x: x + 1, y: y }, // right
      ]
      
      let sameColorCount = 0
      let avgR = r, avgG = g, avgB = b
      
      for (const n of neighbors) {
        const ni = (n.y * width + n.x) * 4
        if (alphaMask[ni / 4] === 0) continue
        
        const nr = data[ni]
        const ng = data[ni + 1]
        const nb = data[ni + 2]
        
        // If very similar color (stricter threshold for merging)
        const diff = Math.abs(r - nr) + Math.abs(g - ng) + Math.abs(b - nb)
        if (diff < 20) { // Stricter than before (was 30)
          sameColorCount++
          avgR += nr
          avgG += ng
          avgB += nb
        }
      }
      
      // If majority neighbors are same color, snap to average
      if (sameColorCount >= 2) {
        result[i] = Math.round(avgR / (sameColorCount + 1))
        result[i + 1] = Math.round(avgG / (sameColorCount + 1))
        result[i + 2] = Math.round(avgB / (sameColorCount + 1))
      }
    }
  }
  
  // Pass 2: Remove small islands (single isolated pixels)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = (y * width + x) * 4
      
      if (alphaMask[i / 4] === 0) continue
      
      const r = result[i]
      const g = result[i + 1]
      const b = result[i + 2]
      
      // Check if this pixel is isolated (all 4 neighbors are different colors)
      const neighbors = [
        result[((y - 1) * width + x) * 4],
        result[((y + 1) * width + x) * 4],
        result[(y * width + (x - 1)) * 4],
        result[(y * width + (x + 1)) * 4],
      ]
      
      let differentCount = 0
      let majorityR = 0, majorityG = 0, majorityB = 0
      
      for (let j = 0; j < neighbors.length; j++) {
        const ni = (j < 2 ? ((j === 0 ? y - 1 : y + 1) * width + x) : (y * width + (j === 2 ? x - 1 : x + 1))) * 4
        if (alphaMask[ni / 4] === 0) continue
        
        const nr = result[ni]
        const ng = result[ni + 1]
        const nb = result[ni + 2]
        
        const diff = Math.abs(r - nr) + Math.abs(g - ng) + Math.abs(b - nb)
        if (diff > 20) {
          differentCount++
          majorityR += nr
          majorityG += ng
          majorityB += nb
        }
      }
      
      // If isolated (all neighbors are different), replace with majority neighbor color
      if (differentCount >= 3) {
        result[i] = Math.round(majorityR / differentCount)
        result[i + 1] = Math.round(majorityG / differentCount)
        result[i + 2] = Math.round(majorityB / differentCount)
      }
    }
  }
  
  return result
}

// ADD BLACK OUTLINE (ALPHA-SAFE: based on alpha mask edges)
function addOutlineAlphaSafe(data: Buffer, alphaMask: Uint8Array, width: number, height: number): Buffer {
  const result = Buffer.from(data)
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = (y * width + x) * 4
      
      // If pixel is opaque
      if (alphaMask[i / 4] === 255) {
        // Check if any neighbor is transparent
        const neighbors = [
          alphaMask[((y - 1) * width + x) / 1], // top
          alphaMask[((y + 1) * width + x) / 1], // bottom
          alphaMask[(y * width + (x - 1)) / 1], // left
          alphaMask[(y * width + (x + 1)) / 1], // right
        ]
        
        const hasTransparentNeighbor = neighbors.some(a => a === 0)
        
        // If this is an edge pixel, make it black
        if (hasTransparentNeighbor) {
          result[i] = 0     // Black
          result[i + 1] = 0
          result[i + 2] = 0
        }
      }
    }
  }
  
  return result
}

export const runtime = 'nodejs'
export const maxDuration = 120
export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 3,
  timeout: 120000,
})

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
})

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, prompt: userPrompt } = await req.json()

    if (!imageUrl || !userPrompt) {
      return NextResponse.json(
        { error: 'imageUrl and prompt are required' },
        { status: 400 }
      )
    }

    console.log('[AI Convert] 🎨 PRODUCTION PIPELINE: GPT-4o Vision → Stable Diffusion')
    console.log('[AI Convert] User prompt:', userPrompt)
    console.log('[AI Convert] Replicate token present:', !!process.env.REPLICATE_API_TOKEN)

    // ========================================
    // STEP 0: Validate and normalize image URL
    // ========================================
    let normalizedImageUrl = imageUrl
    
    // If data URL, keep as is (OpenAI Vision accepts data URLs)
    if (!imageUrl.startsWith('data:image/')) {
      // If external URL, ensure it's accessible
      console.log('[AI Convert] 📥 External image URL detected, validating...')
    } else {
      console.log('[AI Convert] 📥 Data URL detected (base64)')
    }

    // ========================================
    // STEP 1: GPT-4o Vision Analysis
    // ========================================
    console.log('[AI Convert] 📸 STEP 1: Analyzing image with GPT-4o Vision...')

    const visionResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 50, // Sadeleştirildi
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Describe in ONE SHORT SENTENCE: one character, hair color, clothing color, pose. Example: "one person, brown hair, blue shirt, standing". Max 12 words.',
            },
            {
              type: 'image_url',
              image_url: {
                url: normalizedImageUrl, // Data URL or external URL
                detail: 'low',
              },
            },
          ],
        },
      ],
    })

    const imageDescription = visionResponse.choices[0]?.message?.content

    if (!imageDescription) {
      throw new Error('No description from GPT-4o Vision')
    }

    console.log('[AI Convert] 📝 Vision Analysis:', imageDescription)

    // ========================================
    // STEP 2: Stable Diffusion Generation
    // ========================================
    console.log('[AI Convert] 🎮 STEP 2: Generating pixel art with Stable Diffusion...')

    // OPTIMIZED PIXEL ART PROMPT FOR STABLE DIFFUSION
    const pixelArtPrompt = `pixel art character sprite, 64x64 resolution, retro 8-bit NES style, SNES game graphics, blocky square pixels, flat solid colors only, thick black outlines around all shapes, maximum 16 color palette, no color gradients, no smooth shading, no anti-aliasing, sharp pixel edges, simple geometric forms, transparent PNG background, based on: ${imageDescription.substring(0, 120)}. ${userPrompt.substring(0, 80)}`

    const negativePrompt = 'realistic photo, photograph, 3d render, CGI, smooth shading, gradients, soft edges, anti-aliasing, blur, gaussian blur, motion blur, depth of field, shadows, highlights, reflections, detailed textures, high resolution, HD, 4K, modern graphics, complex details, realistic lighting, ambient occlusion'

    console.log('[AI Convert] 📝 Pixel Art Prompt (length:', pixelArtPrompt.length, '):', pixelArtPrompt.substring(0, 100) + '...')

    // REPLICATE: Stable Diffusion (optimized for pixel art)
    console.log('[AI Convert] 🚀 Calling Replicate Stable Diffusion...')
    
    // Replicate returns an async iterator or array
    const prediction = await replicate.run(
      "stability-ai/stable-diffusion:db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf",
      {
        input: {
          prompt: pixelArtPrompt,
          negative_prompt: negativePrompt,
          width: 512,
          height: 512,
          num_outputs: 1,
          num_inference_steps: 50,
          guidance_scale: 9.0,
          scheduler: "K_EULER_ANCESTRAL",
        },
      }
    )

    console.log('[AI Convert] 📦 Replicate prediction type:', typeof prediction)
    console.log('[AI Convert] 📦 Is array?', Array.isArray(prediction))
    console.log('[AI Convert] 📦 Has Symbol.iterator?', !!(prediction as any)?.[Symbol.iterator])
    console.log('[AI Convert] 📦 Has Symbol.asyncIterator?', !!(prediction as any)?.[Symbol.asyncIterator])
    
    // Replicate may return:
    // 1. Array of URLs (direct)
    // 2. Async iterator (for streaming)
    let convertedImageUrl: string | null = null
    
    if (Array.isArray(prediction) && prediction.length > 0) {
      // Direct array of URLs
      convertedImageUrl = prediction[0]
      console.log('[AI Convert] ✅ Got URL from array:', convertedImageUrl)
    } else if ((prediction as any)?.[Symbol.asyncIterator]) {
      // Async iterator - collect all results
      console.log('[AI Convert] 📡 Reading async iterator...')
      const results: any[] = []
      for await (const item of prediction as any) {
        console.log('[AI Convert] 📥 Iterator item:', item)
        results.push(item)
      }
      
      if (results.length > 0) {
        convertedImageUrl = results[0]
        console.log('[AI Convert] ✅ Got URL from iterator:', convertedImageUrl)
      }
    } else if (typeof prediction === 'string') {
      // Direct URL string
      convertedImageUrl = prediction
      console.log('[AI Convert] ✅ Got URL as string:', convertedImageUrl)
    }

    if (!convertedImageUrl || typeof convertedImageUrl !== 'string') {
      console.warn('[AI Convert] ⚠️ Replicate returned invalid format. Falling back to DALL-E 3 + POST-PROCESSING...')
      
      // FALLBACK: Use DALL-E 3 + Deterministik Post-Processing
      try {
        // Simplified prompt for DALL-E 3 (konsept üretimi)
        // EMPHASIZE: SINGLE character, CLOSE-UP, centered
        const simplePrompt = `Create a simple single-character illustration based on the uploaded photo.
IMPORTANT: Only ONE character (not two, not multiple people).
Close-up portrait view, centered, clean silhouette, front-facing.
No background, no extra objects, no duplicates, no mirrors.
Flat simple shapes, no gradients, no shading, no textures, no lighting effects.
Keep details minimal for pixel art conversion.
Reference: ${imageDescription}`
        
        console.log('[AI Convert] 📝 DALL-E 3 Prompt (SINGLE char, close-up):', simplePrompt)
        
        const dalle3Response = await openai.images.generate({
          model: 'dall-e-3',
          prompt: simplePrompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
          style: 'natural',
        })

        if (!dalle3Response.data[0]?.url) {
          throw new Error('No image URL returned from DALL-E 3 fallback')
        }

        const dalle3Url = dalle3Response.data[0].url
        console.log('[AI Convert] ✅ DALL-E 3 Konsept Created!')
        console.log('[AI Convert] 🎨 Starting POST-PROCESSING to real pixel art...')
        
        // ========================================
        // CRITICAL: POST-PROCESSING TO REAL PIXEL ART
        // ========================================
        const pixelArtBuffer = await convertToRealPixelArt(dalle3Url)
        
        // Convert buffer to base64 data URL for client
        const base64 = pixelArtBuffer.toString('base64')
        const dataUrl = `data:image/png;base64,${base64}`
        
        console.log('[AI Convert] ✅ POST-PROCESSING COMPLETE! Real 64x64 pixel art created!')

        return NextResponse.json({
          success: true,
          convertedImageUrl: dataUrl,
          method: 'dalle3-plus-postprocessing',
          model: 'dall-e-3 + sharp-quantization',
          originalPrompt: userPrompt,
          visionAnalysis: imageDescription,
          promptUsed: simplePrompt,
          info: 'DALL-E 3 for concept + Deterministik post-processing for real 64x64 pixel art',
        })
      } catch (dalle3Error: any) {
        console.error('[AI Convert] ❌ DALL-E 3 + Post-Processing failed:', dalle3Error)
        throw new Error(`DALL-E 3 + Post-Processing failed: ${dalle3Error.message}`)
      }
    }

    console.log('[AI Convert] ✅ SUCCESS! Stable Diffusion pixel art generated')
    console.log('[AI Convert] Output URL:', convertedImageUrl)

    return NextResponse.json({
      success: true,
      convertedImageUrl,
      method: 'stable-diffusion-via-replicate',
      originalPrompt: userPrompt,
      visionAnalysis: imageDescription,
      model: 'stability-ai/stable-diffusion',
      promptUsed: pixelArtPrompt.substring(0, 200) + '...',
    })
  } catch (error: any) {
    console.error('[AI Convert] ❌ Error:', error)
    console.error('[AI Convert] Error details:', {
      message: error.message,
      code: error.code,
      type: error.type,
      status: error.status,
    })

    // Handle specific errors
    if (error.message?.includes('REPLICATE_API_TOKEN')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Replicate API token not configured',
          details: 'Please set REPLICATE_API_TOKEN environment variable',
        },
        { status: 500 }
      )
    }

    if (error.code === 'content_policy_violation') {
      return NextResponse.json(
        {
          success: false,
          error: 'Görsel içeriği politikalara uygun değil',
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
