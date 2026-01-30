import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { Toaster } from 'sonner'
import Analytics from '@/components/Analytics'

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "8BitWear - Kişiye Özel 3D Baskılı Giysiler",
  description: "AI destekli kişiye özel 3D baskılı tişört, sweatshirt ve hoodie tasarımları. Kendi tasarımınızı yükleyin, AI ile iyileştirin ve ürettirin.",
  keywords: ["3D baskı", "kişiye özel tişört", "custom tshirt", "sweatshirt", "AI tasarım"],
  openGraph: {
    title: "8BitWear - Kişiye Özel 3D Baskılı Giysiler",
    description: "AI destekli kişiye özel 3D baskılı giysiler",
    type: "website",
    locale: "tr_TR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body className={inter.className}>
        <Suspense fallback={null}>
          <Analytics />
        </Suspense>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
