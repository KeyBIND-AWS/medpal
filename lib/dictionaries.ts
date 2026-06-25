import { Dictionary, Language } from '@/types/i18n';

export const dictionaries: Record<Language, Dictionary> = {
    english: {
        nav: {
            scan: 'Scan',
            records: 'Records',
            reminders: 'Reminders',
            chat: 'Chat',
            settings: 'Settings',
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
        recordsList: {
            title: 'My Records',
            all: 'All',
            prescriptions: 'Prescriptions',
            labResults: 'Lab Results'
        },
        remindersPage: {
            title: 'Reminders',
            morning: 'Morning',
            afternoon: 'Afternoon',
            evening: 'Evening',
            emptyTitle: 'No Reminders Yet',
            emptyDesc: 'Your scheduled medications will appear here.',
            addReminderButton: 'Add Reminder',
            modalTitle: 'Add New Reminder',
            medicineNameLabel: 'Medicine Name',
            medicineNamePlaceholder: 'e.g. Paracetamol',
            dosageLabel: 'Dosage',
            dosagePlaceholder: 'e.g. 500 or 1',
            unitLabel: 'Unit',
            instructionsLabel: 'Instructions',
            instructionsPlaceholder: 'e.g. Take with food',
            timesLabel: 'Scheduled Times',
            addTimeButton: 'Add Time',
            saveButton: 'Save Reminder',
            cancelButton: 'Cancel'
        },
        chatPage: {
            title: 'Chat',
            greeting: 'Hello! Just ask if you want to know anything about your medicine. 😀',
            placeholder: 'Ask a question...',
            emptyDisclaimer: 'Medical AI can make mistakes. Always consult your doctor.'
        },
    },
    filipino: {
        nav: {
            scan: 'Scan',
            records: 'Tala',
            reminders: 'Paalala',
            chat: 'Chat',
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
        recordsList: {
            title: 'Mga Rekord',
            all: 'Lahat',
            prescriptions: 'Reseta',
            labResults: 'Resulta sa Lab'
        },
        remindersPage: {
            title: 'Mga Paalala',
            morning: 'Umaga',
            afternoon: 'Hapon',
            evening: 'Gabi',
            emptyTitle: 'Wala pang Paalala',
            emptyDesc: 'Dito makikita ang mga nakatakdang inumin na gamot.',
            addReminderButton: 'Magdagdag ng Paalala',
            modalTitle: 'Magdagdag ng Bagong Paalala',
            medicineNameLabel: 'Pangalan ng Gamot',
            medicineNamePlaceholder: 'hal. Paracetamol',
            dosageLabel: 'Dosage',
            dosagePlaceholder: 'hal. 500 o 1',
            unitLabel: 'Yunit',
            instructionsLabel: 'Mga Tagubilin',
            instructionsPlaceholder: 'hal. Inumin pagkatapos kumain',
            timesLabel: 'Nakatakdang Oras',
            addTimeButton: 'Magdagdag ng Oras',
            saveButton: 'I-save ang Paalala',
            cancelButton: 'Kanselahin'
        },
        chatPage: {
            title: 'Chat',
            greeting: 'Kumusta! Magtanong lang kung ano ang gusto mong malaman tungkol sa iyong gamot. 😀',
            placeholder: 'Mag-type ng tanong...',
            emptyDisclaimer: 'Maaaring magkamali ang AI. Kumonsulta palagi sa doktor.'
        },
    },
    bisaya: {
        nav: {
            scan: 'Scan',
            records: 'Rekord',
            reminders: 'Pahinumdom',
            chat: 'Chat',
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
        recordsList: {
            title: 'Akong Records',
            all: 'Tanan',
            prescriptions: 'Reseta',
            labResults: 'Resulta sa Lab'
        },
        remindersPage: {
            title: 'Mga Pahinumdom',
            morning: 'Buntag',
            afternoon: 'Hapon',
            evening: 'Gabii',
            emptyTitle: 'Wala pay Pahinumdom',
            emptyDesc: 'Dinhi makita ang mga gitakdang imnon nga tambal.',
            addReminderButton: 'Pagdugang og Pahinumdom',
            modalTitle: 'Pagdugang og Bag-ong Pahinumdom',
            medicineNameLabel: 'Ngalan sa Tambal',
            medicineNamePlaceholder: 'pananglitan: Paracetamol',
            dosageLabel: 'Dosage',
            dosagePlaceholder: 'pananglitan: 500 o 1',
            unitLabel: 'Yunit',
            instructionsLabel: 'Mga Tugon',
            instructionsPlaceholder: 'pananglitan: Imnon human mangaon',
            timesLabel: 'Gitakdang Oras',
            addTimeButton: 'Pagdugang og Oras',
            saveButton: 'I-save ang Pahinumdom',
            cancelButton: 'Kanselahon'
        },
        chatPage: {
            title: 'Chat',
            greeting: 'Kumusta! Pangutana lang kung unsa imong gusto mahibal-an bahin sa imong tambal. 😀',
            placeholder: 'Pag-type og pangutana...',
            emptyDisclaimer: 'Basin masayop ang AI. Pagkonsulta kanunay sa doktor.'
        },
    },
};