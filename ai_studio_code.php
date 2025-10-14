<?php
// --- Step 1: Enable Error Reporting (for debugging) ---
// This forces the server to show detailed errors if something goes wrong.
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// --- Step 2: Set Timezone & Start Time ---
// Ensures all time calculations are consistent.
date_default_timezone_set('UTC');
echo "Scheduler started at " . date('Y-m-d H:i:s') . "\n\n";

// --- Step 3: 🛑 ACTION REQUIRED - UPDATE YOUR DATABASE CREDENTIALS HERE 🛑 ---
$servername = "localhost";
$username = "YOUR_DATABASE_USERNAME_HERE";   // <-- ✍️ EDIT THIS
$password = "YOUR_DATABASE_PASSWORD_HERE";   // <-- ✍️ EDIT THIS
$dbname = "YOUR_DATABASE_NAME_HERE";         // <-- ✍️ EDIT THIS

// --- Step 4: Define API Endpoints ---
// These are the public data sources we will be fetching from.
$api_sources = [
    'OHGO' => [
        'url' => 'https://data.ohgo.com/resources/construction/all.json',
        'transformer' => 'transformOhgoData'
    ],
    'DriveTexas' => [
        'url' => 'https://apps.dot.state.tx.us/itravel/api/incidents/all',
        'transformer' => 'transformDriveTexasData'
    ]
];

// --- Step 5: Connect to the Database ---
$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    die("Database connection failed: " . $conn->connect_error);
}
$conn->set_charset("utf8mb4");

// --- Main Processing Loop ---
$summary = [];

