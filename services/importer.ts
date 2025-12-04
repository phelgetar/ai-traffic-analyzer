import { IncidentPayload } from '../types';
import { toMySqlDateTime } from '../utils/time';
import logger from '../utils/logger';
import { v5 as uuidv5 } from 'uuid';

// --- 🛑 ACTION REQUIRED 🛑 ---
// These URLs must point to the actual PHP scripts on your server.
const IMPORTER_API_URL = 'https://jarheads.net/importer.php';
// FIX: Added the required '?endpoint=incidents' parameter to the OHGO proxy URL.
const OHGO_PROXY_URL = 'https://jarheads.net/fetch_ohgo.php?endpoint=incidents';
const TEXAS_PROXY_URL = 'https://jarheads.net/fetch_texas.php';
const TOMTOM_PROXY_URL = 'https://jarheads.net/fetch_tomtom.php'; // New TomTom proxy

// A unique namespace for generating deterministic UUIDs. This can be any valid UUID.
const UUID_NAMESPACE = 'a3a6b0c2-3e28-4a95-87d8-2a22f3e5b4f2';

/**
 * Generates a grid of small bounding boxes to cover the continental US.
 * TomTom's API limits query areas to ~10,000 km^2. A 1x1 degree box is too large
 * at lower latitudes. This function uses a smaller step to stay within the limit.
 * @returns An array of bounding box strings.
 */
const generateUSBoundingBoxes = (): string[] => {
    const boxes: string[] = [];
    const minLon = -125.0;
    const maxLon = -66.93457;
    const minLat = 24.396308;
    const maxLat = 49.384358;
    // FIX: Reduced step size from 1.0 to 0.85 degrees. This creates smaller
    // bounding boxes (~8,200 km^2 at 24°N) that are safely within TomTom's
    // 10,000 km^2 API limit, resolving the 'bbox too large' error.
    const step = 0.85;

    for (let lat = minLat; lat < maxLat; lat += step) {
        for (let lon = minLon; lon < maxLon; lon += step) {
            const bbox = `${lon.toFixed(2)},${lat.toFixed(2)},${(lon + step).toFixed(2)},${(lat + step).toFixed(2)}`;
            boxes.push(bbox);
        }
    }
    logger.log(`[TOMTOM_USA] Generated ${boxes.length} smaller bounding boxes to cover the US.`);
    return boxes;
};


export interface SyncResult {
    success: boolean;
    message: string;
}

/**
 * Fetches data from a given source, with logging.
 * @param sourceName A friendly name for the data source (e.g., 'OHGO', 'TEXAS').
 * @param url The URL to fetch from.
 * @returns The parsed JSON response.
 */
const fetchData = async (sourceName: string, url: string): Promise<any> => {
    logger.log(`[${sourceName}] Fetching from: ${url}`);
    let responseText = '';
    try {
        const response = await fetch(url);
        responseText = await response.text();

        if (!response.ok) {
            logger.log(`[${sourceName}] Received non-OK response body: ${responseText}`);
            throw new Error(`HTTP error ${response.status}. Response: ${responseText}`);
        }
        return JSON.parse(responseText);

    } catch (error: any) {
        let detailedError = error.message;
        // FIX: Improved error message for JSON parsing failures.
        if (error instanceof SyntaxError) {
            detailedError = `Failed to parse JSON. The server returned an unexpected format (likely XML or HTML). Response snippet: ${responseText.substring(0, 150)}...`;
        }
        logger.log(`[${sourceName}] ERROR fetching or processing data: ${detailedError}`);

        if (error.message.includes('401')) {
            error.message += ` This is an authentication error. Please verify that the API key in your server-side proxy script (e.g., fetch_texas.php) is correct and active.`;
        }
        if (error.message.includes('404')) {
            error.message += ` This is a 'Not Found' error. The API URL inside your server-side proxy script is likely incorrect.`;
        }

        // FIX: Throw a new error with the enhanced message so it propagates to the UI.
        throw new Error(detailedError);
    }
};

/**
 * Extracts a US state abbreviation from a route name.
 * @param roadNumbers - An array of strings, e.g., ["I-80", "US-30"].
 * @returns A state abbreviation like 'PA' or null.
 */
