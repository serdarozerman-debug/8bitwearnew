import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const resend = new Resend(process.env.RESEND_API_KEY)

interface SupplierNotificationRequest {
  orderNumber: string
  stlUrl: string
  pixelArtUrl: string
  customerInfo: {
    name: string
    email: string
    phone: string
    address: string
  }
  productInfo: {
    name: string
    size: string
    color: string
    quantity?: number
  }
}

/**
 * POST /api/supplier/notify
 * 
 * Send email notification to supplier with 3D print files and order details.
 * 
 * @body orderNumber - Order number
 * @body stlUrl - STL file URL
 * @body pixelArtUrl - Pixel art PNG URL
 * @body customerInfo - Customer details
 * @body productInfo - Product details
 * 
 * @returns { success, emailId } or { success: false, error }
 */
export async function POST(req: NextRequest) {
  try {
    const body: SupplierNotificationRequest = await req.json()
    const {
      orderNumber,
      stlUrl,
      pixelArtUrl,
      customerInfo,
      productInfo
    } = body

    // Validate required fields
    if (!orderNumber || !stlUrl || !pixelArtUrl) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: orderNumber, stlUrl, pixelArtUrl'
      }, { status: 400 })
    }

    console.log('[Supplier] Sending notification for order:', orderNumber)

    // Build email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px;
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .section {
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      border-left: 4px solid #667eea;
    }
    .section h2 {
      margin-top: 0;
      color: #667eea;
      font-size: 20px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 150px 1fr;
      gap: 10px;
    }
    .info-label {
      font-weight: bold;
      color: #666;
    }
    .info-value {
      color: #333;
    }
    .download-buttons {
      display: flex;
      gap: 15px;
      margin-top: 15px;
    }
    .btn {
      display: inline-block;
      padding: 12px 24px;
      background: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: bold;
    }
    .btn:hover {
      background: #5568d3;
    }
    .btn-secondary {
      background: #10b981;
    }
    .btn-secondary:hover {
      background: #059669;
    }
    .preview {
      text-align: center;
      margin: 20px 0;
    }
    .preview img {
      max-width: 300px;
      border: 3px solid #e5e7eb;
      border-radius: 8px;
      image-rendering: pixelated;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .print-specs {
      background: #fef3c7;
      padding: 15px;
      border-radius: 6px;
      border-left: 4px solid #f59e0b;
    }
    .print-specs h3 {
      margin-top: 0;
      color: #92400e;
    }
    .print-specs ul {
      margin: 10px 0;
      padding-left: 20px;
    }
    .print-specs li {
      margin: 8px 0;
      color: #78350f;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎨 Yeni 3D Baskı Siparişi</h1>
    <p style="margin: 10px 0 0 0; font-size: 18px;">Sipariş #${orderNumber}</p>
  </div>

  <div class="section">
    <h2>📦 Ürün Bilgileri</h2>
    <div class="info-grid">
      <div class="info-label">Ürün:</div>
      <div class="info-value">${productInfo.name}</div>
      
      <div class="info-label">Beden:</div>
      <div class="info-value">${productInfo.size}</div>
      
      <div class="info-label">Renk:</div>
      <div class="info-value">${productInfo.color}</div>
      
      ${productInfo.quantity ? `
      <div class="info-label">Adet:</div>
      <div class="info-value">${productInfo.quantity}</div>
      ` : ''}
    </div>
  </div>

  <div class="section">
    <h2>🎨 Tasarım Dosyaları</h2>
    <div class="download-buttons">
      <a href="${stlUrl}" class="btn" download>
        📥 STL İndir (3D Model)
      </a>
      <a href="${pixelArtUrl}" class="btn btn-secondary" download>
        🖼️ PNG İndir (Pixel Art)
      </a>
    </div>
    
    <div class="preview">
      <p><strong>Tasarım Önizleme:</strong></p>
      <img src="${pixelArtUrl}" alt="Pixel Art Design" />
    </div>
  </div>

  <div class="section">
    <h2>👤 Müşteri Bilgileri</h2>
    <div class="info-grid">
      <div class="info-label">Ad Soyad:</div>
      <div class="info-value">${customerInfo.name}</div>
      
      <div class="info-label">Email:</div>
      <div class="info-value">${customerInfo.email}</div>
      
      <div class="info-label">Telefon:</div>
      <div class="info-value">${customerInfo.phone || 'Belirtilmemiş'}</div>
      
      <div class="info-label">Adres:</div>
      <div class="info-value">${customerInfo.address}</div>
    </div>
  </div>

  <div class="print-specs">
    <h3>📝 Baskı Talimatları</h3>
    <ul>
      <li><strong>Malzeme:</strong> TPU (esnek filament)</li>
      <li><strong>Katman Yüksekliği:</strong> 0.2mm (önerilen)</li>
      <li><strong>Doluluk:</strong> 100% (tam dolu)</li>
      <li><strong>Boyut:</strong> ~96x96x3mm (64x64 pixel @ 1.5mm/pixel)</li>
      <li><strong>Renk:</strong> Tek renk (siyah veya mavi TPU önerilir)</li>
      <li><strong>Yapıştırma:</strong> Isı transferi ile tişört üzerine uygulanacak</li>
    </ul>
    <p style="margin: 15px 0 0 0; color: #92400e;">
      <strong>⚠️ Önemli:</strong> STL dosyası optimize edilmiş bir 3D model içeriyor. 
      Doğrudan slicer programınıza yükleyebilirsiniz.
    </p>
  </div>

  <div class="footer">
    <p>Bu email otomatik olarak oluşturulmuştur.</p>
    <p>Sorularınız için: <a href="mailto:orders@8bitwear.com">orders@8bitwear.com</a></p>
    <p style="margin-top: 15px; color: #9ca3af;">
      8BitWear - Pixel Art Custom Apparel<br>
      © ${new Date().getFullYear()} Tüm hakları saklıdır.
    </p>
  </div>
</body>
</html>
    `

    // Send email via Resend
    const supplierEmail = process.env.SUPPLIER_EMAIL || 'supplier@example.com'
    
    console.log('[Supplier] Sending email to:', supplierEmail)

    const result = await resend.emails.send({
      from: 'Siparişler <orders@8bitwear.com>',
      to: supplierEmail,
      subject: `🎨 Yeni Sipariş #${orderNumber} - 3D TPU Baskı`,
      html: emailHtml,
      // Optionally attach pixel art as inline attachment
      // attachments: [
      //   {
      //     filename: `order-${orderNumber}-pixelart.png`,
      //     content: pixelArtUrl
      //   }
      // ]
    })

    console.log('[Supplier] ✅ Email sent successfully:', result.data?.id || 'sent')

    return NextResponse.json({
      success: true,
      emailId: result.data?.id || 'sent',
      sentTo: supplierEmail
    })

  } catch (error: any) {
    console.error('[Supplier] ❌ Error sending notification:', error)
    
    // Return error but don't fail the entire order process
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to send supplier notification'
    }, { status: 500 })
  }
}
