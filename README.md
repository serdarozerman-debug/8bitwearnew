# 8BitWear - Otonom Kişiye Özel 3D Baskılı Giyim Markası

AI destekli, tamamen otonom çalışan kişiye özel 3D baskılı tişört, sweatshirt ve hoodie üretim platformu.

## 🎯 Özellikler

### ✨ Müşteri Tarafı
- **Ürün Kataloğu**: Tişört, sweatshirt, hoodie çeşitleri
- **Kişiselleştirme**: Logo, baskı, etiket, nakış seçenekleri
- **AI Görsel İyileştirme**: DALL-E 3 ile otomatik tasarım optimizasyonu
- **3 Deneme Hakkı**: Müşteri memnuniyeti için tasarım düzeltme
- **Güvenli Ödeme**: Stripe entegrasyonu
- **Sipariş Takibi**: Gerçek zamanlı kargo takip
- **Otomatik Fatura**: Teslimat sonrası otomatik e-fatura

### 🤖 Otonom Sistem
- **AI Görsel Üretimi**: OpenAI DALL-E 3 entegrasyonu
- **Otomatik Email**: Tedarikçi ve müşteri bildirimleri
- **Kargo Entegrasyonu**: Aras, Yurtiçi, MNG kargo API'leri
- **E-Fatura**: GİB e-fatura sistemi entegrasyonu
- **Analytics**: Trafik kaynağı, UTM, kampanya takibi

### 📊 Admin Dashboard
- **Sipariş Yönetimi**: Tüm siparişleri tek ekrandan yönetme
- **Ürün Yönetimi**: Katalog düzenleme
- **Raporlama**: Gelir, sipariş, müşteri analizleri
- **SEO & SEM**: Kampanya performans takibi

## 🛠 Teknoloji Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: NextAuth.js (planlanan)
- **Payment**: Stripe
- **AI**: OpenAI (DALL-E 3, GPT-4 Vision)
- **Email**: Resend
- **File Upload**: Uploadthing
- **Analytics**: Custom + Google Analytics

## 📦 Kurulum

### Gereksinimler
- Node.js 18+
- PostgreSQL
- npm veya yarn

### 1. Bağımlılıkları Yükle
```bash
npm install
```

### 2. Veritabanı Kurulumu
```bash
# .env dosyasını oluştur ve DATABASE_URL'i ayarla
cp .env.example .env

# Prisma migration'ları çalıştır
npx prisma generate
npx prisma migrate dev
```

### 3. Ortam Değişkenleri
`.env` dosyasında şu değişkenleri ayarlayın:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/8bitwear"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# OpenAI
OPENAI_API_KEY="sk-..."

# Email (Resend)
RESEND_API_KEY="re_..."
EMAIL_FROM="orders@8bitwear.com"

# Tedarikçi
SUPPLIER_EMAIL="supplier@example.com"
SUPPLIER_NAME="Tedarikçi Firma"

# Kargo
CARGO_API_KEY="..."
CARGO_API_URL="https://api.arakargo.com"

# E-Fatura
EFATURA_USERNAME="..."
EFATURA_PASSWORD="..."
EFATURA_API_URL="..."
```

### 4. Development Server
```bash
npm run dev
```

Site http://localhost:3000 adresinde çalışacaktır.

## 📋 Sipariş Akışı

1. **Müşteri Girişi**: Reklam veya organik trafik (UTM tracking)
2. **Ürün Seçimi**: Kategori, renk, beden seçimi
3. **Kişiselleştirme**: 
   - Görsel yükleme
   - Tip seçimi (logo/baskı/nakış/etiket)
   - Yerleşim ve boyut belirleme
4. **AI Üretimi**: 
   - OpenAI DALL-E 3 ile görsel oluşturma
   - Müşteri onayı
   - Max 3 deneme hakkı
5. **Ödeme**: Stripe ile güvenli ödeme
6. **Otomatik İşlemler**:
   - Tedarikçiye detaylı email
   - Müşteriye onay emaili
   - Sipariş takip sistemi
7. **Üretim & Kargo**: 
   - Tedarikçi üretim tamamlama
   - Otomatik kargo etiketi
   - Takip numarası gönderimi
8. **Teslimat & Fatura**:
   - Kargo teslim bildirimi
   - Otomatik e-fatura kesimi

## 🗂 Proje Yapısı

```
/app
  /api
    /ai              # AI görsel üretimi
    /payment         # Stripe entegrasyonu
    /orders          # Sipariş yönetimi
    /products        # Ürün API'leri
    /admin           # Admin API'leri
    /webhooks        # Stripe & Kargo webhooks
  /products          # Ürün sayfaları
  /admin             # Admin paneli