const getStateFromRoute = (roadNumbers: string[] | undefined): string | null => {
    if (!roadNumbers || roadNumbers.length === 0) return null;
    const stateRegex = /\b([A-Z]{2})-\d+\b/; // Matches 'PA-322'
    for (const route of roadNumbers) {
        const match = route.match(stateRegex);
        if (match && match[1]) {
            return match[1];
        }
    }
    return null; // Default if no state-specific route is found
};


const transformTomTomData = (data: any[]): IncidentPayload[] => {
    // The input 'data' is now an array of GeoJSON responses from all bounding box queries.
    // First, aggregate all features and deduplicate them.
    const allFeatures = data.flatMap(response => response?.features || []);
    const uniqueFeatures = Array.from(new Map(allFeatures.map(f => [f.properties.id, f])).values());
    
    if (uniqueFeatures.length === 0) {
        logger.log("[TOMTOM] No features found in any TomTom GeoJSON responses.");
        return [];
    }

    const categoryMap: { [key: number]: 'INCIDENT' | 'ROADWORK' } = {
        7: 'ROADWORK', // Lane Closure
        9: 'ROADWORK', // Road Works
    };

    const eventTypeMap: { [key: number]: string } = {
        1: 'Accident', 3: 'Dangerous Conditions', 6: 'Traffic Jam',
        7: 'Lane Closure', 8: 'Road Closed', 9: 'Road Works', 14: 'Broken Down Vehicle',
    };
    
    const severityMap: { [key: number]: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' } = {
        0: 'LOW', // Unknown
        1: 'LOW', // Minor
        2: 'MEDIUM', // Moderate
        3: 'HIGH', // Major
        4: 'CRITICAL', // Undefined in docs, maps well to critical
    };

    const transformed = uniqueFeatures.map((feature: any): IncidentPayload | null => {
        try {
            const props = feature.properties;
            if (!props || !props.id) return null;

            // Extract and validate coordinates
            const coordinates = extractRepresentativePoint(feature.geometry);
            if (!coordinates) {
                logger.log(`[TOMTOM] Skipping incident ${props.id}: no valid coordinates`);
                return null;
            }
            const [longitude, latitude] = coordinates;

            const sourceId = String(props.id);
            const uuid = uuidv5(`TOMTOM-${sourceId}`, UUID_NAMESPACE);
            const iconCategory = props.iconCategory;

            return {
                uuid,
                source_system: 'TomTom_USA',
                source_event_id: sourceId,
                state: getStateFromRoute(props.roadNumbers),
                county: null,
                route: props.roadNumbers?.[0] || props.from || 'Unknown Route',
                direction: null,
                milepost: null,
                latitude,
                longitude,
                reported_time: toMySqlDateTime(props.startTime),
                updated_time: toMySqlDateTime(props.startTime), // Use startTime as best proxy
                cleared_time: props.endTime ? toMySqlDateTime(props.endTime) : null,
                is_active: 1, // API returns currently active incidents
                event_type: eventTypeMap[iconCategory] || 'Unknown Event',
                lanes_affected: props.aci?.description || `From ${props.from} to ${props.to}`,
                closure_status: iconCategory === 8 ? 'CLOSED' : (iconCategory === 7 ? 'PARTIAL' : 'UNKNOWN'),
                severity_flag: severityMap[props.magnitudeOfDelay] || 'LOW',
                severity_score: props.delay ? Math.round(props.delay / 60) : null, // Delay in minutes
                units_involved: null,
            };
        } catch (error: any) {
            logger.log(`[TOMTOM] Failed to transform incident: ${JSON.stringify(feature)}. Error: ${error.message}`);
            return null;
        }
    }).filter((p): p is IncidentPayload => p !== null);
    
    logger.log(`[TOMTOM] Successfully transformed ${transformed.length} unique incidents from all US regions.`);
    return transformed;
};


