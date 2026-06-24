export type ScanType = 'prescription' | 'lab_result';

export type Language = 'bisaya' | 'filipino' | 'english';

// ─── AI Response Types ───

export interface MedicationParsed {
  drug_name: string;
  generic_name: string | null;
  dosage: string;
  frequency: string;
  timing: string[];
  duration: string | null;
  purpose: string;
  instructions: string;
  warnings: string | null;
}

export interface InteractionWarning {
  drugs: [string, string];
  severity: 'dangerous' | 'moderate' | 'mild';
  explanation: string;
  recommendation: string;
}

export interface PrescriptionResult {
  readable: boolean;
  summary: string;
  medications: MedicationParsed[];
  interaction_warnings: InteractionWarning[];
  disclaimer: string;
}

export interface LabValueParsed {
  test_name: string;
  value: string;
  unit: string;
  normal_range: string;
  status: 'normal' | 'high' | 'low';
  explanation: string;
}

export interface LabResult {
  readable: boolean;
  summary: string;
  test_type: string;
  values: LabValueParsed[];
  disclaimer: string;
}

export type ScanResult = PrescriptionResult | LabResult;

export interface DrugInteractionCheck {
  interactions: InteractionWarning[];
  safe: boolean;
  disclaimer: string;
}

// ─── Database Row Types ───

export interface User {
  id: string;
  device_id: string | null;
  phone: string | null;
  language_pref: Language;
  created_at: string;
}

export interface Scan {
  id: string;
  user_id: string;
  type: ScanType;
  image_url: string;
  ai_response: PrescriptionResult | LabResult;
  summary: string;
  language: Language;
  created_at: string;
}

export interface Medication {
  id: string;
  user_id: string;
  scan_id: string | null;
  drug_name: string;
  generic_name: string | null;
  dosage: string;
  frequency: string;
  timing: string[] | null;
  duration: string | null;
  purpose: string;
  instructions: string;
  warnings: string | null;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  medication_id: string;
  time: string;
  label: string;
  is_active: boolean;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}
