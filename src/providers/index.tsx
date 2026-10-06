// app-wide client provider boundary (theme, next-intl, toaster)
import React from 'react';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}