import type { Metadata } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";

const fontePixel = Press_Start_2P({
  variable: "--fonte-pixel",
  weight: "400",
  subsets: ["latin"],
});

const fonteTerminal = VT323({
  variable: "--fonte-terminal",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Workshop de Prompts",
  description: "Jogo de prompts 8-bit para o workshop de engenharia de prompt.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`dark ${fontePixel.variable} ${fonteTerminal.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
