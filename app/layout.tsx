import "./globals.css";

export const metadata = {
  title: "Live Voting — Fanca",
  description: "Live rank & vote count dari Fanca API"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
