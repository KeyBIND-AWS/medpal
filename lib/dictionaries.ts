import { Dictionary, Language } from '@/types/i18n';

export const dictionaries: Record<Language, Dictionary> = {
    english: {
        nav: {
            scan: 'Scan',
            records: 'Records',
            reminders: 'Reminders',
            notifications: 'Notifications',
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
            listen: 'Listen',
            stop: 'Stop',
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
            emptyDesc: 'Your scheduled medications will appear here.'
        },
        notificationsPage: {
            title: 'Notifications',
            enablePush: 'Push notifications',
            pushEnabled: 'On',
            pushDenied: 'Blocked in browser settings',
            emptyTitle: 'No notifications yet',
            emptyDesc: 'Enable push above so your medication reminders show up here.',
            markAllRead: 'Mark all read'
        },
        chatPage: {
            title: 'Chat',
            greeting: 'Hello! Just ask if you want to know anything about your medicine. 😀',
            placeholder: 'Ask a question...',
            emptyDisclaimer: 'Medical AI can make mistakes. Always consult your doctor.',
            error: 'Sorry, something went wrong. Please try again.'
        },
    },
    filipino: {
        nav: {
            scan: 'Scan',
            records: 'Tala',
            reminders: 'Paalala',
            notifications: 'Mga Abiso',
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
            listen: 'Pakinggan',
            stop: 'Itigil',
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
            emptyDesc: 'Dito makikita ang mga nakatakdang inumin na gamot.'
        },
        notificationsPage: {
            title: 'Mga Abiso',
            enablePush: 'Mga push notification',
            pushEnabled: 'Naka-on',
            pushDenied: 'Naka-block sa browser settings',
            emptyTitle: 'Wala pang abiso',
            emptyDesc: 'I-on ang push sa itaas para lumabas dito ang mga paalala sa gamot.',
            markAllRead: 'Markahang nabasa lahat'
        },
        chatPage: {
            title: 'Chat',
            greeting: 'Kumusta! Magtanong lang kung ano ang gusto mong malaman tungkol sa iyong gamot. 😀',
            placeholder: 'Mag-type ng tanong...',
            emptyDisclaimer: 'Maaaring magkamali ang AI. Kumonsulta palagi sa doktor.',
            error: 'Paumanhin, may nangyaring mali. Pakisubukang muli.'
        },
    },
    bisaya: {
        nav: {
            scan: 'Scan',
            records: 'Rekord',
            reminders: 'Pahinumdom',
            notifications: 'Mga Pahibalo',
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
            listen: 'Paminawa',
            stop: 'Hunong',
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
            emptyDesc: 'Dinhi makita ang mga gitakdang imnon nga tambal.'
        },
        notificationsPage: {
            title: 'Mga Pahibalo',
            enablePush: 'Mga push notification',
            pushEnabled: 'Naka-on',
            pushDenied: 'Gi-block sa browser settings',
            emptyTitle: 'Wala pay pahibalo',
            emptyDesc: 'I-on ang push sa ibabaw aron magpakita dinhi ang mga pahinumdom sa tambal.',
            markAllRead: 'Markahi tanan nga nabasa'
        },
        chatPage: {
            title: 'Chat',
            greeting: 'Kumusta! Pangutana lang kung unsa imong gusto mahibal-an bahin sa imong tambal. 😀',
            placeholder: 'Pag-type og pangutana...',
            emptyDisclaimer: 'Basin masayop ang AI. Pagkonsulta kanunay sa doktor.',
            error: 'Pasensya, naay sayop nga nahitabo. Palihug sulayi pag-usab.'
        },
    },
};