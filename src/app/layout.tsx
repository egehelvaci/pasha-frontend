import type { Metadata, Viewport } from "next";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { CartProvider } from "./context/CartContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Paşa Home - Bayi Sipariş Sistemi",
  description: "Paşa Home bayileri için sipariş yönetim platformu",
  keywords: "paşa home, bayi, sipariş, yönetim, platform",
  authors: [{ name: "Paşa Home" }],
  creator: "Paşa Home",
  publisher: "Paşa Home",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Paşa Home",
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' }
  ],
  colorScheme: 'light',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="scroll-smooth">
      <head>
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_API_BASE_URL || "https://pashahomeapps.up.railway.app"} />
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_API_BASE_URL || "https://pashahomeapps.up.railway.app"} />
        
        {/* Additional meta tags for better browser compatibility */}
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="format-detection" content="telephone=no, date=no, email=no, address=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Paşa Home" />
        <meta name="application-name" content="Paşa Home" />
        <meta name="msapplication-TileColor" content="#ffffff" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Prevent zoom on input focus for iOS */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover" />
      </head>
      <body className="antialiased font-smoothing text-rendering-optimize touch-manipulation">
        <AuthProvider>
          <CartProvider>
            <NotificationProvider>
              {children}
            </NotificationProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
