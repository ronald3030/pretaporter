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
  metadataBase: new URL("https://pret-a-porter-eta.vercel.app"),
  title: {
    default: "Prêt à Porter | Boutique de Ropa Femenina en Santo Domingo",
    template: "%s | Prêt à Porter",
  },
  description:
    "Prêt à Porter — boutique de ropa femenina en Plaza Castilla, Santo Domingo. Vestidos, blusas y conjuntos elegantes. +20K clientas felices. Envíos en toda República Dominicana y EE.UU.",
  keywords: [
    "ropa femenina Santo Domingo",
    "boutique Santo Domingo",
    "moda femenina RD",
    "ropa elegante mujer",
    "tienda ropa República Dominicana",
    "Prêt à Porter",
    "pretaporter rd",
    "Plaza Castilla tienda ropa",
    "vestidos elegantes Santo Domingo",
    "moda mujer República Dominicana",
    "boutique ropa mujer RD",
    "ropa de mujer Santo Domingo",
  ],
  openGraph: {
    title: "Prêt à Porter | Boutique de Ropa Femenina en Santo Domingo",
    description:
      "Boutique de ropa femenina en Santo Domingo. Vestidos, blusas y conjuntos elegantes. Envíos a toda RD y EE.UU. +20K clientas felices.",
    type: "website",
    url: "https://pret-a-porter-eta.vercel.app",
    locale: "es_DO",
    siteName: "Prêt à Porter",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Prêt à Porter — Boutique de ropa femenina en Santo Domingo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Prêt à Porter | Boutique de Ropa Femenina en Santo Domingo",
    description:
      "Boutique de ropa femenina en Santo Domingo. Vestidos, blusas y conjuntos elegantes. Envíos a toda RD y EE.UU.",
    images: ["/og-image.jpg"],
  },
  alternates: {
    canonical: "https://pret-a-porter-eta.vercel.app",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

// JSON-LD LocalBusiness schema
const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "ClothingStore",
  name: "Prêt à Porter",
  description:
    "Boutique de ropa femenina elegante en Santo Domingo, República Dominicana. Vestidos, blusas, conjuntos y más.",
  url: "https://pret-a-porter-eta.vercel.app",
  telephone: "+1-809-123-4567",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Abraham Lincoln 617, Local 25A, Plaza Castilla",
    addressLocality: "Santo Domingo",
    addressRegion: "Distrito Nacional",
    addressCountry: "DO",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 18.4679497,
    longitude: -69.9311998,
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "10:00",
      closes: "19:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Saturday"],
      opens: "10:00",
      closes: "17:00",
    },
  ],
  priceRange: "$$",
  image: "https://pret-a-porter-eta.vercel.app/og-image.jpg",
  sameAs: [
    "https://instagram.com/pretaporter_rd",
  ],
  hasMap: "https://www.google.com/maps/place/Tienda+Pret+a+Porter/@18.4680564,-69.9313722,17z/data=!4m8!3m7!1s0x8eaf8947d9374991:0xe0f198545cfda88!8m2!3d18.4680522!4d-69.9313699!9m1!1b1!16s%2Fg%2F11ss6jhy7q?entry=ttu&g_ep=EgoyMDI2MDMyNC4wIKXMDSoASAFQAw%3D%3D",
  currenciesAccepted: "DOP, USD",
  paymentAccepted: "Cash, Credit Card, PayPal, Google Pay, Apple Pay",
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
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
        />
      </head>
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
