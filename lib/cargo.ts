// Kargo API entegrasyonu için yardımcı fonksiyonlar
// Bu örnek Aras Kargo için - diğer kargo firmaları için benzer şekilde yapılabilir

export interface CargoTrackingInfo {
  trackingNumber: string
  status: string
  currentLocation?: string
  estimatedDelivery?: Date
  history: Array<{
    date: Date
    status: string
    location: string
    description: string
  }>
}

export async function getCargoTracking(
  trackingNumber: string,
  provider: string = 'aras'
): Promise<CargoTrackingInfo> {
  // Gerçek API entegrasyonu buraya gelecek
  // Şimdilik mock data döndürüyoruz
  
  if (provider === 'aras') {
    return getArasCargoTracking(trackingNumber)
  } else if (provider === 'yurtici') {
    return getYurticiCargoTracking(trackingNumber)
  } else if (provider === 'mng') {
    return getMngCargoTracking(trackingNumber)
  }

  throw new Error('Desteklenmeyen kargo firması')
}

async function getArasCargoTracking(trackingNumber: string): Promise<CargoTrackingInfo> {
  // Aras Kargo API entegrasyonu
  // https://api.arakargo.com/documentation
  
  try {
    const response = await fetch(`${process.env.CARGO_API_URL}/tracking/${trackingNumber}`, {
      headers: {
        'Authorization': `Bearer ${process.env.CARGO_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('Kargo takip bilgisi alınamadı')
    }

    const data = await response.json()

    // API response'unu standart formata çevir
    return {
      trackingNumber,
      status: data.status,
      currentLocation: data.currentLocation,
      estimatedDelivery: data.estimatedDelivery ? new Date(data.estimatedDelivery) : undefined,
      history: data.history || [],
    }
  } catch (error) {
    console.error('Aras Cargo tracking error:', error)
    
    // Mock data döndür (development için)
    return {
      trackingNumber,
      status: 'Dağıtımda',
      currentLocation: 'İstanbul Şube',
      estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      history: [
        {
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          status: 'Kargo Alındı',
          location: 'İzmir Şube',
          description: 'Gönderiniz şubemize teslim edildi',
        },
        {
          date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          status: 'Transfer Merkezi',
          location: 'İstanbul Transfer Merkezi',
          description: 'Gönderiniz transfer merkezine ulaştı',
        },
        {
          date: new Date(),
          status: 'Dağıtımda',
          location: 'İstanbul Şube',
          description: 'Gönderiniz dağıtıma çıktı',
        },
      ],
    }
  }
}

async function getYurticiCargoTracking(trackingNumber: string): Promise<CargoTrackingInfo> {
  // Yurtiçi Kargo API entegrasyonu
  // Benzer şekilde implement edilir
  
  return {
    trackingNumber,
    status: 'Dağıtımda',
    history: [],
  }
}

async function getMngCargoTracking(trackingNumber: string): Promise<CargoTrackingInfo> {
  // MNG Kargo API entegrasyonu
  // Benzer şekilde implement edilir
  
  return {
    trackingNumber,
    status: 'Dağıtımda',
    history: [],
  }
}

// Kargo gönderimi oluştur
export async function createShipment(data: {
  orderId: string
  recipientName: string
  recipientPhone: string
  address: string
  city: string
  district: string
  postalCode: string
  weight: number // kg
  desi?: number
}) {
  try {
    // Aras Kargo API ile gönderi oluştur
    const response = await fetch(`${process.env.CARGO_API_URL}/shipments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CARGO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId: data.orderId,
        recipient: {
          name: data.recipientName,
          phone: data.recipientPhone,
          address: data.address,
          city: data.city,
          district: data.district,
          postalCode: data.postalCode,
        },
        package: {
          weight: data.weight,
          desi: data.desi || Math.ceil(data.weight * 3), // Varsayılan desi hesaplama
        },
      }),
    })

    if (!response.ok) {
      throw new Error('Kargo gönderimi oluşturulamadı')
    }

    const result = await response.json()

    return {
      trackingNumber: result.trackingNumber,
      labelUrl: result.labelUrl,
    }
  } catch (error) {
    console.error('Create shipment error:', error)
    
    // Mock data döndür (development için)
    return {
      trackingNumber: `TRK${Date.now().toString(36).toUpperCase()}`,
      labelUrl: 'https://example.com/label.pdf',
    }
  }
}