const transformOhgoData = (data: any): IncidentPayload[] => {
    // The authenticated OHGO API returns an array of incident objects directly.
    const incidents = Array.isArray(data) ? data : [];
    if (incidents.length === 0) {
        logger.log("[OHGO] No incidents found in the authenticated OHGO API response.");
        return [];
    }
    
    const severityMap: { [key: string]: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' } = {
        'LOW': 'LOW',
        'MINOR': 'LOW',
        'MODERATE': 'MEDIUM',
        'MAJOR': 'HIGH',
        'CRITICAL': 'CRITICAL',
    };

    const transformed = incidents.map((incident: any): IncidentPayload | null => {
        try {
            if (!incident.id || !incident.location?.latitude || !incident.location?.longitude) {
                return null;
            }

            const sourceId = String(incident.id);

            // Validate coordinates
            const lat = incident.location.latitude;
            const lon = incident.location.longitude;
            if (!isValidCoordinate(lat, lon)) {
                logger.log(`[OHGO] Skipping incident ${sourceId}: invalid coordinates [${lon}, ${lat}]`);
                return null;
            }

            const uuid = uuidv5(`OHGO-${sourceId}`, UUID_NAMESPACE);

            // The authenticated API provides a 'clearedTime' field.
            const clearedTime = incident.clearedTime || null;
            const isActive = !clearedTime || new Date(clearedTime) > new Date();

            let closureStatus: IncidentPayload['closure_status'] = 'UNKNOWN';
            if (incident.roadwayStatus) {
                const status = incident.roadwayStatus.toUpperCase();
                if (status.includes('CLOSED')) closureStatus = 'CLOSED';
                else if (status.includes('PARTIAL')) closureStatus = 'PARTIAL';
                else if (status.includes('OPEN')) closureStatus = 'OPEN';
            }

            return {
                uuid,
                source_system: 'OHGO_Official',
                source_event_id: sourceId,
                state: 'OH',
                county: incident.county || null,
                route: incident.roadwayName || 'Unknown Route',
                direction: incident.direction || null,
                milepost: incident.mileMarker ? parseFloat(incident.mileMarker) : null,
                latitude: lat,
                longitude: lon,
                reported_time: toMySqlDateTime(incident.startTime),
                updated_time: toMySqlDateTime(incident.lastUpdatedTime || incident.startTime),
                cleared_time: toMySqlDateTime(clearedTime),
                is_active: isActive ? 1 : 0,
                event_type: incident.eventType || 'Unknown Event',
                lanes_affected: incident.description || null,
                closure_status: closureStatus,
                severity_flag: severityMap[incident.severity?.toUpperCase()] || 'LOW',
                severity_score: null, // Not provided by this API
                units_involved: null, // Not provided by this API
            };
        } catch (error: any) {
            logger.log(`[OHGO] Failed to transform incident: ${JSON.stringify(incident)}. Error: ${error.message}`);
            return null;
        }
    }).filter((p): p is IncidentPayload => p !== null);

    logger.log(`[OHGO] Successfully fetched and transformed ${transformed.length} incidents from the authenticated API.`);
    return transformed;
};

/**
 * Validates coordinates to ensure they represent a real location.
 * Filters out placeholder/invalid values like (1.0, 1.0) or coordinates outside valid ranges.
 */
const isValidCoordinate = (latitude: number, longitude: number): boolean => {
    // Check for obvious placeholder values
    if (Math.abs(latitude - 1.0) < 0.0001 && Math.abs(longitude - 1.0) < 0.0001) {
        return false;
    }
    if (latitude === 0 && longitude === 0) {
        return false;
    }

    // Check if coordinates are within valid ranges
    // US latitude: roughly 24°N to 50°N, longitude: roughly -125°W to -66°W
    if (latitude < 24 || latitude > 50) return false;
    if (longitude < -125 || longitude > -66) return false;

    return true;
};

/**
 * Extracts a representative point from various GeoJSON geometry types.
 * For LineString geometries (multi-mile roadwork), calculates the midpoint.
 * Returns [longitude, latitude] or null if unable to extract valid coordinates.
 */
