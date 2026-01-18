import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "アカウント添削会 予約管理",
  description: "講師がアカウント添削会の日程枠を予約できるシステム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
