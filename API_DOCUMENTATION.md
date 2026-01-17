# 8BitWear - API Documentation

Tüm API endpoint'lerinin detaylı dokümantasyonu.

## 🔐 Authentication

Şu anda authentication sistemi temel seviyede. İleride NextAuth.js ile geliştirilecek.

## 📦 Products API

### GET /api/products
Ürün listesi

**Query Parameters:**
- `category` (optional): `all` | `tshirt` | `sweatshirt` | `hoodie`
- `page` (optional): Sayfa numarası (default: 1)
- `limit` (optional): Sayfa başına ürün (default: 12)

**Response:**
```json
{
  "success": true,
  "products": [
    {
      "id": "clx...",
      "name": "Premium Pamuklu Tişört",
      "slug": "premium-pamuklu-tisort",
      "description": "Yüksek kaliteli...",
      "basePrice": "299.99",
      "category": "TSHIRT",
      "images": ["url1", "url2"],
      "variants": [
        {
          "id": "clx...",
          "color": "Beyaz",
          "size": "M",
          "additionalPrice": "0",
          "stock": 25
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 50,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### GET /api/products/[slug]
Ürün detayı

**Response:**
```json
{
  "success": true,
  "product": {
    "id": "clx...",
    "name": "Premium Pamuklu Tişört",
    "slug": "premium-pamuklu-tisort",
    "description": "Detaylı açıklama...",
    "basePrice": "299.99",
    "category": "TSHIRT",
    "images": ["url1", "url2"],
    "variants": [...]
  }
}
```

## 🛒 Orders API

### POST /api/orders/create
Yeni sipariş oluştur

**Request Body:**
```json
{
  "userId": "clx...",
  "items": [
    {
      "productId": "clx...",
      "variantId": "clx...",
      "quantity": 1,
      "customization": {
        "type": "print",
        "placement": "front-center",
        "size": "medium",
        "notes": "Ek notlar..."
      },
      "originalImageUrl": "https://..."
    }
  ],
  "addressId": "clx...",
  "trafficSource": {
    "source": "google",
    "utm_source": "google",
    "utm_medium": "cpc",
    "utm_campaign": "summer-2024"
  }
}
```

**Response:**
```json
{
  "success": true,
  "order": {
    "id": "clx...",
    "orderNumber": "ORD-ABC123-XYZ",
    "totalAmount": "379.99",
    "items": [...]
  }
}
```

### GET /api/orders/[orderNumber]/tracking
Kargo takip bilgisi

**Response:**
```json
{
  "success": true,
  "tracking": {
    "trackingNumber": "TRK123456",
    "status": "Dağıtımda",
    "currentLocation": "İstanbul Şube",
    "estimatedDelivery": "2024-06-15T10:00:00Z",
    "history": [
      {
        "date": "2024-06-10T14:30:00Z",
        "status": "Kargo Alındı",
        "location": "İzmir Şube",
        "description": "Gönderiniz şubemize teslim edildi"
      }
    ]
  },
  "order": {
    "status": "SHIPPED",
    "shippedAt": "2024-06-10T15:00:00Z",
    "deliveredAt": null
  }
}
```

## 🤖 AI API

### POST /api/ai/generate
AI görsel üretimi

**Request Body:**
```json
{
  "orderId": "clx...",
  "originalImageUrl": "https://...",
  "customizationDetails": {
    "type": "logo",
    "placement": "front-center",
    "size": "medium",
    "colors": ["#000000", "#FFFFFF"],
    "additionalNotes": "Minimalist stil"
  },
  "previousFeedback": "Daha büyük olsun"
}
```

**Response:**
```json
{
  "success": true,
  "generation": {
    "id": "clx...",
    "imageUrl": "https://oaidalleapiprodscus.blob.core.windows.net/...",
    "attemptNumber": 1,
    "maxAttempts": 3,
    "remainingAttempts": 2
  }
}
```

### POST /api/ai/approve
Tasarım onaylama/reddetme

**Request Body:**
```json
{
  "generationId": "clx...",
  "isApproved": true,
  "feedback": "Mükemmel!" // Sadece isApproved=false ise
}
```

**Response (Onaylandı):**
```json
{
  "success": true,
  "message": "Tasarım onaylandı",
  "nextStep": "payment"
}
```

**Response (Reddedildi):**
```json
{
  "success": true,
  "message": "Geri bildiriminiz alındı",
  "nextStep": "regenerate",
  "remainingAttempts": 1
}
```

**Response (Max Deneme):**
```json
{
  "success": true,
  "message": "Maksimum deneme sayısına ulaşıldı",
  "requiresSupport": true
}
```

## 💳 Payment API

### POST /api/payment/create-intent
Stripe Payment Intent oluştur

**Request Body:**
```json
{
  "orderId": "clx..."
}
```

**Response:**
```json
{
  "success": true,
  "clientSecret": "pi_..._secret_...",
  "amount": 37999,
  "currency": "try"
}
```

### POST /api/webhooks/stripe
Stripe webhook (Internal)

**Events:**
- `payment_intent.succeeded` - Ödeme başarılı
- `payment_intent.payment_failed` - Ödeme başarısız

**Actions:**
- Sipariş durumu güncellenir
- Müşteriye onay emaili gönderilir
- Tedarikçiye üretim emaili gönderilir
- SupplierOrder kaydı oluşturulur

## 📊 Admin API

### GET /api/admin/dashboard
Dashboard istatistikleri

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalOrders": 150,
    "totalRevenue": 45000,
    "pendingOrders": 12,
    "completedOrders": 125,
    "totalCustomers": 87,
    "averageOrderValue": 300
  },
  "charts": {
    "dailySales": [
      {
        "date": "2024-06-10",
        "count": 15,
        "revenue": 4500
      }
    ],
    "trafficSources": [
      {
        "trafficSource": "google",
        "_count": 450
      }
    ],
    "campaigns": [
      {
        "utmCampaign": "summer-2024",
        "_count": 120
      }
    ],
    "topProducts": [
      {
        "productId": "clx...",
        "_sum": {
          "quantity": 45,
          "totalPrice": 13500
        },
        "product": {
          "name": "Premium Tişört",
          "images": ["url"]
        }
      }
    ],
    "orderStatusDistribution": [
      {
        "status": "DELIVERED",
        "_count": 125
      }
    ]
  },
  "recentOrders": [...]
}
```

