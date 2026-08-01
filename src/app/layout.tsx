import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { env } from "@/lib/env";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const description =
  "Independent marine expertise for vessel operations, cargo assurance, compliance, and maritime professional development.";

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: {
    default: "DMD Marine Consultation & Services",
    template: "%s | DMD Marine Consultation & Services",
  },
  description,
  openGraph: {
    type: "website",
    siteName: "DMD Marine Consultation & Services",
    title: "DMD Marine Consultation & Services",
    description,
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "DMD Marine Consultation & Services",
    description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
