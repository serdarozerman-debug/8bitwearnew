# Make.com Entegrasyon Rehberi

8BitWear sisteminin Make.com ile entegrasyonu için detaylı rehber.

## 🎯 Neden Make.com?

**n8n yerine Make.com tercih edilme sebepleri:**
- ✅ **Daha stabil** - Webhook'lar daha az hata veriyor
- ✅ **Daha hızlı** - Response süreleri daha iyi
- ✅ **Daha kolay setup** - UI daha kullanıcı dostu
- ✅ **Daha iyi retry logic** - Hata durumunda otomatik tekrar deneme
- ✅ **Daha iyi monitoring** - Detaylı log ve hata takibi

## 📋 Entegrasyon Özeti

8BitWear'dan Make.com'a **outgoing webhooks** gönderilir:
1. Sipariş oluşturuldu
2. Ödeme tamamlandı
3. AI tasarım oluşturuldu
4. Kargo gönderildi

Make.com'dan 8BitWear'a **incoming webhooks** alınır:
1. Üretim tamamlandı
2. Kargo oluşturuldu
3. Teslimat gerçekleşti

## 🔧 Setup Adımları

### 1. Make.com Hesabı Oluştur

1. https://make.com adresine git
2. Hesap oluştur (Free plan başlangıç için yeterli)
3. Yeni bir "Scenario" oluştur

### 2. Webhook URL'lerini Al

#### A) Outgoing Webhooks (8BitWear → Make.com)

Make.com'da her event için ayrı bir webhook oluştur:

**Scenario 1: Order Created**
1. Make.com'da yeni scenario
2. "Webhooks > Custom Webhook" modülü ekle
3. "Add" tıkla, webhook adı: "8bitwear-order-created"
4. URL'i kopyala, örn: `https://hook.eu1.make.com/abc123xyz`
5. Bu URL'i `.env` dosyasına ekle:
```env
MAKE_WEBHOOK_ORDER_CREATED=https://hook.eu1.make.com/abc123xyz
```

**Scenario 2: Payment Completed**
1. Yeni scenario oluştur
2. Webhook adı: "8bitwear-payment-completed"
3. URL'i kopyala ve `.env`'e ekle:
```env
MAKE_WEBHOOK_PAYMENT_COMPLETED=https://hook.eu1.make.com/def456uvw
```

**Scenario 3: Design Created**
1. Yeni scenario oluştur
2. Webhook adı: "8bitwear-design-created"
3. URL'i kopyala:
```env
MAKE_WEBHOOK_DESIGN_CREATED=https://hook.eu1.make.com/ghi789rst
```

**Scenario 4: Shipment Created**
1. Yeni scenario oluştur
2. Webhook adı: "8bitwear-shipment-created"
3. URL'i kopyala:
```env
MAKE_WEBHOOK_SHIPMENT_CREATED=https://hook.eu1.make.com/jkl012mno
```

#### B) Incoming Webhooks (Make.com → 8BitWear)

8BitWear'ın webhook receiver'ı zaten hazır: `/api/webhooks/make`

Make.com'dan bu endpoint'e POST request gönder:

**Production URL:**
```
https://yourdomain.com/api/webhooks/make
```

**Development URL:**
```
http://localhost:3001/api/webhooks/make
```

### 3. Güvenlik Setup

`.env` dosyasına secret ekle:
```env
MAKE_WEBHOOK_SECRET=your-random-secret-key-here
```

Make.com'dan gönderilen webhook'lara Authorization header ekle:
```
Authorization: Bearer your-random-secret-key-here
```

## 📤 Outgoing Webhook Payloads

### 1. Order Created

```json
{
  "event": "order.created",
  "timestamp": "2024-01-11T10:30:00Z",
  "data": {
    "orderNumber": "ORD-ABC123-XYZ",
    "userId": "clx...",
    "items": [
      {
        "productName": "Premium Tişört",
        "quantity": 1,
        "customization": {...}
      }
    ],
    "totalAmount": 379.99,
    "customerEmail": "customer@example.com",
    "customerName": "John Doe"
  }
}
```

### 2. Payment Completed

```json
{
  "event": "payment.completed",
  "timestamp": "2024-01-11T10:35:00Z",
  "data": {
    "orderNumber": "ORD-ABC123-XYZ",
    "amount": 379.99,
    "currency": "TRY",
    "paymentIntentId": "pi_...",
    "customerEmail": "customer@example.com"
  }
}
```

### 3. Design Created

```json
{
  "event": "design.created",
  "timestamp": "2024-01-11T10:40:00Z",
  "data": {
    "orderNumber": "ORD-ABC123-XYZ",
    "designUrl": "https://oaidalleapiprodscus.blob.core.windows.net/...",
    "attemptNumber": 1,
    "isApproved": false
  }
}
```

### 4. Shipment Created

```json
{
  "event": "shipment.created",
  "timestamp": "2024-01-11T12:00:00Z",
  "data": {
    "orderNumber": "ORD-ABC123-XYZ",
    "trackingNumber": "TRK123456",
    "carrier": "Aras Kargo",
    "customerEmail": "customer@example.com",
    "estimatedDelivery": "2024-01-15"
  }
}
```

## 📥 Incoming Webhook Payloads

### 1. Production Completed

