export type ScanType = 'prescription' | 'lab_result';

export type Language = 'bisaya' | 'filipino' | 'english';

// Matches the top-level shape from the Master Plan's Bedrock response schema.
// David/Brian own the full medication/lab-value shape — extend here once
// POST /api/scan is wired up for real.
export interface ScanResponse {
  id: string;
  readable: boolean;
  summary: string;
}
