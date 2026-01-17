# 🎉 8BitWear - Güncellenmiş Sistem

## ✨ Yeni Özellikler (v2.0)

### 1. 🎨 Tek Sayfa Custom Design Editor

**Özellikler:**
- ✅ Drag & Drop görsel konumlandırma
- ✅ Drag & Drop metin konumlandırma
- ✅ Görsel yükleme (max 5MB)
- ✅ Metin ekleme sistemi
- ✅ Font seçimi (9 farklı font)
- ✅ Font boyutu slider (12-120px)
- ✅ Renk seçici (HexColorPicker)
- ✅ Bold/Italic desteği
- ✅ Görsel büyüt/küçült
- ✅ Görsel döndürme (90° adımlarla)
- ✅ Real-time preview
- ✅ Multiple element desteği

**Kullanım:**
1. Ürün seç (renk, beden)
2. "Tasarım Editörünü Aç" tıkla
3. Sol panel'den görsel yükle veya metin ekle
4. Canvas'ta sürükle-bırak ile konumlandır
5. Seçili elementi düzenle (boyutlandır, döndür)
6. "Tasarımı Kaydet" tıkla
7. Sepete ekle

### 2. 🔗 Make.com Entegrasyonu

**N8n yerine Make.com tercih edildi:**
- ✅ Daha stabil webhook sistemi
- ✅ Daha hızlı response süreleri
- ✅ Daha iyi retry logic
- ✅ Detaylı monitoring

**Outgoing Webhooks (8BitWear → Make.com):**
- `order.created` - Sipariş oluşturuldu
- `payment.completed` - Ödeme tamamlandı
- `design.created` - AI tasarım oluşturuldu
- `shipment.created` - Kargo gönderildi

**Incoming Webhooks (Make.com → 8BitWear):**
- `production.completed` - Üretim tamamlandı
- `shipment.created` - Kargo oluşturuldu
- `delivery.completed` - Teslimat gerçekleşti

**Setup:**
```env
# .env dosyasına ekle
MAKE_WEBHOOK_ORDER_CREATED=https://hook.eu1.make.com/...
MAKE_WEBHOOK_PAYMENT_COMPLETED=https://hook.eu1.make.com/...
MAKE_WEBHOOK_DESIGN_CREATED=https://hook.eu1.make.com/...
MAKE_WEBHOOK_SHIPMENT_CREATED=https://hook.eu1.make.com/...
MAKE_WEBHOOK_SECRET=your-secret-key
```

### 3. 🤖 Optimize Edilmiş OpenAI Prompt Sistemi

**Sorunlar ve Çözümler:**

❌ **Eski Sorunlar:**
- Prompt'lar çok uzun oluyordu (4000+ karakter)
- Bazı request'ler OpenAI'a ulaşmıyordu
- Timeout hataları
- Content policy violation'lar

✅ **Yeni Çözümler:**
- ✅ **Kısa, optimize prompt'lar** (max 1000 karakter)
- ✅ **Akıllı truncation** - Gereksiz kelimeler temizlenir
- ✅ **3x Retry logic** - Exponential backoff ile
- ✅ **Rate limit handling** - Otomatik bekle ve tekrar dene
- ✅ **Detaylı error logging** - Her hata loglanır
- ✅ **Validation** - Prompt gönderilmeden önce kontrol
- ✅ **Timeout artırıldı** - 60 saniye
- ✅ **Metin tasarım desteği** - Text-only tasarımlar için optimize

**Prompt Yapısı:**
```typescript
// Kısa ve net
"Create a 3D print-ready design"
+ "using colors: #000000, #FFFFFF"
+ "High quality, clean design"
+ "Sharp edges, bold contrast"
+ "Customer feedback: make it bigger" // Varsa
```

### 4. 📊 Gelişmiş Hata Yönetimi

**AI Generation:**
- Try-catch ile tüm hatalar yakalanır
- Retry logic (3 deneme)
- Detaylı error messages
- Development'ta stack trace gösterilir

**Make.com Webhooks:**
- Async çağrılar - hata olsa bile sistem devam eder
- Retry logic (3 deneme, exponential backoff)
- Timeout handling (30 saniye)
- Detaylı logging

## 🚀 Başlarken

### 1. Dependencies Yükle

```bash
cd /Users/serdarozerman/8bitwearnew
npm install
```

### 2. Prisma Setup

```bash
# Client generate (zaten yapıldı)
npx prisma generate

# Database push (PostgreSQL gerekli)
npx prisma db push

# Seed data
npm run db:seed
```

### 3. Environment Variables

