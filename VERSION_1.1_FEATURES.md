# v1.1 - Multi-Product Design Editor

**Version:** v1.1  
**Date:** 2026-01-19  
**Base:** v1.0  
**Branch:** feature/product-selector-v1.1

---

## 🎉 Yeni Özellikler

### 1. Çoklu Ürün Desteği
✅ **5 Ürün Tipi:**
- Tişört (4 açı)
- Sweatshirt (4 açı)
- Şapka (3 açı)
- Çanta (2 açı)
- Anahtarlık (1 açı)

### 2. Açı Bazlı Tasarım
✅ Her ürünün farklı açıları için ayrı tasarım
✅ Açılar arası geçiş (state preservation)
✅ "Başka açı eklemek ister misiniz?" dialog
✅ Her açıda farklı elementler

**Örnek - Tişört Açıları:**
- Ön Göğüs
- Sağ Kol
- Sol Kol
- Sırt

### 3. Renk Seçimi
✅ 8 renk seçeneği:
- Beyaz, Siyah, Mavi, Kırmızı
- Lacivert, Pembe, Sarı, Yeşil

✅ Renk değişince mockup otomatik güncellenir

### 4. Beden Seçimi (Conditional)
✅ **Tişört & Sweatshirt:** XS, S, M, L, XL, XXL
✅ **Şapka:** Çocuk, Yetişkin
✅ **Çanta & Anahtarlık:** Beden yok

### 5. Gelişmiş Element Yönetimi
✅ **Element Listesi:** Sol panelde tüm elementler görünür
✅ **Seçme:** Element'e tıkla, listeden seç
✅ **Düzenleme:** Seçili element'i düzenle
✅ **Silme:** Element'i sil (listeden veya canvas'tan)

### 6. Boyut Sınırlamaları
✅ **Görseller:** 40-50px arası (resize handles ile)
✅ **Metin:** Max 15px (slider ile kontrol)

### 7. Özel AI Prompt'u
✅ Müşteri ek talimat girebilir:
- "Yüzü gülüyor olsun"
- "Kıyafet mavi olsun"
- "Saç rengi sarı olsun"

✅ Ana akış bozulmadan önceliklendirilir

---

## 📁 Yeni Dosyalar

```
lib/product-config.ts         # Product types & configuration
components/CustomDesignEditor.tsx  # Yeniden yazıldı (1000+ satır)
components/CustomDesignEditor.v1.0.backup.tsx  # v1.0 backup
public/mockups/               # Mockup klasör yapısı
  ├── tshirt/{color}/{angle}.png
  ├── sweatshirt/{color}/{angle}.png
  ├── hat/{color}/{angle}.png
  ├── bag/{color}/{angle}.png
  └── keychain/white/flat-white.png
```

---

## 🎨 UI Güncellemeleri

### Sol Panel (Product Configuration)
```
┌─────────────────────────────┐
│ Ürün Ayarları               │
│                             │
│ Ürün Tipi: [Tişört ▼]      │
│                             │
│ Açı:                        │
│ ┌─────────────────────────┐ │
│ │ Ön Göğüs (2)            │ │
│ │ Sağ Kol                 │ │
│ │ [+ Yeni Açı Ekle]       │ │
│ └─────────────────────────┘ │
│                             │
│ Renk: [8 renk grid]         │
│                             │
│ Beden: [XS][S][M][L]...     │
│                             │
│ ─────────────────────────── │
│                             │
│ Tasarım Öğeleri (2)         │
│ ┌─────────────────────────┐ │
│ │ 🖼️ Görsel           [🗑️] │ │
│ │ 📝 "Hello"          [🗑️] │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

### Center (Canvas)
```
┌─────────────────────────────────────────┐
│ Tişört Tasarımı | Ön Göğüs - Beyaz [💾] │
│                                         │
│         ┌─────────────────┐             │
│         │                 │             │
│         │   [Mockup]      │             │
│         │                 │             │
│         │   [Elements]    │             │
│         │                 │             │
│         └─────────────────┘             │
│                                         │
└─────────────────────────────────────────┘
```

### Sağ Panel (Tools)
```
┌─────────────────────────────┐
│ Tasarım Araçları            │
│                             │
│ [📤 Görsel Yükle]           │
│                             │
│ Ek AI Talimatları:          │
│ ┌─────────────────────────┐ │
│ │ Örn: Karakterin yüzü... │ │
│ │                         │ │
│ └─────────────────────────┘ │
│                             │
│ ─────────────────────────── │
│                             │
│ Metin Ekle:                 │
│ [_______________]           │
│ Boyut: [8───●───15] 12px    │
│ Font: [Arial ▼]             │
│ Renk: [⬛] #000000          │
│ [B] [I]                     │
│ [📝 Metin Ekle]             │
│                             │
│ ─────────────────────────── │
│                             │
│ Seçili Öğe:                 │
│ [🗑️ Sil]                    │
└─────────────────────────────┘
```

---

## 🔄 Workflow

### 1. Ürün Seçimi
```
User → Ürün Tipi Seç (Tişört) 
     → Default açı yüklenir (Ön Göğüs)
     → Default renk (Beyaz)
     → Default beden (M)
     → Mockup güncellenir
