import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/cart-context";
import { WishlistProvider } from "@/context/wishlist-context";
import { WhatsAppFloat } from "@/components/whatsapp-float";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Prêt à Porter | Boutique de Ropa Femenina en Santo Domingo",
    template: "%s | Prêt à Porter",
  },
  description:
    "Prêt à Porter — boutique de ropa femenina en Plaza Castilla, Santo Domingo. Piezas elegantes y seleccionadas. +20K clientas felices. Envíos en toda República Dominicana y Estados Unidos.",
  keywords: [
    "ropa femenina Santo Domingo",
    "boutique Santo Domingo",
    "moda femenina RD",
    "ropa elegante mujer",
    "tienda ropa República Dominicana",
    "Prêt à Porter",
    "pretaporter rd",
    "Plaza Castilla tienda ropa",
  ],
  openGraph: {
    title: "Prêt à Porter | Boutique de Ropa Femenina en Santo Domingo",
    description: "Boutique de ropa femenina en Santo Domingo. Piezas elegantes, envíos a toda RD y EE.UU. +20K clientas felices.",
    type: "website",
    locale: "es_DO",
    siteName: "Prêt à Porter",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      data-scroll-behavior="smooth"
      className={`${cormorant.variable} ${inter.variable} antialiased`}
    >
      <body
        className="min-h-full flex flex-col bg-brand-ivory text-brand-deep"
        suppressHydrationWarning
      >
        <CartProvider>
          <WishlistProvider>
            {children}
            <WhatsAppFloat />
          </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}
