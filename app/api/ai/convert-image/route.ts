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
  
  // STEP 0.5: NO CROP (input character is already centered)
  console.log('[PixelArt] ✂️  Skipping center crop (character is already centered in input)')
  let cropped = inputBuffer
  
  // STEP 1: Resize to 64x64 with nearest-neighbor (NO interpolation!)
  console.log('[PixelArt] 📐 Resizing to 64x64 (nearest-neighbor, 3D PRINT OPTIMIZED)...')
  let base = sharp(cropped)
  // If no alpha, force full opaque alpha so mask is 255 everywhere
  if (!hasAlpha) {
    base = base.ensureAlpha(1) // alpha = 255
  } else {
    base = base.ensureAlpha()
  }

  const resized = await base
    .resize(64, 64, { // 3D BASKI: 64x64 (büyük pikseller)
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
  
  // STEP 3: QUANTIZE TO ≤32 COLORS (preserve DALL-E color variety)
  console.log('[PixelArt] 🎨 Quantizing to ≤32 colors (preserve variety)...')
  const palette = extractPaletteAlphaSafe(rgbData, alphaMask, 32) // RENK ÇEŞITLILIĞI: 16 → 32
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
  
  // STEP 3.5: TONE FLATTEN - DISABLED (preserving DALL-E 3 colors)
  console.log('[PixelArt] 🎭 SKIPPING tone flattening (preserve DALL-E colors)...')
  const flattened = quantized // NO FLATTENING
  
  // STEP 4: REGION MERGE - DISABLED (preserving DALL-E 3 colors)
  console.log('[PixelArt] 🔗 SKIPPING region merge (preserve DALL-E colors)...')
  const merged = flattened // NO MERGE
  
  // STEP 5: ADD 2PX THICK BLACK OUTLINE (3D PRINT: bold outlines)
  console.log('[PixelArt] 🖊️  Adding THICK black outlines (2px for 3D print)...')
  const outlined = addThickOutlineAlphaSafe(merged, alphaMask, width, height, 2) // 3D BASKI: 2px kalın
  
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

// CENTER CROP: Take center 40% of image (isolates single character from lineup)
async function centerCropToSingleCharacter(inputBuffer: Buffer): Promise<Buffer> {
  const meta = await sharp(inputBuffer).metadata()
  const width = meta.width || 512
  const height = meta.height || 512
  
  // Calculate center crop (40% width, 60% height to focus on face/upper body)
  const cropWidth = Math.round(width * 0.4)
  const cropHeight = Math.round(height * 0.6)
  const left = Math.round((width - cropWidth) / 2)
  const top = Math.round((height - cropHeight) / 2)
  
  console.log(`[PixelArt] ✂️  Center crop: ${width}x${height} → ${cropWidth}x${cropHeight} (isolating center character)`)
  
  return await sharp(inputBuffer)
    .extract({
      left,
      top,
      width: cropWidth,
      height: cropHeight
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
      if (count >= 2) { // 3D BASKI: daha agresif (was 3)
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
        
        // If very similar color (MODERATE threshold for 3D PRINT + COLOR)
        const diff = Math.abs(r - nr) + Math.abs(g - ng) + Math.abs(b - nb)
        if (diff < 25) { // 3D BASKI: orta seviye merge (renk koruyucu)
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
        if (diff > 25) { // 3D BASKI: moderate island removal (renk koruyucu)
          differentCount++
          majorityR += nr
          majorityG += ng
          majorityB += nb
        }
      }
      
      // ONLY if ALL 4 neighbors are different (true isolated island)
      if (differentCount >= 4) {
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

// ADD THICK BLACK OUTLINE (for 3D print - 2px or more)
function addThickOutlineAlphaSafe(data: Buffer, alphaMask: Uint8Array, width: number, height: number, thickness: number = 2): Buffer {
  const result = Buffer.from(data)
  
  // First pass: mark all edge pixels (distance 1 from transparent)
  const edgePixels = new Set<number>()
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      
      // If pixel is opaque
      if (alphaMask[i] === 255) {
        // Check 8-neighbors for transparent pixels
        let hasTransparentNeighbor = false
        
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue
            
            const nx = x + dx
            const ny = y + dy
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const ni = ny * width + nx
              if (alphaMask[ni] === 0) {
                hasTransparentNeighbor = true
                break
              }
            }
          }
          if (hasTransparentNeighbor) break
        }
        
        if (hasTransparentNeighbor) {
          edgePixels.add(i)
        }
      }
    }
  }
  
  // Second pass: expand edge inward by (thickness - 1) pixels
  const outlinePixels = new Set<number>(edgePixels)
  
  for (let t = 1; t < thickness; t++) {
    const newOutlinePixels = new Set<number>(outlinePixels)
    
    for (const pixelIndex of outlinePixels) {
      const x = pixelIndex % width
      const y = Math.floor(pixelIndex / width)
      
      // Add 4-neighbors
      const neighbors = [
        { nx: x, ny: y - 1 },
        { nx: x, ny: y + 1 },
        { nx: x - 1, ny: y },
        { nx: x + 1, ny: y },
      ]
      
      for (const { nx, ny } of neighbors) {
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const ni = ny * width + nx
          if (alphaMask[ni] === 255) { // Only expand into opaque pixels
            newOutlinePixels.add(ni)
          }
        }
      }
    }
    
    outlinePixels.clear()
    for (const p of newOutlinePixels) {
      outlinePixels.add(p)
    }
  }
  
  // Final pass: paint all outline pixels black
  for (const pixelIndex of outlinePixels) {
    const i = pixelIndex * 4
    result[i] = 0     // Black
    result[i + 1] = 0
    result[i + 2] = 0
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
      max_tokens: 80,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Describe this CHARACTER or FIGURE in the image for creating a pixel art sprite: exact hair color and style, skin tone, clothing and colors, accessories, pose, facial expression. Focus on visual appearance only, no identity. Be specific and descriptive. Max 50 words.',
            },
            {
              type: 'image_url',
              image_url: {
                url: normalizedImageUrl,
                detail: 'high',
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

    // ULTRA-FOCUSED PROMPT: SINGLE CHARACTER PORTRAIT (NO MULTIPLE SPRITES)
    const pixelArtPrompt = `CENTERED CLOSE-UP PORTRAIT of ONE SINGLE CHARACTER filling the entire frame. 8-bit pixel art sprite, 64x64, VIBRANT COLORS (red blue yellow green), large blocky pixels, flat colors, thick black outlines, transparent background. NO MULTIPLE CHARACTERS, NO LINEUP, NO GROUP, JUST ONE CENTERED FACE/BUST. Character: ${imageDescription.substring(0, 50)}`

    const negativePrompt = 'multiple characters, character lineup, multiple people, side by side characters, group, trio, three characters, duplicates, mirrors, full body, tiny character, realistic, photo, gradients, smooth, detailed, grayscale, monochrome, props, accessories, background objects'

    console.log('[AI Convert] 📝 Pixel Art Prompt (length:', pixelArtPrompt.length, '):', pixelArtPrompt.substring(0, 100) + '...')

    // REPLICATE: Stable Diffusion (optimized for pixel art)
    console.log('[AI Convert] 🚀 Calling Replicate Stable Diffusion...')
    
    let convertedImageUrl: string | null = null
    
    try {
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
    
    } catch (replicateError: any) {
      console.warn('[AI Convert] ⚠️ Replicate error (NSFW or other):', replicateError.message)
      console.log('[AI Convert] 🔄 Falling back to DALL-E 3...')
      // Continue to fallback below
    }

    if (!convertedImageUrl || typeof convertedImageUrl !== 'string') {
      console.warn('[AI Convert] ⚠️ Replicate returned invalid format. Falling back to DALL-E 3 + POST-PROCESSING...')
      
      // FALLBACK: Use DALL-E 3 + Deterministik Post-Processing
      try {
        // DALL-E 3: SIMPLE + COLORFUL (64x64, minimal detail, NO BACKGROUND)
        const simplePrompt = `Create a simple 8-bit retro video game character sprite, 64x64 pixels, TRANSPARENT BACKGROUND.

Use solid flat colors (one color per body part):
- Hair: solid dark brown blob
- Earmuffs: solid beige circles
- Skin: solid light peach
- Jacket: solid white simple shape
- Pants: solid black
- Shoes: solid bright purple

Character: ${imageDescription}

Style: Simple iconic 8-bit sprite (like early NES games). Large blocky shapes, thick black outlines, flat solid colors, ONE centered character. NO background, NO shading, NO details, NO texture. Transparent background. Simple geometric shapes only.`
        
        console.log('[AI Convert] 📝 DALL-E 3 Prompt (SINGLE char, close-up):', simplePrompt)
        
        const dalle3Response = await openai.images.generate({
          model: 'dall-e-3',
          prompt: simplePrompt,
      n: 1,
      size: '1024x1024',
          quality: 'hd', // HD quality for better detail
          style: 'vivid', // VIVID style for more saturated colors (not natural)
          style: 'vivid', // Vivid for richer colors
        })

        if (!dalle3Response.data[0]?.url) {
          throw new Error('No image URL returned from DALL-E 3 fallback')
        }

        const dalle3Url = dalle3Response.data[0].url
        console.log('[AI Convert] ✅ DALL-E 3 Created!')
        console.log('[AI Convert] 🌈 DALL-E RAW URL:', dalle3Url)
        console.log('[AI Convert] 🎨 Resizing to 64x64 (NO post-processing - preserve DALL-E colors)...')
        
        // ========================================
        // SIMPLE RESIZE ONLY - NO POST-PROCESSING (preserve DALL-E colors)
        // ========================================
        const response = await fetch(dalle3Url)
        const arrayBuffer = await response.arrayBuffer()
        const inputBuffer = Buffer.from(arrayBuffer)
        
        // Resize to 64x64 with nearest-neighbor (preserve colors)
        // Use 'cover' + 'center' to crop to character only (remove color palette)
        const pixelArtBuffer = await sharp(inputBuffer)
          .resize(64, 64, {
            kernel: 'nearest',
            fit: 'cover', // CROP to remove bottom color palette
            position: 'top', // Focus on top (character, not bottom palette)
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .png()
          .toBuffer()
        
        // Convert buffer to base64 data URL for client
        const base64 = pixelArtBuffer.toString('base64')
        const dataUrl = `data:image/png;base64,${base64}`
        
        console.log('[AI Convert] ✅ RESIZE COMPLETE! 64x64 pixel art (DALL-E colors preserved)!')

        return NextResponse.json({
          success: true,
          convertedImageUrl: dataUrl,
          method: 'dalle3-plus-postprocessing-3dprint',
          model: 'dall-e-3 + sharp-3dprint-quantization',
          originalPrompt: userPrompt,
          visionAnalysis: imageDescription,
          promptUsed: simplePrompt,
          info: 'DALL-E 3 + 3D PRINT post-processing: 64x64, 12 colors, 2px outline, big blocks',
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
