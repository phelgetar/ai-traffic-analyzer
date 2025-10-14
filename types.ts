export interface Incident {
  uuid: string;
  source_system: string;
  source_event_id: string | null;
  state: string | null;
  county: string | null;
  route: string | null;
  direction: string | null;
  milepost: number | null;
  latitude: number | null;
  longitude: number | null;
  reported_time: string | null;
  updated_time: string;
  cleared_time: string | null;
  is_active: boolean;
  category: 'INCIDENT' | 'ROADWORK';
  event_type: string | null;
  lanes_affected: string | null;
  closure_status: 'OPEN' | 'CLOSED' | 'PARTIAL' | 'UNKNOWN';
  severity_flag: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  severity_score: number | null;
  units_involved: number | null;
  description: string;
}

// This type represents the data structure that will be sent to the backend importer.
// It has been modified to exactly match the expectations of the CORRECTED `importer.php` script and the database schema.
export interface IncidentPayload {
  uuid: string;
  source_system: string;
  source_event_id: string | null;
  state: string | null;
  county: string | null;
  route: string | null;
  direction: string | null;      // Schema: varchar -> 's'
  milepost: number | null;     // Schema: decimal -> 'd'
  latitude: number | null;     // Schema: decimal -> 'd'
  longitude: number | null;    // Schema: decimal -> 'd'
  reported_time: string | null;  // Schema: datetime -> 's'
  updated_time: string;          // Schema: datetime -> 's'
  cleared_time: string | null;   // Schema: datetime -> 's'
  is_active: 0 | 1;              // Schema: tinyint -> 'i'
  event_type: string | null;     // Schema: varchar -> 's'
  lanes_affected: string | null; // Schema: varchar -> 's'
  closure_status: string | null; // Schema: varchar -> 's'
  severity_flag: string | null;  // Schema: varchar -> 's'
  severity_score: number | null; // Schema: int -> 'i'
  units_involved: number | null; // Schema: int -> 'i'
}


export interface WeatherData {
  temperature: string;
  conditions: string;
  wind: string;
}

export interface AISummary {
  summary: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reasoning: string;
}