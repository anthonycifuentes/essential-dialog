import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "essential-dialog",
  description:
    "A native <dialog> that morphs out of its own trigger and back into it. A shadcn registry component.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Seed the class the toggle flips, before paint, so the icon and the
            palette never disagree. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'document.documentElement.classList.toggle("dark", window.matchMedia("(prefers-color-scheme: dark)").matches)',
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
