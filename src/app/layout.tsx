import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TabascoSunrise Etsy App",
  description: "Etsy to Facebook catalog sync",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
