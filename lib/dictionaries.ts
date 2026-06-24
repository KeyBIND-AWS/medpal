import { Dictionary, Language } from '@/types/i18n';

export const dictionaries: Record<Language, Dictionary> = {
    english: {
        nav: {
            scan: 'Scan',
            records: 'Records',
            reminders: 'Reminders',
            settings: 'Settings'
        },
        disclaimer: {
            text: 'Disclaimer: MedPal explains your prescription in plain language. It does not replace your doctor — always follow their instructions.',
        },
        emptyStates: {
            noRecordsTitle: 'No records yet.',
            noRecordsDesc: 'Scan your first prescription to get started.',
            scanNow: 'Scan Now',
        },
        scanner: {
            prescription: 'Prescription',
            labResult: 'Lab Result',
            tapToScan: 'Tap to scan document',
            uploadGallery: 'Upload from gallery',
            retake: 'Retake photo',
            proceed: 'Analyze Document',
            analyzing: 'Reading your document... Please wait.',
            permissionDenied: 'Camera access denied. Please use the gallery upload.',
        },
        results: {
            drugLabel: 'Drug',
            quantityLabel: 'Quantity',
            saveToRecords: 'Save to Records',
            setReminders: 'Set Reminders',
            saving: 'Saving...',
        },
    },
    filipino: {
        nav: {
            scan: 'Scan',
            records: 'Tala',
            reminders: 'Paalala',
            settings: 'Settings'
        },
        disclaimer: {
            text: 'Paskabi: Ipinapaliwanag ng MedPal ang iyong reseta sa simpleng wika. Hindi ito pamalit sa iyong doktor — palaging sundin ang kanilang mga tagubilin.',
        },
        emptyStates: {
            noRecordsTitle: 'Wala pang nakatala.',
            noRecordsDesc: 'I-scan ang iyong unang reseta para makapagsimula.',
            scanNow: 'I-scan Ngayon',
        },
        scanner: {
            prescription: 'Reseta',
            labResult: 'Resulta sa Lab',
            tapToScan: 'I-tap para i-scan ang dokumento',
            uploadGallery: 'Kumuha sa gallery',
            retake: 'Kuhang muli',
            proceed: 'Suriin ang Dokumento',
            analyzing: 'Binabasa ang iyong reseta... Mangyaring maghintay.',
            permissionDenied: 'Walang access sa camera. Mangyaring mag-upload na lang.',
        },
        results: {
            drugLabel: 'Gamot',
            quantityLabel: 'Dami',
            saveToRecords: 'I-save sa Rekord',
            setReminders: 'Magtakda ng Paalala',
            saving: 'Sini-save...',
        },
    },
    bisaya: {
        nav: {
            scan: 'Scan',
            records: 'Rekord',
            reminders: 'Pahinumdom',
            settings: 'Settings'
        },
        disclaimer: {
            text: 'Pahibalo: Gipasabot sa MedPal ang imong reseta sa yano nga pinulongan. Dili kini hulip sa imong doktor — kanunay sunda ang ilang mga tugon.',
        },
        emptyStates: {
            noRecordsTitle: 'Wala pay narekord.',
            noRecordsDesc: 'I-scan ang imong unang reseta aron makasugod.',
            scanNow: 'I-scan Karon',
        },
        scanner: {
            prescription: 'Reseta',
            labResult: 'Resulta sa Lab',
            tapToScan: 'Pislita aron i-scan ang dokumento',
            uploadGallery: 'Kuhaa sa gallery',
            retake: 'Usaba pagkuha',
            proceed: 'Basaha ang Dokumento',
            analyzing: 'Ginabasa ang imong reseta... Kadali lang.',
            permissionDenied: 'Gibalibaran ang camera. Pag-upload na lang og hulagway.',
        },
        results: {
            drugLabel: 'Tambal',
            quantityLabel: 'Kadaghanon',
            saveToRecords: 'I-save sa Records',
            setReminders: 'Pagbutang og Reminders',
            saving: 'Gina-save...',
        },
    },
};