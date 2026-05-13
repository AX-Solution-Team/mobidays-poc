import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mobidays AI — Sales KB & Agent Demo",
  description:
    "AI-ready Sales Knowledge Base와 Sales Solution Agent 데모. 분산된 세일즈 데이터를 통합하고 AI Agent가 즉시 활용할 수 있도록 합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link
          rel="preconnect"
          href="https://cdn.jsdelivr.net"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body className="min-h-full bg-[color:var(--color-background)] text-[color:var(--color-foreground)] font-sans">
        {children}
      </body>
    </html>
  );
}
