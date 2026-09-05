import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "תיבת הדילמות", template: "%s · תיבת הדילמות" },
  description: "שאלות ודילמות מקצועיות למתנדבים, ומענה מעונים מוסמכים",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, title: "תיבת הדילמות", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#D9601A",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700&family=Frank+Ruhl+Libre:wght@500;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
