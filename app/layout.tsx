import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Afflio — Turn product photos into trackable links",
  description:
    "Wrap your Shopee, Lazada, and TikTok Shop affiliate links in a clean, clickable card that previews properly everywhere — and track every click.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;600;700&family=Inter:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
