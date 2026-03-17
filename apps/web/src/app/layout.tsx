import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PopLit — Weekly Short Story Contests",
  description: "Where reader engagement is the vote. Writers pay $1 to enter, readers read for free, and the most-read story wins.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
