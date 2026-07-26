import type { Metadata } from "next";
import { Fraunces, Karla, Caveat } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
});

const karla = Karla({
  variable: "--font-body",
  subsets: ["latin"],
});

const caveat = Caveat({
  variable: "--font-hand",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  title: {
    default: "Porchlight — recruitment for the stage nobody sees",
    template: "%s · Porchlight",
  },
  description:
    "Pre-inquiry capture, nurture, and attribution for foster care agencies. Keep the porch light on for the families who said “not yet.”",
  openGraph: {
    title: "Porchlight — recruitment for the stage nobody sees",
    description:
      "Every child's story starts with a light left on. Capture interest years before the application, and trace every licensed home back to where it began.",
    siteName: "Porchlight",
    locale: "en_US",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${karla.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
