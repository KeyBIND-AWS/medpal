import type { Metadata, Viewport } from 'next';
import './globals.css';
import { LanguageProvider } from '@/contexts/LanguageContext';
import ServiceWorkerRegistration from '@/components/pwa/ServiceWorkerRegistration';
import { ShellLayout } from '@/components/navigation/ShellLayout';

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
        <html lang="en">
        <body className="bg-[#EFEFEF] text-slate-900 font-poppins h-screen overflow-hidden">
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
