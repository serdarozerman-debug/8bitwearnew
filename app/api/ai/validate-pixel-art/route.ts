import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ValidationResult {
  passed: boolean
  checks: {
    singleCharacter: { passed: boolean; message: string; componentCount?: number }
    transparentBackground: { passed: boolean; message: string; transparencyRatio?: number }
    limitedColors: { passed: boolean; message: string; colorCount?: number }
    noShading: { passed: boolean; message: string; shadingRegions?: number }
    centeredSprite: { passed: boolean; message: string; centerOffset?: number }
    readableSilhouette: { passed: boolean; message: string; fillRatio?: number }
  }
  summary: string
}

export async function POST(req: NextRequest) {
  try {
    const { imageUrl } = await req.json()

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'imageUrl is required' },
        { status: 400 }
      )
    }

    const sharp = (await import('sharp')).default

    // Parse base64 or fetch URL
    let imageBuffer: Buffer
    if (imageUrl.startsWith('data:image/png;base64,')) {
      const b64 = imageUrl.replace(/^data:image\/png;base64,/, '')
      imageBuffer = Buffer.from(b64, 'base64')
    } else {
      const res = await fetch(imageUrl)
      imageBuffer = Buffer.from(await res.arrayBuffer())
    }

    // Get raw pixel data
    const { data, info } = await sharp(imageBuffer)
      .raw()
      .toBuffer({ resolveWithObject: true })

    const width = info.width
    const height = info.height
    const channels = info.channels
    const totalPixels = width * height

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

    const result: ValidationResult = {
      passed: true,
      checks: {
        singleCharacter: { passed: false, message: '' },
        transparentBackground: { passed: false, message: '' },
        limitedColors: { passed: false, message: '' },
        noShading: { passed: false, message: '' },
        centeredSprite: { passed: false, message: '' },
        readableSilhouette: { passed: false, message: '' },
      },
      summary: '',
    }

    // CHECK 1: Single character (connected components)
    console.log('[Validate] Check 1: Single character...')
    const visited = new Set<string>()
    let componentCount = 0

    const floodFill = (x: number, y: number) => {
      const stack = [[x, y]]
      while (stack.length > 0) {
        const [cx, cy] = stack.pop()!
        const key = `${cx},${cy}`
        if (visited.has(key)) continue
        
        const p = getPixel(cx, cy)
        if (!p || p.a < 128) continue
        
        visited.add(key)
        
        // 4-neighbors
        if (cx > 0) stack.push([cx - 1, cy])
        if (cx < width - 1) stack.push([cx + 1, cy])
        if (cy > 0) stack.push([cx, cy - 1])
        if (cy < height - 1) stack.push([cx, cy + 1])
      }
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const p = getPixel(x, y)
        if (p && p.a >= 128 && !visited.has(`${x},${y}`)) {
          componentCount++
          floodFill(x, y)
        }
      }
    }

    result.checks.singleCharacter = {
      passed: componentCount === 1,
      message: componentCount === 1 
        ? 'Single character detected' 
        : `Multiple components detected: ${componentCount}`,
      componentCount,
    }

    // CHECK 2: Transparent background
    console.log('[Validate] Check 2: Transparent background...')
    let transparentPixels = 0
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const p = getPixel(x, y)
        if (!p || p.a < 128) transparentPixels++
      }
    }
    const transparencyRatio = transparentPixels / totalPixels
    result.checks.transparentBackground = {
      passed: transparencyRatio > 0.3, // At least 30% transparent
      message: transparencyRatio > 0.3
        ? `Background is transparent (${(transparencyRatio * 100).toFixed(1)}%)`
        : `Insufficient transparency (${(transparencyRatio * 100).toFixed(1)}%)`,
      transparencyRatio: parseFloat((transparencyRatio * 100).toFixed(1)),
    }

    // CHECK 3: Limited colors (≤16)
    console.log('[Validate] Check 3: Limited colors...')
    const colorSet = new Set<string>()
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const p = getPixel(x, y)
        if (p && p.a >= 128) {
          colorSet.add(`${p.r},${p.g},${p.b}`)
        }
      }
    }
    const colorCount = colorSet.size
    result.checks.limitedColors = {
      passed: colorCount <= 16,
      message: colorCount <= 16
        ? `Color count OK: ${colorCount}`
        : `Too many colors: ${colorCount}`,
      colorCount,
    }

    // CHECK 4: No shading (detect similar tones in same region)
    console.log('[Validate] Check 4: No shading...')
    let shadingRegions = 0
    const checked = new Set<string>()
    
    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width - 1; x++) {
        const p1 = getPixel(x, y)
        const p2 = getPixel(x + 1, y)
        const p3 = getPixel(x, y + 1)
        
        if (!p1 || p1.a < 128) continue
        if (!p2 || p2.a < 128) continue
        if (!p3 || p3.a < 128) continue
        
        const key = `${x},${y}`
        if (checked.has(key)) continue
        checked.add(key)
        
        // Check if adjacent pixels have similar but different colors (shading)
        const dist12 = Math.sqrt(
          Math.pow(p1.r - p2.r, 2) +
          Math.pow(p1.g - p2.g, 2) +
          Math.pow(p1.b - p2.b, 2)
        )
        const dist13 = Math.sqrt(
          Math.pow(p1.r - p3.r, 2) +
          Math.pow(p1.g - p3.g, 2) +
          Math.pow(p1.b - p3.b, 2)
        )
        
        // Similar but not identical (15 < distance < 60)
        if ((dist12 > 15 && dist12 < 60) || (dist13 > 15 && dist13 < 60)) {
          shadingRegions++
        }
      }
    }
    
    result.checks.noShading = {
      passed: shadingRegions < totalPixels * 0.05, // Less than 5% shading
      message: shadingRegions < totalPixels * 0.05
        ? 'Minimal shading detected'
        : `Shading detected in ${shadingRegions} regions`,
      shadingRegions,
    }

    // CHECK 5: Sprite centered
    console.log('[Validate] Check 5: Sprite centered...')
    let minX = width, maxX = 0, minY = height, maxY = 0
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const p = getPixel(x, y)
        if (p && p.a >= 128) {
          minX = Math.min(minX, x)
          maxX = Math.max(maxX, x)
          minY = Math.min(minY, y)
          maxY = Math.max(maxY, y)
        }
      }
    }
    
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    const imageCenterX = width / 2
    const imageCenterY = height / 2
    const centerOffset = Math.sqrt(
      Math.pow(centerX - imageCenterX, 2) +
      Math.pow(centerY - imageCenterY, 2)
    )
    
    result.checks.centeredSprite = {
      passed: centerOffset < width * 0.2, // Within 20% of center
      message: centerOffset < width * 0.2
        ? 'Sprite is centered'
        : `Sprite off-center (offset: ${centerOffset.toFixed(1)})`,
      centerOffset: parseFloat(centerOffset.toFixed(1)),
    }

    // CHECK 6: Readable silhouette (bounding box fill ratio)
    console.log('[Validate] Check 6: Readable silhouette...')
    const bboxWidth = maxX - minX + 1
    const bboxHeight = maxY - minY + 1
    const bboxArea = bboxWidth * bboxHeight
    const solidPixels = totalPixels - transparentPixels
    const fillRatio = solidPixels / bboxArea
    
    result.checks.readableSilhouette = {
      passed: fillRatio > 0.3 && fillRatio < 0.9, // Between 30-90%
      message: fillRatio > 0.3 && fillRatio < 0.9
        ? 'Silhouette is readable'
        : `Silhouette issue (fill: ${(fillRatio * 100).toFixed(1)}%)`,
      fillRatio: parseFloat((fillRatio * 100).toFixed(1)),
    }

    // Overall result
    const allPassed = Object.values(result.checks).every(check => check.passed)
    result.passed = allPassed
    result.summary = allPassed
      ? 'All checks passed - Ready for printing'
      : 'Some checks failed - Review needed'

    console.log('[Validate] Result:', result.summary)
    return NextResponse.json(result)

  } catch (error: any) {
    console.error('[Validate] Error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Validation failed',
      },
      { status: 500 }
    )
  }
}