Make.com'dan gönder:
```json
{
  "event": "production.completed",
  "timestamp": "2024-01-12T14:00:00Z",
  "data": {
    "orderNumber": "ORD-ABC123-XYZ"
  }
}
```

### 2. Shipment Created

```json
{
  "event": "shipment.created",
  "timestamp": "2024-01-13T09:00:00Z",
  "data": {
    "orderNumber": "ORD-ABC123-XYZ",
    "trackingNumber": "TRK123456",
    "carrier": "Aras Kargo",
    "estimatedDelivery": "2024-01-15"
  }
}
```

### 3. Delivery Completed

```json
{
  "event": "delivery.completed",
  "timestamp": "2024-01-15T16:30:00Z",
  "data": {
    "orderNumber": "ORD-ABC123-XYZ"
  }
}
```

## 🔄 Örnek Make.com Senaryoları

### Senaryo 1: Sipariş Tedarikçiye Email

```
[Webhook: Order Created] 
    → [Parse JSON]
    → [Gmail: Send Email to Supplier]
    → [Google Sheets: Add Row] (optional, log tutmak için)
```

### Senaryo 2: Ödeme Sonrası SMS

```
[Webhook: Payment Completed]
    → [Parse JSON]
    → [Twilio: Send SMS to Customer]
    → [Slack: Send Notification to Team]
```

### Senaryo 3: AI Tasarım Bildirimi

```
[Webhook: Design Created]
    → [Parse JSON]
    → [Filter: Is Approved?]
    → [Discord/Telegram: Send Notification]
```

### Senaryo 4: Tedarikçi Üretim → Sistem Güncelleme

```
[Google Sheets: Watch New Row] (Tedarikçi işaretler)
    → [Parse Data]
    → [HTTP: POST to 8BitWear]
        URL: https://yourdomain.com/api/webhooks/make
        Headers: Authorization: Bearer secret
        Body: {"event": "production.completed", ...}
```

## 🧪 Test Etme

### 1. Development Test

```bash
# Terminal 1: ngrok ile public URL oluştur
ngrok http 3001

# Ngrok URL'i Make.com'a ekle
# Örn: https://abc123.ngrok.io/api/webhooks/make
```

### 2. Postman ile Test

**Outgoing Webhook Testi:**
```bash
curl -X POST https://hook.eu1.make.com/abc123xyz \
  -H "Content-Type: application/json" \
  -d '{
    "event": "order.created",
    "timestamp": "2024-01-11T10:00:00Z",
    "data": {
      "orderNumber": "TEST-001",
      "customerEmail": "test@example.com"
    }
  }'
```

**Incoming Webhook Testi:**
```bash
curl -X POST http://localhost:3001/api/webhooks/make \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret" \
  -d '{
    "event": "production.completed",
    "timestamp": "2024-01-11T10:00:00Z",
    "data": {
      "orderNumber": "ORD-ABC123-XYZ"
    }
  }'
```

## ⚠️ Önemli Notlar

### Retry Logic

Sistem otomatik retry yapıyor:
- Max 3 deneme
- Exponential backoff (1s, 2s, 4s)
- Rate limit hatalarında daha uzun bekle

### Timeout

- Webhook request timeout: 30 saniye
- Make.com response bekle max 60 saniye

### Error Handling

Webhook hatası olsa bile sistem devam eder:
```typescript
// Hata olsa bile sipariş devam eder
notifyOrderCreated(data)
  .catch(err => console.error('Make notification failed:', err))
```

### Logging

Tüm webhook aktiviteler loglanır:
```
[Make.com] Attempt 1/3: order.created
[Make.com] Success: order.created
[Make.com] Attempt 1 failed: timeout
[Make.com] Waiting 2000ms before retry...
```

## 📊 Monitoring

### Make.com Dashboard

1. Make.com > Scenarios
2. Her scenario'nun execution history'sini görüntüle
3. Failed runs için detaylı log
4. Execution time ve success rate

### 8BitWear Logs

```bash
# Production logs (Vercel)
vercel logs --follow

# Filter Make.com logs
vercel logs | grep "Make.com"
```

## 🚨 Troubleshooting

### Webhook Gönderilmiyor

1. `.env` dosyasında URL doğru mu?
2. URL'de trailing slash var mı? (olmamalı)
3. Make.com webhook aktif mi?

### Webhook Alınamıyor

1. Make.com'dan Authorization header gönderilmiş mi?
2. Secret doğru mu?
3. JSON format doğru mu?
4. Endpoint aktif mi? (`GET /api/webhooks/make` test et)

### Timeout Hatası

1. Make.com scenario çok mu yavaş?
2. Gereksiz modüller var mı?
3. Network sorunu mu?

### Rate Limit

OpenAI rate limit'e takılıyorsa:
1. Tier yükselt (OpenAI dashboard)
2. Retry logic zaten mevcut
3. Queue sistemi ekle (gelecekte)

## 📚 Kaynaklar

- [Make.com Documentation](https://www.make.com/en/help/tools)
- [Webhooks Best Practices](https://www.make.com/en/help/tools/webhooks)
- [API Limits](https://www.make.com/en/help/general/organization-limits)

---

**Version:** 1.0.0  
**Last Updated:** 2024-01-11  
**Status:** ✅ Production Ready
