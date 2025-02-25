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
    <html lang="en" className="h-full">
      <body className={`${outfit.variable} font-outfit h-full overflow-hidden text-slate-700`}>
        <HeroUIProvider>
          {children}
        </HeroUIProvider>
      </body>
    </html>
  );
} 