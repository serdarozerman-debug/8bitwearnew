'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { formatPrice } from '@/lib/utils'

interface Product {
  id: string
  name: string
  slug: string
  description: string
  basePrice: string
  category: string
  images: string[]
  variants: Array<{
    id: string
    color: string
    size: string
    additionalPrice: string
    stock: number
  }>
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('all')

  useEffect(() => {
    fetchProducts()
  }, [category])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/products?category=${category}`)
      const data = await response.json()
      if (data.success) {
        setProducts(data.products)
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow">
        {/* Hero */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Ürünlerimiz</h1>
            <p className="text-xl text-purple-100">Kişiye özel tasarımlar için mükemmel ürünler</p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          {/* Kategoriler */}
          <div className="flex flex-wrap gap-4 mb-8 justify-center">
            <button
              onClick={() => setCategory('all')}
              className={`px-6 py-3 rounded-lg font-semibold transition ${
                category === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tümü
            </button>
            <button
              onClick={() => setCategory('tshirt')}
              className={`px-6 py-3 rounded-lg font-semibold transition ${
                category === 'tshirt'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tişörtler
            </button>
            <button
              onClick={() => setCategory('sweatshirt')}
              className={`px-6 py-3 rounded-lg font-semibold transition ${
                category === 'sweatshirt'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Sweatshirt
            </button>
            <button
              onClick={() => setCategory('hoodie')}
              className={`px-6 py-3 rounded-lg font-semibold transition ${
                category === 'hoodie'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Hoodie
            </button>
          </div>

          {/* Ürünler */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-600">Ürünler yükleniyor...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">Bu kategoride ürün bulunamadı.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className="group bg-white rounded-xl shadow-md hover:shadow-xl transition overflow-hidden"
                >
                  <div className="aspect-square bg-gray-100 relative overflow-hidden">
                    {product.images && product.images[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <span className="text-4xl">👕</span>
                      </div>
                    )}
                    {product.variants.length === 0 && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                        Stokta Yok
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-1 group-hover:text-purple-600 transition">
                      {product.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {product.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-purple-600">
                        {formatPrice(product.basePrice)}
                      </span>
                      <span className="text-sm text-gray-500">
                        {product.variants.length} varyant
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
