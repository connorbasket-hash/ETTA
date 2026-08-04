import type { Metadata } from "next";
import "./globals.css";
import { DataProvider } from "@/lib/data-context";

export const metadata: Metadata = {
  title: "Timekeeper",
  description: "Build time entries from Outlook data",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-slate-100">
        <DataProvider>
          <main className="min-h-screen">{children}</main>
        </DataProvider>
      </body>
    </html>
  );
}
