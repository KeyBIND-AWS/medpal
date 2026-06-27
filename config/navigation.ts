import {
    CameraIcon,
    FileTextIcon,
    ClockIcon,
    GearSixIcon,
    ChatCircleDotsIcon
} from '@phosphor-icons/react';

// 'notifications' has no bottom-nav/sidebar item — it's reached via the TopBar
// bell — but keeps a label here for the bell's accessible name + dictionaries.
export type NavNameKey = 'scan' | 'records' | 'reminders' | 'notifications' | 'settings' | 'chat';

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
        // Clock = scheduled doses you set; the TopBar bell = incoming alerts.
        nameKey: 'reminders',
        href: '/reminders',
        icon: ClockIcon,
    },
    {
        nameKey: 'chat',
        href: '/chat',
        icon: ChatCircleDotsIcon,
    },
    {
        nameKey: 'settings',
        href: '/settings',
        icon: GearSixIcon,
    },
];