const extractRepresentativePoint = (geometry: any): [number, number] | null => {
    if (!geometry || !geometry.type || !geometry.coordinates) {
        return null;
    }

    try {
        switch (geometry.type) {
            case 'Point': {
                const [lon, lat] = geometry.coordinates;
                if (typeof lon === 'number' && typeof lat === 'number' && isValidCoordinate(lat, lon)) {
                    return [lon, lat];
                }
                return null;
            }

            case 'LineString': {
                // For road segments, calculate the midpoint of the line
                const coords = geometry.coordinates;
                if (!Array.isArray(coords) || coords.length === 0) return null;

                // Try to find a valid coordinate pair from the line
                // First, try the middle point
                const midIndex = Math.floor(coords.length / 2);
                const [midLon, midLat] = coords[midIndex];
                if (isValidCoordinate(midLat, midLon)) {
                    logger.log(`[TEXAS] Using midpoint of LineString (${coords.length} points) at [${midLon}, ${midLat}]`);
                    return [midLon, midLat];
                }

                // If midpoint is invalid, try to find the first valid coordinate
                for (const coord of coords) {
                    const [lon, lat] = coord;
                    if (isValidCoordinate(lat, lon)) {
                        logger.log(`[TEXAS] Using first valid point of LineString at [${lon}, ${lat}]`);
                        return [lon, lat];
                    }
                }

                // If we can't find any valid coordinates, calculate centroid as fallback
                let sumLon = 0, sumLat = 0, validCount = 0;
                for (const coord of coords) {
                    const [lon, lat] = coord;
                    if (typeof lon === 'number' && typeof lat === 'number') {
                        sumLon += lon;
                        sumLat += lat;
                        validCount++;
                    }
                }
                if (validCount > 0) {
                    const centroidLon = sumLon / validCount;
                    const centroidLat = sumLat / validCount;
                    if (isValidCoordinate(centroidLat, centroidLon)) {
                        logger.log(`[TEXAS] Calculated centroid of LineString at [${centroidLon}, ${centroidLat}]`);
                        return [centroidLon, centroidLat];
                    }
                }

                logger.log(`[TEXAS] LineString has no valid coordinates, skipping`);
                return null;
            }

            case 'MultiLineString': {
                // For multi-line segments, use the first LineString's representative point
                const lines = geometry.coordinates;
                if (!Array.isArray(lines) || lines.length === 0) return null;

                // Try each line until we find one with valid coordinates
                for (const line of lines) {
                    const point = extractRepresentativePoint({ type: 'LineString', coordinates: line });
                    if (point) return point;
                }
                return null;
            }

            case 'Polygon':
            case 'MultiPolygon': {
                // For polygons (rare for traffic data), use the first coordinate of the outer ring
                let coords = geometry.type === 'Polygon'
                    ? geometry.coordinates[0]
                    : geometry.coordinates[0]?.[0];

                if (coords && coords.length > 0) {
                    const [lon, lat] = coords[0];
                    if (isValidCoordinate(lat, lon)) {
                        return [lon, lat];
                    }
                }
                return null;
            }

            default:
                logger.log(`[TEXAS] Unknown geometry type: ${geometry.type}`);
                return null;
        }
    } catch (error: any) {
        logger.log(`[TEXAS] Error extracting coordinates from geometry: ${error.message}`);
        return null;
    }
};

