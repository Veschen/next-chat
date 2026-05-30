import type { Metadata } from "next";
import "./globals.css";


export const metadata: Metadata = {
  title: "Next Chat",
  description: "Next Chat is a chat application that uses Next.js 14 and shadcn-ui tailwindcss.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className="antialiased"
      >
        {children}
      </body>
    </html>
  );
}
