import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "../components/Providers";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Skoolly - La piattaforma digitale per la vita scolastica",
  description:
    "Skoolly: eventi scolastici, comunicazione, marketplace, foto di classe e molto altro per una vita scolastica smart e connessa.",
  keywords: [
    "Skoolly",
    "vita scolastica",
    "eventi scuola",
    "comunicazione scolastica",
    "marketplace scuola",
    "foto di classe",
    "piattaforma scolastica",
    "app scuola",
    "studenti",
  ],
  authors: [{ name: "Skoolly Team", url: "https://skoolly.it" }],
  robots: "index, follow",
  openGraph: {
    title: "Skoolly - La piattaforma digitale per la vita scolastica",
    description:
      "Skoolly: eventi, comunicazione, marketplace, foto di classe e molto altro per la tua scuola.",
    url: "https://skoolly.it",
    siteName: "Skoolly",
    images: [
      {
        url: "https://skoolly.it/images/SkoollyLogo.png",
        width: 800,
        height: 600,
        alt: "Logo Skoolly",
      },
    ],
    locale: "it_IT",
    type: "website",
  },
  metadataBase: new URL("https://skoolly.it"),
  
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
