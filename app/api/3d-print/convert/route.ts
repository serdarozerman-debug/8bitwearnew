import { NextRequest, NextResponse } from 'next/server'
import { writeFile, readFile, mkdir } from 'fs/promises'
import { spawn } from 'child_process'
import path from 'path'
import { existsSync } from 'fs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for conversion

interface ConversionRequest {
  pixelArtImageUrl: string  // Base64 data URL or HTTP URL
  orderNumber: string
  extrusion?: number        // Default: 2.0mm
  pixelSize?: number        // Default: 1.5mm
  baseThickness?: number    // Default: 1.0mm
}

interface ConversionResult {
  success: boolean
  stlUrl?: string
  stats?: {
    width_mm: number
    height_mm: number
    depth_mm: number
    pixel_width: number
    pixel_height: number
    opaque_pixels: number
    total_triangles: number
    file_size_kb: number
  }
  error?: string
}

/**
 * POST /api/3d-print/convert
 * 
 * Convert pixel art PNG to STL file for 3D printing.
 * 
 * @body pixelArtImageUrl - Base64 data URL or HTTP URL of pixel art PNG
 * @body orderNumber - Order number for file naming
 * @body extrusion - Optional extrusion height in mm (default: 2.0)
 * @body pixelSize - Optional pixel size in mm (default: 1.5)
 * @body baseThickness - Optional base plate thickness in mm (default: 1.0)
 * 
 * @returns { success, stlUrl, stats } or { success: false, error }
 */
export async function POST(req: NextRequest) {
  try {
    const body: ConversionRequest = await req.json()
    const { 
      pixelArtImageUrl, 
      orderNumber,
      extrusion = 2.0,
      pixelSize = 1.5,
      baseThickness = 1.0
    } = body

    if (!pixelArtImageUrl) {
      return NextResponse.json({ 
        success: false, 
        error: 'pixelArtImageUrl required' 
      }, { status: 400 })
    }

    if (!orderNumber) {
      return NextResponse.json({ 
        success: false, 
        error: 'orderNumber required' 
      }, { status: 400 })
    }

    console.log('[3D Convert] Starting PNG → STL conversion for order:', orderNumber)

    // 1. Create temp directory
    const tempDir = path.join('/tmp', '3d-print')
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true })
    }

    const pngPath = path.join(tempDir, `${orderNumber}.png`)
    const stlPath = path.join(tempDir, `${orderNumber}.stl`)

    // 2. Download/decode PNG image
    let imageBuffer: Buffer

    if (pixelArtImageUrl.startsWith('data:image')) {
      // Base64 data URL
      console.log('[3D Convert] Decoding base64 image...')
      const base64Data = pixelArtImageUrl.split(',')[1]
      imageBuffer = Buffer.from(base64Data, 'base64')
    } else if (pixelArtImageUrl.startsWith('http')) {
      // HTTP URL
      console.log('[3D Convert] Downloading image from URL...')
      const imageRes = await fetch(pixelArtImageUrl)
      if (!imageRes.ok) {
        throw new Error(`Failed to download image: ${imageRes.statusText}`)
      }
      imageBuffer = Buffer.from(await imageRes.arrayBuffer())
    } else {
      throw new Error('Invalid pixelArtImageUrl format (must be data URL or HTTP URL)')
    }

    // 3. Save PNG temporarily
    await writeFile(pngPath, imageBuffer)
    console.log('[3D Convert] PNG saved to:', pngPath)

    // 4. Run Python script to convert PNG → STL
    const pythonScript = path.join(process.cwd(), 'lib', 'python', 'png_to_stl.py')
    
    if (!existsSync(pythonScript)) {
      throw new Error(`Python script not found: ${pythonScript}`)
    }

    console.log('[3D Convert] Running Python conversion script...')

    const result = await new Promise<{ success: boolean; stats?: any; error?: string }>((resolve, reject) => {
      const python = spawn('python3', [
        pythonScript,
        pngPath,
        stlPath,
        '--extrusion', extrusion.toString(),
        '--pixel-size', pixelSize.toString(),
        '--base', baseThickness.toString()
      ])

      let stdout = ''
      let stderr = ''

      python.stdout.on('data', (data) => { 
        stdout += data.toString()
      })
      
      python.stderr.on('data', (data) => { 
        stderr += data.toString()
        console.error('[3D Convert] Python stderr:', data.toString())
      })

      python.on('close', (code) => {
        if (code !== 0) {
          console.error('[3D Convert] Python script failed with code:', code)
          console.error('[3D Convert] stderr:', stderr)
          reject(new Error(`Python script failed: ${stderr || 'Unknown error'}`))
        } else {
          try {
            console.log('[3D Convert] Python stdout:', stdout)
            const parsedResult = JSON.parse(stdout)
            resolve(parsedResult)
          } catch (e) {
            reject(new Error(`Invalid JSON from Python script: ${stdout}`))
          }
        }
      })

      python.on('error', (err) => {
        reject(new Error(`Failed to spawn Python process: ${err.message}`))
      })
    })

    if (!result.success) {
      throw new Error(result.error || 'Conversion failed')
    }

    console.log('[3D Convert] ✅ STL created successfully:', result.stats)

    // 5. Read STL file
    const stlBuffer = await readFile(stlPath)

    // 6. Upload STL to cloud storage
    const stlUrl = await uploadSTLToStorage(stlBuffer, orderNumber)

    console.log('[3D Convert] ✅ STL uploaded to:', stlUrl)

    // 7. Return success response
    return NextResponse.json({
      success: true,
      stlUrl,
      stats: result.stats
    })

  } catch (error: any) {
    console.error('[3D Convert] ❌ Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 })
  }
}

/**
 * Upload STL file to cloud storage.
 * 
 * Currently using local /public/3d-prints directory.
 * TODO: Integrate with Cloudflare R2, AWS S3, or Uploadthing.
 */
async function uploadSTLToStorage(stlBuffer: Buffer, orderNumber: string): Promise<string> {
  try {
    // For now, save to /public/3d-prints
    const publicDir = path.join(process.cwd(), 'public', '3d-prints')
    
    if (!existsSync(publicDir)) {
      await mkdir(publicDir, { recursive: true })
    }

    const filename = `${orderNumber}-${Date.now()}.stl`
    const filePath = path.join(publicDir, filename)

    await writeFile(filePath, stlBuffer)

    // Return public URL
    const publicUrl = `/3d-prints/${filename}`
    
    console.log('[Upload] STL saved to public directory:', publicUrl)

    return publicUrl

    // TODO: Implement cloud storage upload
    // Option 1: Uploadthing (already in project)
    // Option 2: Cloudflare R2 (cheap, S3-compatible)
    // Option 3: AWS S3
    
    /*
    // Example with Uploadthing:
    const { uploadFiles } = await import('@uploadthing/node')
    const file = new File([stlBuffer], filename, { type: 'model/stl' })
    const uploaded = await uploadFiles('stlUploader', { files: [file] })
    return uploaded[0].url
    */

    /*
    // Example with Cloudflare R2:
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
    const s3 = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!
      }
    })
    
    await s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: filename,
      Body: stlBuffer,
      ContentType: 'model/stl'
    }))
    
    return `${process.env.R2_PUBLIC_URL}/${filename}`
    */

  } catch (error: any) {
    console.error('[Upload] Failed to upload STL:', error)
    throw new Error(`STL upload failed: ${error.message}`)
  }
}
