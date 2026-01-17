# 8BitWear - Deployment Guide

Bu rehber, 8BitWear projesini production ortamına deploy etmek için adım adım talimatlar içerir.

## 📋 Ön Gereksinimler

### Gerekli Hesaplar
1. **Vercel Account** - Frontend/Backend hosting
2. **PostgreSQL Database** - Supabase, PlanetScale, Railway vb.
3. **Stripe Account** - Ödeme işlemleri
4. **OpenAI Account** - AI görsel üretimi
5. **Resend Account** - Email gönderimi
6. **Uploadthing Account** - Dosya yükleme
7. **Kargo Firması API** - Aras, Yurtiçi, MNG
8. **E-Fatura Sistemi** - GİB entegrasyonu

## 🚀 Hızlı Deployment (Vercel)

### 1. GitHub'a Push
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin your-repo-url
git push -u origin main
```

### 2. Vercel'de Proje Oluştur
1. https://vercel.com adresine git
2. "Import Project" tıkla
3. GitHub repo'nuzu seç
4. Framework: Next.js seçili gelecek

### 3. Environment Variables Ekle
Vercel dashboard'da şu değişkenleri ekle:

```env
# Database
DATABASE_URL=postgresql://...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# OpenAI
OPENAI_API_KEY=sk-...

# Email
RESEND_API_KEY=re_...
EMAIL_FROM=orders@8bitwear.com

# Uploadthing
UPLOADTHING_SECRET=sk_live_...
UPLOADTHING_APP_ID=...

# Supplier
SUPPLIER_EMAIL=supplier@example.com
SUPPLIER_NAME=Tedarikçi Firma

# Cargo
CARGO_API_KEY=...
CARGO_API_URL=https://api.arakargo.com

# E-Fatura
EFATURA_USERNAME=...
EFATURA_PASSWORD=...
EFATURA_API_URL=...

# Analytics
NEXT_PUBLIC_GA_ID=G-...
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

### 4. Build & Deploy
```bash
vercel --prod
```

## 🗄️ Database Setup

### Supabase (Önerilen)

1. https://supabase.com adresine git
2. Yeni proje oluştur
3. Database password'ü kaydet
4. Connection string'i kopyala
5. Vercel'de DATABASE_URL olarak ekle

```bash
# Prisma migration'ları çalıştır
npx prisma migrate deploy
npx prisma generate

# Seed data ekle
npm run db:seed
```

### PlanetScale

1. https://planetscale.com adresine git
2. Database oluştur
3. Connection string al
4. Vercel'e ekle

```bash
# PlanetScale için migration
npx prisma db push
```

## 💳 Stripe Setup

### 1. Production Keys Al
1. https://dashboard.stripe.com adresine git
2. Settings > API keys
3. Production secret key'i kopyala
4. Vercel'e ekle

### 2. Webhook Endpoint Oluştur
1. Stripe Dashboard > Developers > Webhooks
2. "Add endpoint" tıkla
3. URL: `https://yourdomain.com/api/webhooks/stripe`
4. Events seç:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Webhook secret'i kopyala
6. Vercel'e `STRIPE_WEBHOOK_SECRET` olarak ekle

### 3. Test
```bash
# Stripe CLI ile local test
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger payment_intent.succeeded
```

## 🤖 OpenAI Setup

1. https://platform.openai.com adresine git
2. API Keys > Create new secret key
3. Key'i kopyala
4. Vercel'e ekle
5. Billing > Add payment method (DALL-E 3 kullanımı için gerekli)

## 📧 Email Setup (Resend)

1. https://resend.com adresine git
2. API Keys > Create API Key
3. Key'i kopyala
4. Vercel'e ekle

### Domain Verification
1. Resend > Domains > Add Domain
2. DNS kayıtlarını ekle
3. Verification bekle
4. `EMAIL_FROM` olarak doğrulanmış domain kullan

## 📦 Kargo Entegrasyonu

### Aras Kargo
1. Aras Kargo ile iletişime geç
2. API erişimi talep et
3. Test credentials al
4. Production'a geç

### Test Modu
Development'ta mock data kullanılır. Production için gerçek API entegrasyonu gerekli.

## 🧾 E-Fatura Entegrasyonu

