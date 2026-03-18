import type { Metadata } from "next";
import "./globals.css";
import { PopEffectProvider } from "@/components/ui/pop-effect-provider";

export const metadata: Metadata = {
  title: "PopLit — Weekly Short Story Contests",
  description: "Where reader engagement is the vote. Writers pay $3 to enter, readers read for free, and the most-read story wins.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <PopEffectProvider>{children}</PopEffectProvider>
      </body>
    </html>
  );
}
