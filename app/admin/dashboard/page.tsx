'use client'

import { useState, useEffect } from 'react'
import { formatPrice } from '@/lib/utils'
import { Package, DollarSign, Users, TrendingUp, ShoppingCart } from 'lucide-react'

interface DashboardStats {
  totalOrders: number
  totalRevenue: number
  pendingOrders: number
  completedOrders: number
  totalCustomers: number
  averageOrderValue: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30')

  useEffect(() => {
    fetchDashboardData()
  }, [dateRange])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - parseInt(dateRange))
      
      const response = await fetch(
        `/api/admin/dashboard?startDate=${startDate.toISOString()}&endDate=${new Date().toISOString()}`
      )
      const data = await response.json()
      
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="inline-block w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
            >
              <option value="7">Son 7 Gün</option>
              <option value="30">Son 30 Gün</option>
              <option value="90">Son 90 Gün</option>
              <option value="365">Son 1 Yıl</option>
            </select>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Toplam Sipariş */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-sm text-gray-500">Toplam Sipariş</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.totalOrders}</div>
              <div className="mt-2 flex items-center text-sm">
                <span className="text-gray-600">Bekleyen: {stats.pendingOrders}</span>
              </div>
            </div>

            {/* Toplam Gelir */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <span className="text-sm text-gray-500">Toplam Gelir</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {formatPrice(stats.totalRevenue)}
              </div>
              <div className="mt-2 flex items-center text-sm text-green-600">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span>Ortalama: {formatPrice(stats.averageOrderValue)}</span>
              </div>
            </div>

            {/* Tamamlanan Siparişler */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6 text-purple-600" />
                </div>
                <span className="text-sm text-gray-500">Tamamlanan</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.completedOrders}</div>
              <div className="mt-2 flex items-center text-sm">
                <span className="text-gray-600">
                  Oran: {stats.totalOrders > 0 ? Math.round((stats.completedOrders / stats.totalOrders) * 100) : 0}%
                </span>
              </div>
            </div>

            {/* Toplam Müşteri */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-orange-600" />
                </div>
                <span className="text-sm text-gray-500">Müşteriler</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.totalCustomers}</div>
              <div className="mt-2 flex items-center text-sm text-gray-600">
                <span>Yeni müşteriler</span>
              </div>
            </div>
          </div>
        )}

        {/* Hızlı Erişim */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <a
            href="/admin/orders"
            className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition text-center"
          >
            <Package className="w-8 h-8 text-purple-600 mx-auto mb-3" />
            <h3 className="font-bold text-lg">Siparişler</h3>
            <p className="text-sm text-gray-600">Tüm siparişleri yönet</p>
          </a>

          <a
            href="/admin/products"
            className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition text-center"
          >
            <ShoppingCart className="w-8 h-8 text-purple-600 mx-auto mb-3" />
            <h3 className="font-bold text-lg">Ürünler</h3>
            <p className="text-sm text-gray-600">Ürün katalogunu düzenle</p>
          </a>

          <a
            href="/admin/analytics"
            className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition text-center"
          >
            <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-3" />
            <h3 className="font-bold text-lg">Analytics</h3>
            <p className="text-sm text-gray-600">Detaylı raporlar</p>
          </a>

          <a
            href="/admin/customers"
            className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition text-center"
          >
            <Users className="w-8 h-8 text-purple-600 mx-auto mb-3" />
            <h3 className="font-bold text-lg">Müşteriler</h3>
            <p className="text-sm text-gray-600">Müşteri listesi</p>
          </a>
        </div>

        {/* Sistem Durumu */}
        <div className="mt-8 bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Sistem Durumu</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <div className="font-semibold">AI Sistem</div>
                <div className="text-sm text-gray-600">Çalışıyor</div>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <div className="font-semibold">Ödeme Sistemi</div>
                <div className="text-sm text-gray-600">Aktif</div>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <div className="font-semibold">Email Sistemi</div>
                <div className="text-sm text-gray-600">Çalışıyor</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