foreach ($api_sources as $source_name => $source_details) {
    echo "--- Processing source: $source_name ---\n";
    $stats = ['fetched' => 0, 'inserted' => 0, 'updated' => 0, 'skipped' => 0, 'failed' => 0];

    // Fetch data from the API
    $json_data = @file_get_contents($source_details['url']);
    if ($json_data === false) {
        echo "Failed to fetch data from URL: " . $source_details['url'] . "\n";
        $stats['failed'] = -1; // Indicate a fetch failure
        $summary[$source_name] = $stats;
        continue;
    }

    $data = json_decode($json_data, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        echo "Failed to decode JSON from source: $source_name. Error: " . json_last_error_msg() . "\n";
        $stats['failed'] = -1;
        $summary[$source_name] = $stats;
        continue;
    }

    $results = [];
    if ($source_name === 'OHGO') {
        $results = $data['results'] ?? [];
    } elseif ($source_name === 'DriveTexas') {
        $results = $data ?? [];
    }
    $stats['fetched'] = count($results);

    // Prepare the SQL statement for inserting/updating
    $stmt = $conn->prepare("
        INSERT INTO incidents (
            uuid, source_system, source_event_id, state, county, route,
            direction, milepost, latitude, longitude, reported_time,
            updated_time, cleared_time, is_active, event_type, lanes_affected,
            closure_status, severity_flag, severity_score, units_involved
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            updated_time = VALUES(updated_time),
            cleared_time = VALUES(cleared_time),
            is_active = VALUES(is_active),
            event_type = VALUES(event_type),
            lanes_affected = VALUES(lanes_affected),
            closure_status = VALUES(closure_status),
            severity_flag = VALUES(severity_flag),
            severity_score = VALUES(severity_score),
            units_involved = VALUES(units_involved)
    ");

    if ($stmt === false) {
        die("Failed to prepare statement: " . $conn->error);
    }

    // Process each item
    foreach ($results as $item) {
        $transformed = call_user_func($source_details['transformer'], $item, $source_name);

        if ($transformed === null) {
            $stats['skipped']++;
            continue;
        }

        $stmt->bind_param(
            'ssssssdiddsssissisdi',
            $transformed['uuid'], $transformed['source_system'], $transformed['source_event_id'],
            $transformed['state'], $transformed['county'], $transformed['route'],
            $transformed['direction'], $transformed['milepost'], $transformed['latitude'],
            $transformed['longitude'], $transformed['reported_time'], $transformed['updated_time'],
            $transformed['cleared_time'], $transformed['is_active'], $transformed['event_type'],
            $transformed['lanes_affected'], $transformed['closure_status'], $transformed['severity_flag'],
            $transformed['severity_score'], $transformed['units_involved']
        );
        
        if ($stmt->execute()) {
            if ($stmt->affected_rows === 1) {
                $stats['inserted']++;
            } elseif ($stmt->affected_rows === 2) {
                $stats['updated']++;
            } else {
                $stats['skipped']++; // No change
            }
        } else {
            $stats['failed']++;
        }
    }

    $stmt->close();
    echo "Processing complete for $source_name.\n";
    $summary[$source_name] = $stats;
}

// --- Close Connection and Print Summary ---
$conn->close();

echo "\n--- Summary ---\n";
print_r($summary);
echo "\nScheduler finished at " . date('Y-m-d H:i:s') . "\n";


// --- Data Transformation Functions ---

function transformOhgoData($item, $source_name) {
    if (empty($item['eventId'])) return null;

    $is_active = $item['active'] ?? true;
    $reported_time = !empty($item['startTime']) ? date('Y-m-d H:i:s', $item['startTime'] / 1000) : null;
    $updated_time = !empty($item['lastUpdated']) ? date('Y-m-d H:i:s', $item['lastUpdated'] / 1000) : date('Y-m-d H:i:s');
    $cleared_time = !empty($item['endTime']) ? date('Y-m-d H:i:s', $item['endTime'] / 1000) : null;
    if (!$is_active && $cleared_time === null) {
        $cleared_time = $updated_time;
    }

    return [
        'uuid' => $source_name . '-' . $item['eventId'],
        'source_system' => $source_name,
        'source_event_id' => $item['eventId'],
        'state' => 'OH',
        'county' => $item['county'] ?? null,
        'route' => $item['routeName'] ?? null,
        'direction' => $item['direction'] ?? null,
        'milepost' => $item['startMileMarker'] ?? null,
        'latitude' => $item['latitude'] ?? null,
        'longitude' => $item['longitude'] ?? null,
        'reported_time' => $reported_time,
        'updated_time' => $updated_time,
        'cleared_time' => $cleared_time,
        'is_active' => $is_active ? 1 : 0,
        'event_type' => $item['eventType'] ?? 'Unknown',
        'lanes_affected' => $item['lanesAffected'] ?? null,
        'closure_status' => 'UNKNOWN', // OHGO doesn't provide this directly
        'severity_flag' => 'MEDIUM',  // OHGO doesn't provide this directly
        'severity_score' => 50.0,
        'units_involved' => null // Not available in OHGO data
    ];
}

function transformDriveTexasData($item, $source_name) {
    if (empty($item['Id'])) return null;
    
    $is_active = $item['IsActive'] ?? true;
    $reported_time = !empty($item['ReportedTime']) ? date('Y-m-d H:i:s', strtotime($item['ReportedTime'])) : null;
    $updated_time = !empty($item['LastUpdated']) ? date('Y-m-d H:i:s', strtotime($item['LastUpdated'])) : date('Y-m-d H:i:s');
    $cleared_time = !$is_active ? $updated_time : null;

    $severity_map = [1 => 'LOW', 2 => 'MEDIUM', 3 => 'HIGH', 4 => 'CRITICAL'];
    $severity_score_map = [1 => 25, 2 => 50, 3 => 75, 4 => 95];
    $severity_flag = isset($item['Severity']) ? $severity_map[$item['Severity']] : 'LOW';
    $severity_score = isset($item['Severity']) ? $severity_score_map[$item['Severity']] : 25;

    return [
        'uuid' => $source_name . '-' . $item['Id'],
        'source_system' => $source_name,
        'source_event_id' => $item['Id'],
        'state' => 'TX',
        'county' => $item['County'] ?? null,
        'route' => $item['RoadwayName'] ?? null,
        'direction' => $item['Direction'] ?? null,
        'milepost' => null, // Not available
        'latitude' => $item['Latitude'] ?? null,
        'longitude' => $item['Longitude'] ?? null,
        'reported_time' => $reported_time,
        'updated_time' => $updated_time,
        'cleared_time' => $cleared_time,
        'is_active' => $is_active ? 1 : 0,
        'event_type' => $item['TypeOfIncident'] ?? 'Unknown',
        'lanes_affected' => $item['LanesAffected'] ?? null,
        'closure_status' => 'UNKNOWN', // Not directly available
        'severity_flag' => $severity_flag,
        'severity_score' => $severity_score,
        'units_involved' => null
    ];
}
?>