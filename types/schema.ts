export interface MedicationRecord {
    drug_name: string;
    generic_name?: string;
    dosage: string;
    frequency: string;
    timing?: string[];
    duration?: string;
    purpose: string;
    instructions: string;
    warnings?: string;
    start_date?: string | null;
    end_date?: string | null;
}

export interface ScanResult {
    id: string;
    readable: boolean;
    summary: string;
    medications: MedicationRecord[];
    interaction_warnings?: string[];
    created_at: string;
}