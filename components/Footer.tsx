import Link from 'next/link'
import { Facebook, Instagram, Twitter, Mail } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Hakkımızda */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">8BitWear</h3>
            <p className="text-sm text-gray-400 mb-4">
              AI destekli kişiye özel 3D baskılı giysiler. Hayalinizdeki tasarımı gerçeğe dönüştürün.
            </p>
            <div className="flex space-x-3">
              <a href="#" className="hover:text-purple-400 transition">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-purple-400 transition">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-purple-400 transition">
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Ürünler */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">Ürünler</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/products?category=tshirt" className="hover:text-purple-400 transition">
                  Tişörtler
                </Link>
              </li>
              <li>
                <Link href="/products?category=sweatshirt" className="hover:text-purple-400 transition">
                  Sweatshirt
                </Link>
              </li>
              <li>
                <Link href="/products?category=hoodie" className="hover:text-purple-400 transition">
                  Hoodie
                </Link>
              </li>
            </ul>
          </div>

          {/* Yardım */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">Yardım</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/how-it-works" className="hover:text-purple-400 transition">
                  Nasıl Çalışır?
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-purple-400 transition">
                  Sık Sorulan Sorular
                </Link>
              </li>
              <li>
                <Link href="/shipping" className="hover:text-purple-400 transition">
                  Kargo & İade
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-purple-400 transition">
                  İletişim
                </Link>
              </li>
            </ul>
          </div>

          {/* İletişim */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">İletişim</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <a href="mailto:info@8bitwear.com" className="hover:text-purple-400 transition">
                  info@8bitwear.com
                </a>
              </li>
              <li>
                <p className="text-gray-400">Destek: 7/24</p>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-500">
          <p>&copy; 2024 8BitWear. Tüm hakları saklıdır.</p>
          <div className="flex justify-center space-x-4 mt-2">
            <Link href="/privacy" className="hover:text-purple-400 transition">
              Gizlilik Politikası
            </Link>
            <Link href="/terms" className="hover:text-purple-400 transition">
              Kullanım Koşulları
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