```

### 2. Tasarım Oluşturma
```
User → Görsel Yükle
     → AI Conversion (with custom prompt)
     → Element canvas'a eklenir (40-50px)
     → Resize/drag ile düzenle

User → Metin Ekle (max 15px)
     → Font/renk/stil seç
     → Element canvas'a eklenir
```

### 3. Çoklu Açı Ekleme
```
User → Görsel yükler
     → AI conversion tamamlanır
     → Dialog: "Başka açı eklemek ister misiniz?"
     → User → "Sağ Kol" seçer
     → Yeni açı oluşturulur (boş elementler)
     → User → Tasarım yapar
```

### 4. Açılar Arası Geçiş
```
User → Sol panelden "Sağ Kol" seçer
     → Mevcut açı elementleri kaydedilir
     → Yeni açı elementleri yüklenir
     → Mockup güncellenir
```

### 5. Kaydetme
```
User → [Kaydet] butonuna basar
     → Tüm açıların tasarımları kaydedilir
     → Format: angleDesigns[]
     → Her açı için: { angle, angleName, elements[] }
```

---

## 📊 State Yönetimi

```typescript
// Product configuration
const [selectedProduct, setSelectedProduct] = useState<ProductType>('tshirt')
const [selectedAngle, setSelectedAngle] = useState<ProductAngle>('front-chest')
const [selectedColor, setSelectedColor] = useState<ProductColor>('white')
const [selectedSize, setSelectedSize] = useState<ProductSize | null>('M')

// Multi-angle designs
const [angleDesigns, setAngleDesigns] = useState<AngleDesign[]>([
  { angle: 'front-chest', angleName: 'Ön Göğüs', elements: [] }
])
const [currentAngleIndex, setCurrentAngleIndex] = useState(0)

// Current angle's elements
const [elements, setElements] = useState<DesignElement[]>([])

// Custom AI prompt
const [customPrompt, setCustomPrompt] = useState('')
```

---

## 🧪 Test Senaryoları

### Test 1: Ürün Değiştirme
1. Tişört seç → Ön Göğüs görünür
2. Sweatshirt seç → Ön Göğüs görünür (yeni ürün)
3. Şapka seç → Ön (Alın) görünür
4. Çanta seç → Ön Yüz görünür
5. Anahtarlık seç → Düz Beyaz Alan görünür

✅ Her değişimde mockup güncellenir  
✅ Elementler sıfırlanır

### Test 2: Çoklu Açı
1. Tişört → Ön Göğüs
2. Görsel yükle → AI conversion
3. Dialog → "Sağ Kol" seç
4. Yeni açı → Boş canvas
5. Sol panelden "Ön Göğüs" seç
6. Eklenen görsel hala orada

✅ Açılar arası state korunur

### Test 3: Renk Değiştirme
1. Beyaz seç → /mockups/tshirt/white/front-chest.png
2. Siyah seç → /mockups/tshirt/black/front-chest.png
3. Mavi seç → /mockups/tshirt/blue/front-chest.png

✅ Mockup otomatik güncellenir  
✅ Elementler korunur

### Test 4: Element Yönetimi
1. Görsel ekle → Listede görünür
2. Metin ekle → Listede görünür
3. Element seç (canvas) → Listede highlight
4. Element seç (liste) → Canvas'ta highlight
5. Element sil → Her ikiden de silinir

✅ Liste ve canvas senkronize

### Test 5: Boyut Sınırlamaları
1. Görsel yükle → Default 45px
2. Resize handle sürükle → 40-50px arası
3. 40px'den küçük → 40px'de dur
4. 50px'den büyük → 50px'de dur
5. Metin ekle → Slider max 15px

✅ Sınırlar zorlanır

### Test 6: Özel AI Prompt
1. Custom prompt: "yüzü gülüyor olsun"
2. Üzgün fotoğraf yükle
3. AI output: Gülen karakter

✅ Custom prompt önceliklendirilir

---

## 🐛 Bilinen Sorunlar

1. **Mockup placeholder'lar:**
   - Şu an tüm mockup'lar aynı (white-tshirt.png)
   - Gerçek mockup görselleri eklenmeli

2. **Analytics error:**
   - Prisma database bağlantısı yok
   - Localhost'ta normal

3. **Kaydetme:**
   - `onSave` prop'u kullanılmıyor
   - Backend API'si yok

---

## 🚀 Sonraki Adımlar

1. **Gerçek Mockup'lar:**
   - Her ürün/renk/açı için gerçek görsel
   - Placeholder'ları değiştir

2. **Backend Integration:**
   - Design kaydetme API'si
   - Database schema (designs table)

3. **Export:**
   - Print-ready PNG export
   - Multi-angle ZIP download

4. **Gelişmiş Özellikler:**
   - Copy design to all angles
   - Template library
   - Design history (undo/redo)

---

## 📞 v1.0'a Geri Dönüş

Eğer sorun çıkarsa:

```bash
# v1.0'a geri dön
cd /Users/serdarozerman/8bitwearnew
git checkout v1.0

# veya sadece editor'ı geri al
cp components/CustomDesignEditor.v1.0.backup.tsx components/CustomDesignEditor.tsx
```

---

**Test URL:** http://localhost:3200/products/premium-tisort  
**Status:** ✅ Ready for Testing  
**Build:** ✅ No Errors
