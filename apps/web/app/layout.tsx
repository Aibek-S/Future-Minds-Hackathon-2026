import type { Metadata } from 'next';
import './styles.css';

export const metadata: Metadata = {
  title: 'AI Tutor MVP',
  description: 'Functional demo client for the AI Tutor API',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