### GİB e-Fatura
1. Mali müşavir ile görüş
2. E-fatura entegratörü seç
3. API credentials al
4. Test ortamında dene
5. Production credentials al

### Test Modu
Development'ta mock invoice oluşturulur.

## 🔒 Security Checklist

### Environment Variables
- [ ] Tüm API key'ler production key'ler
- [ ] NEXTAUTH_SECRET güçlü ve random
- [ ] Database password güvenli
- [ ] Webhook secret'ları doğru

### SSL/HTTPS
- [ ] Custom domain için SSL sertifikası
- [ ] Force HTTPS enabled
- [ ] Stripe webhook HTTPS kullanıyor

### API Rate Limiting
- [ ] Vercel Pro plan için rate limiting aktif
- [ ] OpenAI rate limit ayarları yapıldı
- [ ] Stripe webhook retry logic test edildi

## 📊 Monitoring & Analytics

### Vercel Analytics
1. Vercel Dashboard > Analytics
2. Enable Vercel Analytics
3. Web Vitals izle

### Sentry (Önerilen)
```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

### Google Analytics
1. GA4 property oluştur
2. Measurement ID'yi kopyala
3. `NEXT_PUBLIC_GA_ID` olarak ekle

## 🔄 CI/CD Pipeline

### Otomatik Deployment
Vercel otomatik olarak:
- `main` branch'e push: Production deploy
- PR oluşturulunca: Preview deploy
- Build başarısızsa: Deployment cancel

### Custom Build Command
```json
{
  "scripts": {
    "build": "prisma generate && next build"
  }
}
```

## 🧪 Post-Deployment Testing

### 1. Smoke Tests
- [ ] Ana sayfa yükleniyor
- [ ] Ürünler listeleniyor
- [ ] Ürün detay sayfası çalışıyor
- [ ] Kişiselleştirme formu çalışıyor

### 2. Kritik Akış Testi
- [ ] Sipariş oluşturma
- [ ] AI görsel üretimi
- [ ] Ödeme akışı
- [ ] Email gönderimi
- [ ] Admin dashboard erişimi

### 3. Performance
- [ ] Lighthouse score > 90
- [ ] Core Web Vitals yeşil
- [ ] API response time < 1s

## 🔧 Maintenance

### Database Backups
```bash
# Günlük otomatik backup (Supabase otomatik yapıyor)
# Manuel backup:
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

### Log Monitoring
```bash
# Vercel logs
vercel logs production --follow

# Specific function logs
vercel logs /api/orders/create --follow
```

### Updates
```bash
# Dependencies güncelle
npm update
npm audit fix

# Prisma güncelle
npm install @prisma/client@latest prisma@latest
npx prisma generate
```

## 🚨 Troubleshooting

### Build Failures
```bash
# Local'de build test et
npm run build

# Prisma generate check
npx prisma generate

# Type errors check
npx tsc --noEmit
```

### Database Issues
```bash
# Prisma schema sync
npx prisma db push

# Migration reset (dikkatli!)
npx prisma migrate reset
```

### API Errors
- Vercel Function logs kontrol et
- Environment variables doğru mu?
- External API'ler erişilebilir mi?

## 📞 Support

### İletişim
- Technical Issues: dev@8bitwear.com
- Deployment Help: Vercel Discord
- Database Issues: Supabase Support

## ✅ Launch Checklist

### Pre-Launch
- [ ] Tüm environment variables set
- [ ] Database migration'ları çalıştırıldı
- [ ] Seed data eklendi
- [ ] Stripe production mode
- [ ] Email domain verified
- [ ] SSL certificate active
- [ ] Analytics tracking çalışıyor
- [ ] Error tracking (Sentry) kurulu

### Launch Day
- [ ] Production deployment successful
- [ ] Smoke tests geçti
- [ ] Critical paths test edildi
- [ ] Backup alındı
- [ ] Monitoring aktif
- [ ] Support team hazır

### Post-Launch
- [ ] Performance metrics izleniyor
- [ ] User feedback toplanıyor
- [ ] Bug reports değerlendiriliyor
- [ ] Günlük analytics review

---

**🎉 Başarılar! 8BitWear production'da!**
