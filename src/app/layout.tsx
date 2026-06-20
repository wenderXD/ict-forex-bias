import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/ThemeContext";
import { ChatProvider } from "@/lib/ChatContext";
import { ClerkProvider } from "@clerk/nextjs";
import { clerkEnabled } from "@/lib/flags";

// Applies the stored theme before first paint to avoid a flash of the wrong theme.
const themeScript = `(function(){try{var t=localStorage.getItem('theme');document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark');}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export const metadata: Metadata = {
  title: "ICT Forex Bias | Daily Market Analysis",
  description:
    "Daily forex bias using ICT (Inner Circle Trader) concepts. Smart Money analysis for EURUSD, GBPUSD, Gold, SPX500, and more.",
  keywords: "ICT, forex bias, smart money, order blocks, fair value gap, daily bias, trading",
  openGraph: {
    title: "ICT Forex Bias — Daily Market Analysis",
    description: "Smart Money / ICT daily bias for major forex pairs, Gold, Silver, Crude Oil and indices.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const document = (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-background text-text-primary antialiased">
        <ThemeProvider>
          <ChatProvider>{children}</ChatProvider>
        </ThemeProvider>
      </body>
    </html>
  );

  // Only wrap in ClerkProvider when keys are configured, so the site runs
  // unchanged without auth set up.
  return clerkEnabled ? <ClerkProvider>{document}</ClerkProvider> : document;
}
