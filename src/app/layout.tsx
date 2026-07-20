import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "望杏成林 · 亲子陪伴观察记录",
  description: "用结构养育的视角，记录每日亲子陪伴",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-full flex flex-col bg-gray-50 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
