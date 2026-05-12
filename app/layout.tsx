/** Minimal root shell for App Router segments (wiki HTML is served as static files from `public/`). */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
