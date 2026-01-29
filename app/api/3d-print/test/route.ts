import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/3d-print/test
 * 
 * Quick test endpoint to verify 3D print pipeline works.
 * Creates a simple test pixel art and converts it to STL.
 */
export async function GET(req: NextRequest) {
  try {
    console.log('[3D Test] Starting test conversion...')

    // Create a simple 8x8 pixel art (base64 encoded)
    // This is a simple smiley face pattern
    const testPixelArtBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAQklEQVR4nGNkgIL/Jxj+w9ggwGjBwAiimbBJIosxwRgwHchskBwjNt3IgAVdF4YV2ByJzIbbhc14kKlgE9CNRxYDAGu5HWKOkB4vAAAAAElFTkSuQmCC'
    
    const pixelArtDataUrl = `data:image/png;base64,${testPixelArtBase64}`

    // Call the conversion API
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3200}`
    
    const convertRes = await fetch(`${baseUrl}/api/3d-print/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pixelArtImageUrl: pixelArtDataUrl,
        orderNumber: `TEST-${Date.now()}`
      })
    })

    const convertData = await convertRes.json()

    if (!convertData.success) {
      console.error('[3D Test] Conversion failed:', convertData.error)
      return NextResponse.json({
        success: false,
        error: convertData.error,
        message: 'PNG → STL dönüşümü başarısız oldu. Python bağımlılıklarını kontrol edin: pip3 install -r requirements.txt'
      }, { status: 500 })
    }

    console.log('[3D Test] ✅ Conversion successful!')

    return NextResponse.json({
      success: true,
      message: '🎉 3D Print Pipeline Çalışıyor!',
      result: {
        stlUrl: convertData.stlUrl,
        stats: convertData.stats,
        localPath: `/Users/serdarozerman/8bitwearnew/public${convertData.stlUrl}`,
        instructions: [
          '1. STL dosyasını indirin veya direkt açın:',
          `   open http://localhost:3200${convertData.stlUrl}`,
          '',
          '2. Dosyayı 3D viewer\'da görüntüleyin:',
          '   - Mac: Preview veya Blender',
          '   - Windows: 3D Viewer',
          '   - Cura (3D printing slicer)',
          '',
          '3. Gerçek siparişler için:',
          '   POST /api/orders/complete { "orderId": "..." }'
        ]
      }
    })

  } catch (error: any) {
    console.error('[3D Test] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      troubleshooting: {
        'Python not installed': 'brew install python3',
        'Dependencies missing': 'pip3 install -r requirements.txt',
        'Script not found': 'Check lib/python/png_to_stl.py exists',
        'Permission denied': 'chmod +x lib/python/png_to_stl.py'
      }
    }, { status: 500 })
  }
}
