const TITLES: Record<string, string> = {
    '/scan':      'Scan',
    '/records':   'My Records',
    '/reminders': 'Reminders',
    '/chat':      'Ask MedPal',
    '/settings':  'Settings',
};

export function getPageTitle(pathname: string): string {
    if (TITLES[pathname]) return TITLES[pathname];
    if (pathname.startsWith('/records/')) return 'Record';
    if (pathname.startsWith('/results/')) return 'Result';
    return 'MedPal';
}