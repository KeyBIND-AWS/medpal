import type { Metadata, Viewport } from 'next';
import './globals.css';
import AppShell from '@/components/AppShell';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';

export const metadata: Metadata = {
  title: 'HatidDok',
  description: 'AI-powered prescription and lab result reader in Bisaya',
  manifest: '/manifest.webmanifest',
  // iOS Safari ignores manifest.json for install behavior — these are required
  // separately for "Add to Home Screen" to look right on iPhone (we're testing
  // on iOS Safari per the QA plan, so this isn't optional).
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'HatidDok',
  },
};

export const viewport: Viewport = {
  themeColor: '#1A3AF5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <ServiceWorkerRegistration />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
