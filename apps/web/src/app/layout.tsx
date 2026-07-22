import type { Metadata } from 'next';
import { Layout } from '@/components/layout';

export const metadata: Metadata = {
  title: 'SiparişAsistanı',
  description: 'AI Destekli Sipariş Yönetim Sistemi',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
