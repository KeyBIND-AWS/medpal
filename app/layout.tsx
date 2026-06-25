import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { LanguageProvider } from '@/contexts/LanguageContext';
import ServiceWorkerRegistration from '@/components/pwa/ServiceWorkerRegistration';
import { ShellLayout } from '@/components/navigation/ShellLayout';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-sans',
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'MedPal',
    description: 'AI-powered prescription and lab result reader in Bisaya & Filipino',
    manifest: '/manifest.webmanifest', // Next.js automatically maps this to app/manifest.ts
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'MedPal',
    },
};

export const viewport: Viewport = {
    themeColor: '#2B4BFF',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={inter.variable}>
        <body className="bg-canvas text-ink font-sans h-screen overflow-hidden">
        {/* PWA Service Worker for caching and push notifications */}
        <ServiceWorkerRegistration />

        {/* Global State Provider for instant i18n switching */}
        <LanguageProvider>
            {/* Client Layout handling the desktop sidebar and mobile bottom nav */}
            <ShellLayout>
                {children}
            </ShellLayout>
        </LanguageProvider>
        </body>
        </html>
    );
}