// FIX: This function has been completely rewritten to match the data schema from the user's logs (using GLOBALID, route_name, etc.).
// ENHANCEMENT: Added support for LineString geometries and coordinate validation to handle multi-mile roadwork properly.
const transformDriveTexasData = (data: any): IncidentPayload[] => {
    const incidents = data?.features || [];
    if (!Array.isArray(incidents)) {
        logger.log("[TEXAS] Invalid data structure in DriveTexas response. Expected 'features' array.");
        return [];
    }

    const transformed = incidents.map((feature: any): IncidentPayload | null => {
        try {
            const props = feature.properties;
            if (!props) return null;

            // Use GLOBALID as the primary identifier, as seen in logs.
            const sourceId = props.GLOBALID || props.Identifier;
            if (!sourceId) {
                return null;
            }

            // Extract representative point from geometry (handles Point, LineString, etc.)
            const coordinates = extractRepresentativePoint(feature.geometry);
            if (!coordinates) {
                logger.log(`[TEXAS] Skipping incident ${sourceId}: no valid coordinates`);
                return null;
            }
            const [longitude, latitude] = coordinates;

            const uuid = uuidv5(`TX-${sourceId}`, UUID_NAMESPACE);
            
            // Determine active status from end_time.
            const endTime = props.end_time ? new Date(props.end_time) : null;
            const isActive = !endTime || endTime > new Date();

            let closureStatus: IncidentPayload['closure_status'] = 'UNKNOWN';
            const descriptionLower = (props.description || '').toLowerCase();
            if (descriptionLower.includes('closed')) {
                closureStatus = 'CLOSED';
            } else if (descriptionLower.includes('lane blocked') || descriptionLower.includes('shoulder blocked')) {
                closureStatus = 'PARTIAL';
            }

            return {
                uuid,
                source_system: 'DriveTexas_Official',
                source_event_id: String(sourceId),
                state: 'TX',
                county: props.county_num ? String(props.county_num) : null, // Assuming county is a number code
                route: props.route_name || 'Unknown Route',
                direction: props.travel_direction || null,
                milepost: props.from_ref_marker ? parseFloat(props.from_ref_marker) : null,
                latitude,
                longitude,
                reported_time: toMySqlDateTime(props.start_time),
                updated_time: toMySqlDateTime(props.create_time || props.start_time),
                cleared_time: toMySqlDateTime(props.end_time),
                is_active: isActive ? 1 : 0,
                event_type: props.condition || 'Unknown',
                lanes_affected: props.description || null,
                closure_status: closureStatus,
                severity_flag: props.delay_flag === 'true' ? 'MEDIUM' : 'LOW',
                severity_score: null,
                units_involved: null,
            };
        } catch (error: any) {
             logger.log(`[TEXAS] Failed to transform incident: ${JSON.stringify(feature)}. Error: ${error.message}`);
             return null;
        }
    }).filter((p): p is IncidentPayload => p !== null);

    logger.log(`[TEXAS] Finished transforming ${transformed.length} incidents from api.drivetexas.org.`);
    return transformed;
};


const postToImporter = async (incidents: IncidentPayload[]): Promise<SyncResult> => {
    if (incidents.length === 0) {
        return { success: true, message: 'Sync complete. No new data to import.' };
    }
    
    let responseText = '';
    try {
        const response = await fetch(IMPORTER_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(incidents),
        });

        responseText = await response.text();

        if (responseText.trim() === '') {
            throw new Error('The server returned an empty response. This often indicates a fatal error (500) in the backend script (importer.php). Please check the server-side PHP error logs for details.');
        }

        const firstBrace = responseText.indexOf('{');
        const lastBrace = responseText.lastIndexOf('}');

        if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
            throw new Error(`Could not find a valid JSON object in the server response.`);
        }
        
        const jsonString = responseText.substring(firstBrace, lastBrace + 1);
        const result = JSON.parse(jsonString);

        if (!response.ok) {
            throw new Error(result.message || `Importer script failed with status ${response.status}`);
        }

        return { success: true, message: result.message || 'Sync successful.' };

    } catch (error: any) {
        const fullError = `Failed to post data to importer: ${error.message} Raw Response: ${responseText}`;
        logger.log(`[IMPORTER] FATAL: ${fullError}`);
        
        const userMessage = error.message.includes('fatal error (500)') || error.message.includes('Failed to fetch')
            ? error.message
            : 'Sync failed. Could not parse response from the backend importer. Check logs for details.';
        
        return { success: false, message: userMessage };
    }
};

const fetchAndTransformTomTomUSA = async (): Promise<IncidentPayload[]> => {
    const boundingBoxes = generateUSBoundingBoxes();
    logger.log(`[TOMTOM_USA] Starting parallel fetch for ${boundingBoxes.length} US regions.`);

    const promises = boundingBoxes.map(bbox =>
        fetchData('TOMTOM_USA', `${TOMTOM_PROXY_URL}?bbox=${bbox}`)
    );

    const results = await Promise.allSettled(promises);

    const successfulResponses: any[] = [];
    results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
            successfulResponses.push(result.value);
        } else if (result.status === 'rejected') {
            const bbox = boundingBoxes[index];
            const error = result.reason as Error;
            // The TomTom API often returns a 400 Bad Request for bboxes with no incidents or outside their coverage.
            // This is expected and not a fatal error, so we will only log other, unexpected errors.
            if (error.message && !error.message.includes('HTTP error 400')) {
                logger.log(`[TOMTOM_USA] Error fetching region ${bbox}: ${error.message}`);
            }
        }
    });

    logger.log(`[TOMTOM_USA] Successfully fetched data from ${successfulResponses.length} out of ${boundingBoxes.length} regions.`);
        
    if (successfulResponses.length === 0) {
        // Don't throw a fatal error. Log it and allow other sync sources to proceed.
        logger.log("[TOMTOM_USA] Failed to fetch data from any TomTom regions. This could be a network issue, an invalid API key, or no incidents being reported. Continuing sync...");
        return [];
    }
    
    return transformTomTomData(successfulResponses);
};


