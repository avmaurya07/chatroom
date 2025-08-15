import { Inter } from "next/font/google";
import { Providers } from "./providers/ThemeProviders";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Anonymous Chat Rooms",
  description: "Chat anonymously in multiple rooms",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css"
          rel="stylesheet"
        />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
