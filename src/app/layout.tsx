import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { NavigationEventsTracker } from "@/components/NavigationEventsTracker";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Acumen Chat",
  description: "AI Chat Application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark clip-overflow" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <NavigationEventsTracker />
        {children}
        <Toaster theme="dark" position="top-right" />
      </body>
    </html>
  );
}
