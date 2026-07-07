import "./globals.css";

export const metadata = {
  title: "GrowEasy CSV Importer — AI-Powered CRM Lead Import",
  description:
    "Upload any CSV file and let AI intelligently map your data to GrowEasy CRM format. Supports Facebook Leads, Google Ads, Excel exports, and more.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
