import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Exo_2, Orbitron } from "next/font/google";
import { PrimaryNav } from "./PrimaryNav";
import { SiteFooter } from "./SiteFooter";
import logo from "./celestial_circuit_logo.png";
import "./globals.css";

const exo = Exo_2({
  subsets: ["latin"],
  variable: "--font-body"
});

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-brand"
});

export const metadata: Metadata = {
  title: "Celestial Circuit Hub",
  description: "Central navigation hub for Celestial Circuit tools.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${exo.variable} ${orbitron.variable}`}>
      <body>
        <header className="brand-header">
          <div className="brand-header-shell">
            <Link href="/" className="brand-link" aria-label="Open hub home">
              <Image src={logo} alt="Celestial Circuit logo" className="brand-logo" priority />
              <span className="brand-name">Celestial Circuit Hub</span>
            </Link>
            <PrimaryNav />
          </div>
        </header>
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
