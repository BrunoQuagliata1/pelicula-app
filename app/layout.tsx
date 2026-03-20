import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "¿Qué película ver? 🎬",
  description: "Descubre tu próxima película favorita con recomendaciones inteligentes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="bg-gray-950 text-gray-100 h-dvh overflow-hidden">
        {children}
      </body>
    </html>
  );
}
