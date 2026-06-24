import { NavNameKey } from '@/config/navigation';

export type Language = 'english' | 'filipino' | 'bisaya';

export type Dictionary = {
    nav: Record<NavNameKey, string>;

    disclaimer: {
        text: string;
    };

    emptyStates: {
        noRecordsTitle: string;
        noRecordsDesc: string;
        scanNow: string;
    };

    scanner: {
        prescription: string;
        labResult: string;
        tapToScan: string;
        uploadGallery: string;
        retake: string;
        proceed: string;
        analyzing: string;
        permissionDenied: string;
    };

    results: {
        drugLabel: string;
        quantityLabel: string;
        saveToRecords: string;
        setReminders: string;
        saving: string;
    };
};