/components          # React bileşenleri
/lib
  /prisma.ts        # Database client
  /stripe.ts        # Stripe helper
  /ai.ts            # OpenAI entegrasyonu
  /email.ts         # Email helper
  /cargo.ts         # Kargo API
  /invoice.ts       # E-fatura
  /utils.ts         # Yardımcı fonksiyonlar
/prisma
  /schema.prisma    # Database şeması
```

## 🔐 API Endpoints

### Müşteri API'leri
- `GET /api/products` - Ürün listesi
- `GET /api/products/[slug]` - Ürün detayı
- `POST /api/orders/create` - Sipariş oluştur
- `POST /api/ai/generate` - AI görsel üret
- `POST /api/ai/approve` - Tasarım onayla
- `POST /api/payment/create-intent` - Ödeme başlat
- `GET /api/orders/[orderNumber]/tracking` - Kargo takip

### Admin API'leri
- `GET /api/admin/dashboard` - Dashboard verileri
- `GET /api/admin/orders` - Sipariş listesi
- `GET /api/admin/analytics` - Detaylı analitik

### Webhooks
- `POST /api/webhooks/stripe` - Stripe ödeme bildirimleri
- `POST /api/webhooks/cargo` - Kargo durum güncellemeleri

## 📊 Veritabanı Şeması

### Ana Tablolar
- **users**: Kullanıcılar (müşteri, admin, tedarikçi)
- **products**: Ürünler
- **product_variants**: Renk/beden varyantları
- **orders**: Siparişler
- **order_items**: Sipariş kalemleri
- **ai_generations**: AI üretim geçmişi
- **addresses**: Teslimat adresleri
- **supplier_orders**: Tedarikçi iletişimi
- **analytics**: Trafik ve olay takibi
- **support_tickets**: Müşteri destek talepleri

## 🚀 Production Deployment

### Vercel (Önerilen)
```bash
# Vercel CLI ile deploy
npm i -g vercel
vercel
```

### Environment Variables
Production için tüm `.env` değişkenlerini Vercel dashboard'dan ayarlayın.

### Database
- Supabase, PlanetScale veya Railway PostgreSQL önerilir

## 📈 SEO & Marketing

- **UTM Tracking**: Tüm kampanyalar otomatik takip edilir
- **Google Analytics**: Entegre
- **Meta Tags**: Her sayfa için optimize
- **Sitemap**: Otomatik oluşturulur
- **Schema.org**: Product markup

## 🔧 Bakım & İzleme

### Loglar
```bash
# Production logları
vercel logs
```

### Database Yedekleme
```bash
# PostgreSQL backup
pg_dump -U user dbname > backup.sql
```

### Monitoring
- Vercel Analytics
- Sentry (önerilen)
- Custom dashboard

## 📝 TODO / Geliştirmeler

- [ ] NextAuth.js ile authentication
- [ ] Shopping cart state management (Zustand)
- [ ] Email templates iyileştirme
- [ ] Gerçek kargo API entegrasyonları
- [ ] E-fatura gerçek entegrasyonu
- [ ] Admin panel tam implementasyonu
- [ ] Unit & Integration testler
- [ ] Storybook komponent dokümantasyonu
- [ ] PWA desteği
- [ ] Multi-language (i18n)

## 🤝 Katkıda Bulunma

Bu proje özel bir projedir. Sorularınız için iletişime geçin.

## 📄 Lisans

Tüm hakları saklıdır © 2024 8BitWear

## 📞 İletişim

- Website: https://8bitwear.com
- Email: info@8bitwear.com
- Destek: destek@8bitwear.com

---

**Not**: Bu proje tamamen otonom çalışacak şekilde tasarlanmıştır. Tüm süreçler (AI üretimi, ödeme, tedarikçi bildirimi, kargo takip, fatura kesimi) otomatik gerçekleşir.
