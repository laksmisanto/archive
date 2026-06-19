import "./globals.css";
import ThemeProvider from "@/components/theme/theme-provider";
import ThemeScript from "@/components/theme/theme-script";

export const metadata = {
  title: "NAMS — News Archive Metadata System",
  description:
    "Internal archive metadata management system for news channel footage",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeScript />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
