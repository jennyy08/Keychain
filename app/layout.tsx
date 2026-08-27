import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Keychain — Harmonic mixing, made simple",
  description:
    "Compare the tempo and musical key of two tracks directly in your browser.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
