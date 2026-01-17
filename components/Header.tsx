import Link from 'next/link'
import { ShoppingCart, User, Search } from 'lucide-react'

export default function Header() {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">8B</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              8BitWear
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/products" className="text-gray-700 hover:text-purple-600 transition">
              Ürünler
            </Link>
            <Link href="/products?category=tshirt" className="text-gray-700 hover:text-purple-600 transition">
              Tişörtler
            </Link>
            <Link href="/products?category=sweatshirt" className="text-gray-700 hover:text-purple-600 transition">
              Sweatshirt
            </Link>
            <Link href="/products?category=hoodie" className="text-gray-700 hover:text-purple-600 transition">
              Hoodie
            </Link>
            <Link href="/how-it-works" className="text-gray-700 hover:text-purple-600 transition">
              Nasıl Çalışır?
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition">
              <Search className="w-5 h-5 text-gray-700" />
            </button>
            <Link href="/account" className="p-2 hover:bg-gray-100 rounded-lg transition">
              <User className="w-5 h-5 text-gray-700" />
            </Link>
            <Link href="/cart" className="p-2 hover:bg-gray-100 rounded-lg transition relative">
              <ShoppingCart className="w-5 h-5 text-gray-700" />
              <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                0
              </span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
