import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/shell/providers";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: { default: "LeadFlow AI", template: "%s · LeadFlow AI" },
  description: "Поиск клиентов, CRM, коммерческие предложения и автоматизация B2B-продаж",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1120" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
