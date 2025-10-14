import { Incident } from '../types';
import logger from '../utils/logger';

// --- 🛑 ACTION REQUIRED 🛑 ---
// You must replace this placeholder with the actual, full URL to the PHP script on your Bluehost server.
// The application will not work until you do this.
// For example: 'https://www.yourdomain.com/get_incidents.php'
const YOUR_BACKEND_API_URL = 'https://jarheads.net/get_incidents.php'; // <-- ✍️ EDIT THIS LINE

/**
 * Ensures that each incident object fetched from the backend conforms to the strict
 * 'Incident' type definition required by the TypeScript application.
 * @param rawIncident - A raw incident object from the JSON response.
 * @returns A sanitized incident object with all types corrected.
 */
const sanitizeIncident = (rawIncident: any): Incident => {
  // FIX: This logic is now more robust. It checks multiple text fields against an expanded
  // list of keywords to accurately determine the category, fixing the filter bug.
  const searchableText = `${rawIncident.event_type || ''} ${rawIncident.lanes_affected || ''}`.toLowerCase();
  const isRoadwork = /roadwork|construction|maintenance|mowing|utility work/.test(searchableText);
  const derivedCategory = isRoadwork ? 'ROADWORK' : 'INCIDENT';

  // Create a more intelligent, human-readable description from the best available data.
  const primaryDescription = rawIncident.lanes_affected || rawIncident.event_type || 'Unspecified event';
  const synthesizedDescription = `${primaryDescription} on ${rawIncident.route || 'an unknown route'}.`;
    
  // FIX: This logic is now fully robust against null or unexpected values from the DB.
  // It checks if the value is one of the valid enum types; otherwise, it provides a safe default.
  let closureStatus: Incident['closure_status'] = 'UNKNOWN';
  const rawStatus = rawIncident.closure_status?.toUpperCase();
  if (rawStatus === 'OPEN' || rawStatus === 'CLOSED' || rawStatus === 'PARTIAL') {
    closureStatus = rawStatus;
  }

  // FIX: This logic is now fully robust against null or unexpected values from the DB.
  let severityFlag: Incident['severity_flag'] = 'LOW';
  const rawSeverity = rawIncident.severity_flag?.toUpperCase();
  if (rawSeverity === 'LOW' || rawSeverity === 'MEDIUM' || rawSeverity === 'HIGH' || rawSeverity === 'CRITICAL') {
    severityFlag = rawSeverity;
  }

  // FIX: The boolean conversion for `is_active` has been made significantly more robust. The previous
  // logic only checked for a specific list of "truthy" strings and could incorrectly mark incidents as
  // inactive. This new logic correctly identifies common "falsy" values (like 0, false, null, or empty strings)
  // and treats all other non-empty values as active, ensuring incidents from the database are displayed correctly.
  const rawIsActive = rawIncident.is_active;
  let isActive: boolean;
  if (rawIsActive === 0 || rawIsActive === false) {
    isActive = false;
  } else if (rawIsActive == null || rawIsActive === '') {
    isActive = false;
  } else {
    // Treats 1, true, "1", "true", "Y", "Active", etc. as true.
    isActive = true;
  }


  return {
    uuid: String(rawIncident.uuid),
    source_system: String(rawIncident.source_system || 'Custom DB'),
    source_event_id: rawIncident.source_event_id ? String(rawIncident.source_event_id) : null,
    state: rawIncident.state ? String(rawIncident.state) : null,
    county: rawIncident.county ? String(rawIncident.county) : null,
    route: rawIncident.route ? String(rawIncident.route) : null,
    direction: rawIncident.direction ? String(rawIncident.direction) : null,
    milepost: rawIncident.milepost ? Number(rawIncident.milepost) : null,
    latitude: rawIncident.latitude ? parseFloat(rawIncident.latitude) : null,
    longitude: rawIncident.longitude ? parseFloat(rawIncident.longitude) : null,
    reported_time: rawIncident.reported_time ? String(rawIncident.reported_time) : null,
    updated_time: String(rawIncident.updated_time),
    cleared_time: rawIncident.cleared_time ? String(rawIncident.cleared_time) : null,
    is_active: isActive,
    category: derivedCategory,
    event_type: rawIncident.event_type ? String(rawIncident.event_type) : null,
    lanes_affected: rawIncident.lanes_affected ? String(rawIncident.lanes_affected) : null,
    closure_status: closureStatus,
    severity_flag: severityFlag,
    severity_score: rawIncident.severity_score ? Number(rawIncident.severity_score) : null,
    units_involved: rawIncident.units_involved ? Number(rawIncident.units_involved) : null,
    description: synthesizedDescription, // Correctly use the synthesized description
  };
};


/**
 * Fetches the latest incident data from your custom backend API.
 * This function now expects the backend to return a JSON array of objects
 * that already match the 'Incident' type definition.
 */
export const fetchLatestIncidents = async (): Promise<Incident[]> => {
    // This check prevents the app from crashing if the placeholder URL is still being used.
    if (YOUR_BACKEND_API_URL.includes('[YOUR_BLUEHOST_DOMAIN_HERE]')) {
        throw new Error("API URL is not configured. Please edit the YOUR_BACKEND_API_URL constant in 'services/api.ts' to point to your live backend script.");
    }

    try {
        const response = await fetch(YOUR_BACKEND_API_URL);

        if (!response.ok) {
            let errorBody = 'An unknown error occurred';
            try {
                // Try to get a more descriptive error from the backend if available
                const errorJson = await response.json();
                errorBody = errorJson.error || `Request failed with status ${response.status}`;
            } catch (e) {
                // Fallback if the error response isn't JSON
                errorBody = `Request failed with status ${response.status}`;
            }
            throw new Error(`Failed to fetch incidents from backend: ${errorBody}`);
        }

        const rawIncidents: any[] = await response.json();
        
        // FIX: Removed the logging of the entire raw incident payload to prevent the log file from becoming too large.
        
        // Sanitize and transform the raw data to ensure it matches the strict Incident type
        const incidents = rawIncidents.map(sanitizeIncident);
        
        return incidents;

    } catch (error) {
        console.error('A critical error occurred while fetching data from your backend API:', error);
        
        // Provide a more detailed and actionable error message for common network failures.
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
            throw new Error(
                "A network error occurred. This is often caused by a server-side crash (500 error) that prevents the CORS header from being sent, or an invalid SSL certificate. Please open the browser's developer console, check the 'Network' tab for the 'get_incidents.php' request, and examine its status code and response."
            );
        }

        // Re-throw other errors so they can be caught by the UI.
        throw error;
    }
};