`.env` dosyası oluştur ve doldur (`.env.example`'a bak)

**Kritik değişkenler:**
```env
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
STRIPE_SECRET_KEY=sk_test_...
RESEND_API_KEY=re_...

# Make.com (isteğe bağlı)
MAKE_WEBHOOK_ORDER_CREATED=https://hook.eu1.make.com/...
MAKE_WEBHOOK_SECRET=your-secret
```

### 4. Development Server

```bash
npm run dev
```

**Site:** http://localhost:3001 (port 3000 kullanımdaysa 3001 kullanılır)

## 🎨 Custom Design Editor Kullanımı

### Görsel Ekleme

1. Sol panel'de "Görsel Ekle" bölümü
2. "Görsel Yükle" butonu
3. Dosya seç (max 5MB, jpg/png/gif)
4. Canvas'ta görünür
5. Sürükle-bırak ile konumlandır

**Görsel Düzenleme:**
- **Büyüt/Küçült:** %20 adımlarla
- **Döndür:** 90° adımlarla
- **Sil:** Seçili elementi kaldır

### Metin Ekleme

1. Sol panel'de "Metin Ekle" bölümü
2. Metin yaz
3. Font seç (9 seçenek)
4. Boyut ayarla (12-120px)
5. Renk seç (HexColorPicker)
6. Bold/Italic
7. "Metni Ekle" butonu

**Metin Düzenleme:**
- **Sürükle:** Konumlandır
- **Seç:** Tekrar düzenle
- **Sil:** Kaldır

### Multiple Elements

- Sınırsız görsel ekle
- Sınırsız metin ekle
- Her element bağımsız düzenlenebilir
- Z-index otomatik (son eklenen üstte)

## 📝 Dokümantasyonlar

- **README.md** - Ana dokümantasyon
- **API_DOCUMENTATION.md** - API endpoint'ler
- **DEPLOYMENT_GUIDE.md** - Production deployment
- **MAKE_INTEGRATION_GUIDE.md** - Make.com entegrasyonu (YENİ!)
- **PROJECT_SUMMARY.md** - Proje özeti

## 🔧 Kütüphaneler (Eklenenler)

```json
{
  "react-draggable": "^4.4.6",
  "@dnd-kit/core": "^6.1.0",
  "@dnd-kit/utilities": "^3.2.2",
  "react-colorful": "^5.6.1"
}
```

## 📊 Yeni Dosyalar

```
/lib/make.ts                      # Make.com webhook helper
/lib/ai.ts                         # Optimize edilmiş AI sistem
/components/CustomDesignEditor.tsx # Drag & drop editor
/app/products/[slug]/page.tsx      # Güncellenmiş ürün sayfası
/app/api/webhooks/make/route.ts    # Make.com webhook receiver
MAKE_INTEGRATION_GUIDE.md          # Make.com rehberi
```

## ⚠️ Önemli Notlar

### Prisma 7 Update

Prisma 7'de database URL artık `prisma.config.ts`'de:
```typescript
// prisma.config.ts
export default defineConfig({
  datasource: {
    url: process.env["DATABASE_URL"],
  },
})
```

Schema'dan `url` kaldırıldı:
```prisma
datasource db {
  provider = "postgresql"
  // url kaldırıldı
}
```

### Port Değişikliği

Port 3000 kullanımdaysa otomatik 3001'e geçer.

### Development vs Production

**Development:**
- Make.com webhook'lar optional
- Mock data kullanılır (cargo, fatura)
- Detaylı error messages

**Production:**
- Tüm API key'ler gerekli
- Gerçek entegrasyonlar aktif
- Error messages minimal

## 🎯 Akış Özeti

1. **Müşteri** → Ürün seç
2. **Müşteri** → Design editor'de tasarım oluştur
   - Görsel yükle + metin ekle
   - Drag & drop ile konumlandır
3. **Müşteri** → Sepete ekle, öde
4. **Sistem** → AI ile final görsel üret
5. **Make.com** → Tedarikçiye bildirim
6. **Tedarikçi** → Üretir
7. **Make.com** → Sisteme bildirim
8. **Sistem** → Kargo oluştur
9. **Make.com** → Müşteriye bildirim
10. **Kargo** → Teslim et
11. **Sistem** → Otomatik fatura kes

**Tamamen otonom!**

## 🔒 Güvenlik

- ✅ Make.com webhook signature verification
- ✅ Stripe webhook signature verification
- ✅ Environment variables güvenli
- ✅ File upload size limit (5MB)
- ✅ Prisma prepared statements
- ✅ TypeScript type safety

## 🐛 Known Issues

1. **Prisma:** İlk generate'de hata alınabilir → `npx prisma generate` tekrar çalıştır
2. **Port:** 3000 meşgulse 3001 kullanılır
3. **Make.com:** Webhook URL'leri development'ta test için ngrok gerekir

## 📞 Destek

Sorularınız için:
- GitHub Issues
- Email: dev@8bitwear.com

---

**Version:** 2.0.0  
**Last Updated:** 2024-01-11  
**Status:** ✅ Production Ready  
**Port:** http://localhost:3001