## 📧 Invoice API

### POST /api/orders/invoice
Otomatik fatura kesimi

**Request Body:**
```json
{
  "orderNumber": "ORD-ABC123-XYZ",
  "deliveryConfirmed": true
}
```

**Response:**
```json
{
  "success": true,
  "invoice": {
    "invoiceNumber": "8BW202412345",
    "invoiceUrl": "https://efatura.8bitwear.com/invoices/8BW202412345.pdf",
    "invoiceDate": "2024-06-15T10:00:00Z"
  }
}
```

## 📈 Analytics API

### POST /api/analytics/track
Olay tracking (Internal)

**Request Body:**
```json
{
  "sessionId": "session-123456",
  "userId": "clx...", // optional
  "page": "/products/premium-tisort",
  "event": "product_view",
  "eventData": {
    "productId": "clx...",
    "productName": "Premium Tişört"
  },
  "referrer": "https://google.com",
  "utm_source": "google",
  "utm_medium": "cpc",
  "utm_campaign": "summer-2024"
}
```

**Response:**
```json
{
  "success": true
}
```

## 🚨 Error Responses

Tüm API'ler hata durumunda şu formatı kullanır:

```json
{
  "error": "Hata mesajı",
  "message": "Detaylı açıklama" // optional
}
```

**HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (geçersiz input)
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error

## 🔄 Webhook Events

### Kargo Webhook (Gelecek)
```
POST /api/webhooks/cargo
```

**Event Types:**
- `shipment.created` - Kargo oluşturuldu
- `shipment.in_transit` - Yolda
- `shipment.delivered` - Teslim edildi
- `shipment.failed` - Teslimat başarısız

### Tedarikçi Webhook (Gelecek)
```
POST /api/webhooks/supplier
```

**Event Types:**
- `production.started` - Üretim başladı
- `production.completed` - Üretim tamamlandı
- `shipment.ready` - Kargoya hazır

## 📝 Rate Limiting

**Development:** Limit yok

**Production:**
- Anonymous: 100 req/hour
- Authenticated: 1000 req/hour
- Admin: 10000 req/hour

## 🔐 API Security

### Headers
- `Content-Type: application/json`
- `x-session-id` - Session tracking için
- `Authorization: Bearer <token>` - Auth için (gelecek)

### CORS
- Development: `localhost:3000`
- Production: `8bitwear.com`, `www.8bitwear.com`

### Webhook Security
- Stripe: Signature verification (`stripe.webhooks.constructEvent`)
- Kargo: API key verification
- IP Whitelist: Production için

## 🧪 Testing

### Postman Collection
```bash
# İndir
curl https://8bitwear.com/api-docs/postman.json > postman-collection.json

# Import to Postman
```

### cURL Examples

**Ürün Listesi:**
```bash
curl https://8bitwear.com/api/products?category=tshirt
```

**Sipariş Oluştur:**
```bash
curl -X POST https://8bitwear.com/api/orders/create \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "clx...",
    "items": [...],
    "addressId": "clx..."
  }'
```

## 📚 Additional Resources

- [Stripe API Docs](https://stripe.com/docs/api)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Resend API Docs](https://resend.com/docs)

---

**Version:** 1.0.0  
**Last Updated:** 2024-01-11
