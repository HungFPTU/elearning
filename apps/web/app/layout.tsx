import type { Metadata } from 'next';
import { Be_Vietnam_Pro } from 'next/font/google';
import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { AuthProvider } from '@/components/providers/auth-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import './globals.css';

const font = Be_Vietnam_Pro({
  variable: '--font-sans',
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: { default: 'E-Learning: Khóa học online', template: '%s | E-Learning' },
  description: 'Học lập trình, dữ liệu, thiết kế với các khóa học video chất lượng.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="vi" className={`${font.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-900">
        <QueryProvider>
          <AuthProvider>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