export const syncWithExternalApis = async (): Promise<SyncResult> => {
    const sources = [
        // { name: 'TOMTOM_USA', fetchAndTransform: fetchAndTransformTomTomUSA }, // Temporarily disabled as keys are exhausted for the day.
        // { name: 'OHGO', fetchAndTransform: () => fetchData('OHGO', OHGO_PROXY_URL).then(transformOhgoData) }, // Temporarily disabled due to invalid API key (401 error).
        { name: 'TEXAS', fetchAndTransform: () => fetchData('TEXAS', TEXAS_PROXY_URL).then(transformDriveTexasData) },
    ];

    const results = await Promise.allSettled(
        sources.map(s => s.fetchAndTransform())
    );

    const successfulIncidents = results
        .filter(r => r.status === 'fulfilled' && Array.isArray(r.value))
        .flatMap(r => (r as PromiseFulfilledResult<IncidentPayload[]>).value);
    
    const errors = results
        .map((r, i) => ({ result: r, sourceName: sources[i].name }))
        .filter(item => item.result.status === 'rejected')
        .map(item => {
            const reason = (item.result as PromiseRejectedResult).reason;
            return `[${item.sourceName}] Failed: ${reason?.message || 'Unknown error'}`;
        });

    let postResult: SyncResult | null = null;

    if (successfulIncidents.length > 0) {
        const BATCH_SIZE = 150;
        const totalBatches = Math.ceil(successfulIncidents.length / BATCH_SIZE);
        logger.log(`[IMPORTER] Starting to post ${successfulIncidents.length} incidents in ${totalBatches} batches of up to ${BATCH_SIZE}.`);

        let allBatchesSucceeded = true;
        let totalPostedCount = 0;
        
        for (let i = 0; i < totalBatches; i++) {
            const batch = successfulIncidents.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
            logger.log(`[IMPORTER] Posting batch ${i + 1}/${totalBatches} with ${batch.length} incidents.`);
            
            const batchResult = await postToImporter(batch);
            
            if (!batchResult.success) {
                let errorMessage = `Sync failed on batch ${i + 1}/${totalBatches}. Reason: ${batchResult.message}`;
                if (batchResult.message.includes('Failed to fetch')) {
                    errorMessage += " This can happen if the data payload is too large for the server. Please check your server's 'post_max_size' limit in its PHP configuration.";
                }
                postResult = { success: false, message: errorMessage };
                allBatchesSucceeded = false;
                break;
            }
            totalPostedCount += batch.length;
        }

        if (allBatchesSucceeded) {
            postResult = { success: true, message: `Sync complete. Successfully processed ${totalPostedCount} incidents across ${totalBatches} batches.` };
        }
    }

    if (errors.length > 0) {
        const errorMessages = errors.join('; ');
        if (postResult && postResult.success) {
            return {
                success: true, 
                message: `Partial Sync: ${postResult.message}. Fetch Errors: ${errorMessages}`
            };
        } else {
            const importerError = postResult ? ` | Importer error: ${postResult.message}` : '';
            const finalMessage = `Sync failed. Fetch Errors: ${errorMessages}${importerError}`;
            logger.log(`[IMPORTER] ${finalMessage}`);
            return { success: false, message: finalMessage };
        }
    } else if (postResult) {
        return postResult;
    } else {
        return { success: true, message: 'Sync complete. No new incidents found from any source.' };
    }
};