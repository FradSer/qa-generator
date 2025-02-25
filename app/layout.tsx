import { HeroUIProvider } from '@heroui/react';
import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import 'remixicon/fonts/remixicon.css';
import "./globals.css";

const outfit = Outfit({ 
  subsets: ["latin"],
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: "QA Generator Control Panel",
  description: "Control panel for managing QA generation tasks",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} font-outfit h-screen overflow-hidden`}>
        <HeroUIProvider>
          {children}
        </HeroUIProvider>
      </body>
    </html>
  );
} 