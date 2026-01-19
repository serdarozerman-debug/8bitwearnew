'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Header from '@/components/Header'
import CustomDesignEditor from '@/components/CustomDesignEditor'
import { toast } from 'sonner'

interface Product {
  id: string
  name: string
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
    image?: string
  }>
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedVariant, setSelectedVariant] = useState<string>('')
  const [design, setDesign] = useState<any>(null)

  useEffect(() => {
    if (params.slug) {
      fetchProduct()
    }
  }, [params.slug])

  const fetchProduct = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/products/${params.slug}`)
      const data = await response.json()
      if (data.success) {
        setProduct(data.product)
        if (data.product.variants.length > 0) {
          setSelectedVariant(data.product.variants[0].id)
        }
      } else {
        toast.error('Ürün bulunamadı')
      }
    } catch (error) {
      console.error('Product fetch error:', error)
      toast.error('Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleDesignSave = (designData: any) => {
    setDesign(designData)
    toast.success('Tasarım kaydedildi!')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">⏳</div>
            <p className="text-xl">Yükleniyor...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Ürün Bulunamadı</h1>
            <button
              onClick={() => router.push('/products')}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition"
            >
              Ürünlere Dön
            </button>
          </div>
        </div>
      </div>
    )
  }

  const selectedVariantData = product.variants.find(v => v.id === selectedVariant)
  const currentImage = selectedVariantData?.image || product.images[0] || ''
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-grow">
        <CustomDesignEditor
          productImage={currentImage}
          productName={product.name}
          productColor={selectedVariantData?.color}
          onSave={handleDesignSave}
        />
      </div>
    </div>
  )
}
