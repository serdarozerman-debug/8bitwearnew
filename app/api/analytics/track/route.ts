import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      sessionId,
      userId,
      page,
      event,
      eventData,
      referrer,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
    } = body

    // User agent'tan cihaz bilgilerini çıkar
    const userAgent = req.headers.get('user-agent') || ''
    const device = getDeviceType(userAgent)
    const browser = getBrowser(userAgent)
    const os = getOS(userAgent)

    // IP'den lokasyon bilgisi (production'da Vercel otomatik sağlar)
    const country = req.headers.get('x-vercel-ip-country') || undefined
    const city = req.headers.get('x-vercel-ip-city') || undefined

    // Traffic source belirleme
    let trafficSource = 'direct'
    if (utm_source) {
      trafficSource = utm_source
    } else if (referrer) {
      if (referrer.includes('google')) trafficSource = 'google'
      else if (referrer.includes('facebook')) trafficSource = 'facebook'
      else if (referrer.includes('instagram')) trafficSource = 'instagram'
      else if (referrer.includes('twitter')) trafficSource = 'twitter'
      else trafficSource = 'referral'
    }

    // Analytics kaydı oluştur
    await prisma.analytics.create({
      data: {
        sessionId,
        userId: userId || undefined,
        page,
        event,
        eventData: eventData || undefined,
        referrer: referrer || undefined,
        trafficSource,
        utmSource: utm_source || undefined,
        utmMedium: utm_medium || undefined,
        utmCampaign: utm_campaign || undefined,
        utmContent: utm_content || undefined,
        utmTerm: utm_term || undefined,
        device,
        browser,
        os,
        country,
        city,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Analytics track error:', error)
    return NextResponse.json(
      { error: error.message || 'Tracking failed' },
      { status: 500 }
    )
  }
}

function getDeviceType(userAgent: string): string {
  if (/mobile/i.test(userAgent)) return 'mobile'
  if (/tablet|ipad/i.test(userAgent)) return 'tablet'
  return 'desktop'
}

function getBrowser(userAgent: string): string {
  if (/chrome/i.test(userAgent)) return 'Chrome'
  if (/safari/i.test(userAgent)) return 'Safari'
  if (/firefox/i.test(userAgent)) return 'Firefox'
  if (/edge/i.test(userAgent)) return 'Edge'
  return 'Other'
}

function getOS(userAgent: string): string {
  if (/windows/i.test(userAgent)) return 'Windows'
  if (/mac/i.test(userAgent)) return 'MacOS'
  if (/linux/i.test(userAgent)) return 'Linux'
  if (/android/i.test(userAgent)) return 'Android'
  if (/ios|iphone|ipad/i.test(userAgent)) return 'iOS'
  return 'Other'
}
