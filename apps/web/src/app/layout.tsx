'use client';

import { usePathname } from 'next/navigation';
import { Layout } from '@/components/layout';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const noLayout = pathname === '/' || pathname === '/login';

  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased">
        {noLayout ? children : <Layout>{children}</Layout>}
      </body>
    </html>
  );
}
