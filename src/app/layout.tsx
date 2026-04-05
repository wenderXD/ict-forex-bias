import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ICT Forex Bias | Daily AI Market Analysis",
  description:
    "Daily AI-generated forex bias using ICT (Inner Circle Trader) concepts. Smart Money analysis for EURUSD, GBPUSD, Gold, SPX500, and more.",
  keywords: "ICT, forex bias, smart money, order blocks, fair value gap, daily bias, trading",
  openGraph: {
    title: "ICT Forex Bias — Daily AI Market Analysis",
    description: "Smart Money / ICT daily bias for major forex pairs, Gold, Silver, Crude Oil and indices.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
