import {
    CameraIcon,
    FileTextIcon,
    BellIcon,
    GearSixIcon
} from '@phosphor-icons/react';

export type NavNameKey = 'scan' | 'records' | 'reminders' | 'settings';

export const NAV_ITEMS: { nameKey: NavNameKey; href: string; icon: any }[] = [
    {
        nameKey: 'scan',
        href: '/scan',
        icon: CameraIcon,
    },
    {
        nameKey: 'records',
        href: '/records',
        icon: FileTextIcon,
    },
    {
        nameKey: 'reminders',
        href: '/reminders',
        icon: BellIcon,
    },
    {
        nameKey: 'settings',
        href: '/settings',
        icon: GearSixIcon,
    },
];