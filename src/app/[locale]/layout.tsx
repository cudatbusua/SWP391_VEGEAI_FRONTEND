// ROUTING ONLY (thin) — <html> + <Providers> + metadata + static params
import React from 'react';

export default function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  return (
    <html lang={params?.locale || 'vi'}>
      <body>
        {children}
      </body>
    </html>
  );
}