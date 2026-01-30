'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft, CreditCard } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'sonner'

interface CartItem {
  id: string
  productName: string
  productImage: string
  color: string
  size: string
  quantity: number
  price: number
  designPreview?: string
  pixelArtUrl?: string  // URL of the pixel art for 3D print conversion
}

export default function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Load cart from localStorage or API
    loadCart()
  }, [])

  const loadCart = () => {
    try {
      const savedCart = localStorage.getItem('cart')
      if (savedCart) {
        setCartItems(JSON.parse(savedCart))
      }
    } catch (error) {
      console.error('Failed to load cart:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateQuantity = (id: string, change: number) => {
    setCartItems(items => {
      const updated = items.map(item => {
        if (item.id === id) {
          const newQuantity = Math.max(1, item.quantity + change)
          return { ...item, quantity: newQuantity }
        }
        return item
      })
      localStorage.setItem('cart', JSON.stringify(updated))
      return updated
    })
  }

  const removeItem = (id: string) => {
    setCartItems(items => {
      const updated = items.filter(item => item.id !== id)
      localStorage.setItem('cart', JSON.stringify(updated))
      toast.success('Ürün sepetten çıkarıldı')
      return updated
    })
  }

  const clearCart = () => {
    setCartItems([])
    localStorage.removeItem('cart')
    toast.success('Sepet temizlendi')
  }

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      toast.error('Sepetiniz boş!')
      return
    }
    
    toast.info('3D dosyalar oluşturuluyor...')
    
    try {
      // Process each cart item with custom design
      for (const item of cartItems) {
        console.log('[Checkout] Processing item:', item)
        
        // Check if item has pixel art URL (preferred) or design preview (fallback)
        const pixelArtUrl = item.pixelArtUrl || item.designPreview
        
        if (!pixelArtUrl) {
          console.warn('[Checkout] No pixel art found for item:', item.id)
          toast.warning(`Ürün ${item.productName} için tasarım bulunamadı`)
          continue
        }
        
        console.log('[Checkout] Converting pixel art to STL:', pixelArtUrl.substring(0, 100) + '...')
        
        // Convert pixel art to STL
        const response = await fetch('/api/3d-print/convert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pixelArtImageUrl: pixelArtUrl,
            orderNumber: item.id
          })
        })
        
        const data = await response.json()
        
        if (data.success) {
          toast.success(`✅ STL dosyası oluşturuldu!`)
          
          // Show result in console
          console.log('[3D Print Success]', data)
          console.log('[STL URL]', data.stlUrl)
          console.log('[Stats]', data.stats)
          
          // Open STL file in new tab
          window.open(`http://localhost:3200${data.stlUrl}`, '_blank')
          
          // Show success message
          toast.success(
            `🎉 ${item.productName} için STL dosyası oluşturuldu! ` +
            'Tarayıcınızda yeni sekmede açıldı.',
            { duration: 10000 }
          )
        } else {
          toast.error(`STL oluşturulamadı: ${data.error}`)
          console.error('[3D Print Error]', data)
        }
      }
      
    } catch (error) {
      console.error('[Checkout] Error:', error)
      toast.error('Bir hata oluştu. Konsolu kontrol edin.')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/" 
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Alışverişe Devam Et</span>
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ShoppingCart className="w-6 h-6" />
              Sepetim ({cartItems.length})
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {cartItems.length === 0 ? (
          // Empty Cart
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Sepetiniz Boş
            </h2>
            <p className="text-gray-600 mb-6">
              Henüz sepetinize ürün eklemediniz.
            </p>
            <Link 
              href="/products/premium-tisort"
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
            >
              Alışverişe Başla
            </Link>
          </div>
        ) : (
          // Cart Items
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items List */}
            <div className="lg:col-span-2 space-y-4">
              {/* Clear Cart Button */}
              {cartItems.length > 0 && (
                <div className="flex justify-end">
                  <button
                    onClick={clearCart}
                    className="text-sm text-red-600 hover:text-red-700 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Sepeti Temizle
                  </button>
                </div>
              )}

              {cartItems.map(item => (
                <div 
                  key={item.id} 
                  className="bg-white rounded-lg p-6 shadow-sm border border-gray-200"
                >
                  <div className="flex gap-6">
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      <div className="w-32 h-32 bg-gray-100 rounded-lg overflow-hidden relative">
                        {item.designPreview ? (
                          <Image
                            src={item.designPreview}
                            alt={item.productName}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <ShoppingCart className="w-12 h-12" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Product Info */}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {item.productName}
                      </h3>
                      
                      <div className="space-y-1 text-sm text-gray-600 mb-4">
                        <p>Renk: <span className="font-medium">{item.color}</span></p>
                        <p>Beden: <span className="font-medium">{item.size}</span></p>
                        <p className="text-lg font-bold text-purple-600">
                          {item.price.toFixed(2)} ₺
                        </p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 border border-gray-300 rounded-lg">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="p-2 hover:bg-gray-100 transition"
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="px-4 font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="p-2 hover:bg-gray-100 transition"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-red-600 hover:text-red-700 transition"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Item Total */}
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {(item.price * item.quantity).toFixed(2)} ₺
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 sticky top-4">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Sipariş Özeti
                </h2>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-600">
                    <span>Ara Toplam</span>
                    <span>{calculateTotal().toFixed(2)} ₺</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Kargo</span>
                    <span className="text-green-600 font-medium">Ücretsiz</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>KDV (%20)</span>
                    <span>{(calculateTotal() * 0.2).toFixed(2)} ₺</span>
                  </div>
                  
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-lg font-bold text-gray-900">
                      <span>Toplam</span>
                      <span>{(calculateTotal() * 1.2).toFixed(2)} ₺</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold text-lg"
                >
                  <CreditCard className="w-5 h-5" />
                  Ödemeye Geç
                </button>

                <div className="mt-4 text-center text-sm text-gray-600">
                  <p>✓ Güvenli Ödeme</p>
                  <p>✓ Ücretsiz Kargo</p>
                  <p>✓ 14 Gün İade Garantisi</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
