# AI Traffic Incident Analyst

## 1. Project Overview

The AI Traffic Incident Analyst is an intelligent, real-time dashboard designed to display, manage, and analyze traffic incident data from multiple sources. It provides a comprehensive map-based and list-based view of incidents, enriched with AI-powered summaries from Google's Gemini API to offer deeper context, potential impacts, and alternative route suggestions.

The system is architected with a React/TypeScript frontend that communicates with a custom PHP backend. The backend serves two primary purposes:
1.  **Data Persistence**: It connects to a MySQL database to store and retrieve incident data.
2.  **API Aggregation**: It acts as a secure proxy to fetch fresh data from various external traffic APIs (e.g., TomTom, OHGO, DriveTexas), transform it into a standardized format, and save it to the database.

---

## 2. Core Features

*   **Multi-Source Data Aggregation**: Syncs data from TomTom (nationwide), OHGO (Ohio), and DriveTexas (Texas) into a unified database.
*   **Interactive Map View**: Visualizes all incidents on a Leaflet map with custom markers and severity-based clustering.
*   **AI-Powered Summaries**: Utilizes the Google Gemini API to generate insightful, human-readable summaries for each incident, analyzing its impact with contextual data like nearby events and historical patterns.
*   **Advanced Filtering & Search**: Allows users to filter incidents by severity, state, status (active/cleared), event type, route, and date range, with distinct icons for different categories.
*   **Persistent UI Settings**: Automatically saves your filter settings to local storage, so your preferred view is restored when you revisit the application.
*   **Real-time Notifications**: Pushes toast notifications for new high-severity incidents.
*   **User Location Integration**: Optionally tracks the user's location to display the distance to each incident.
*   **Client-Side Logging**: Includes a robust logging utility and an in-app log viewer for easy debugging.
*   **Responsive Design**: A clean, modern UI built with Tailwind CSS that works on various screen sizes.

---

## 3. Technology Stack

*   **Frontend**: React, TypeScript, Tailwind CSS
*   **Mapping**: Leaflet.js, Leaflet.markercluster
*   **AI Integration**: Google Gemini API (`@google/genai`)
*   **Backend**: PHP (for API proxying and database interaction)
*   **Database**: MySQL

---

## 4. Setup and Installation Guide

This is a full-stack application that requires both frontend and backend configuration.

### 4.1. Frontend Setup

The frontend code is self-contained. The only mandatory configuration step is setting your Google Gemini API key.

1.  **Configure Gemini API Key**: Open `index.html`.
2.  Find the `<script>` block containing `window.process`.
3.  Replace the placeholder `YOUR_GEMINI_API_KEY_HERE` with your actual Gemini API key.

    ```html
    <!-- index.html -->
    <script>
      window.process = {
        env: {
          API_KEY: 'YOUR_GEMINI_API_KEY_HERE' // <-- PASTE YOUR KEY HERE
        }
      };
    </script>
    ```

### 4.2. Database Setup

The application requires a MySQL database to store incident data.

1.  **Create a Database**: Using a tool like phpMyAdmin or a command-line client, create a new database (e.g., `traffic_data`).
2.  **Create the `incidents` Table**: Run the following SQL query to create the necessary table with the correct schema and indexes.

    ```sql
    CREATE TABLE `incidents` (
      `uuid` varchar(36) NOT NULL,
      `source_system` varchar(50) DEFAULT NULL,
      `source_event_id` varchar(100) DEFAULT NULL,
      `state` varchar(10) DEFAULT NULL,
      `county` varchar(100) DEFAULT NULL,
      `route` varchar(100) DEFAULT NULL,
      `direction` varchar(25) DEFAULT NULL,
      `milepost` decimal(10,3) DEFAULT NULL,
      `latitude` decimal(10,7) DEFAULT NULL,
      `longitude` decimal(10,7) DEFAULT NULL,
      `reported_time` datetime DEFAULT NULL,
      `updated_time` datetime NOT NULL,
      `cleared_time` datetime DEFAULT NULL,
      `is_active` tinyint(1) DEFAULT '1',
      `event_type` varchar(255) DEFAULT NULL,
      `lanes_affected` text,
      `closure_status` varchar(50) DEFAULT NULL,
      `severity_flag` varchar(50) DEFAULT NULL,
      `severity_score` int(11) DEFAULT NULL,
      `units_involved` int(11) DEFAULT NULL,
      PRIMARY KEY (`uuid`),
      KEY `idx_updated_time` (`updated_time`),
      KEY `idx_state` (`state`),
      KEY `idx_is_active` (`is_active`),
      KEY `idx_route` (`route`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ```

### 4.3. Backend PHP Setup

Create the following five PHP files and upload them to your web server (e.g., in the root directory or a subdirectory). **You must edit the database credentials and API keys where indicated**.

#### 1. `get_incidents.php`
*This script fetches all incident data from your database.*

```php
<?php
// --- get_incidents.php ---

// --- Production-Ready Error Handling ---
// Suppress all PHP errors and warnings from being sent to the browser.
// This is crucial to prevent malformed JSON responses and CORS failures if the server has display_errors=On.
// Errors will still be logged to the server's error log file.
error_reporting(0);
@ini_set('display_errors', 0);

// --- Essential Headers ---
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

// --- 🛑 ACTION REQUIRED 🛑 ---
// Replace with your actual database credentials.
$servername = "localhost";
$username = "YOUR_DATABASE_USERNAME";
$password = "YOUR_DATABASE_PASSWORD";
$dbname = "YOUR_DATABASE_NAME";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "Database connection failed: " . $conn->connect_error]);
    exit();
}

$sql = "SELECT * FROM incidents ORDER BY updated_time DESC";
$result = $conn->query($sql);

$incidents = array();
if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        $incidents[] = $row;
    }
}

echo json_encode($incidents);

$conn->close();
?>
```

#### 2. `importer.php`
*This script receives incident data from the frontend sync process and saves it to the database.*

```php
<?php
// --- importer.php ---

// --- Production-Ready Error Handling ---
error_reporting(0);
@ini_set('display_errors', 0);

// --- Essential Headers ---
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// --- 🛑 ACTION REQUIRED 🛑 ---
// Replace with your actual database credentials.
$servername = "localhost";
$username = "YOUR_DATABASE_USERNAME";
$password = "YOUR_DATABASE_PASSWORD";
$dbname = "YOUR_DATABASE_NAME";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["message" => "Connection failed: " . $conn->connect_error]);
    exit();
}

// Get the posted data.
$data = json_decode(file_get_contents("php://input"));

if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
    http_response_code(400);
    echo json_encode(["message" => "Invalid JSON payload."]);
    exit();
}

$sql = "INSERT INTO incidents (uuid, source_system, source_event_id, state, county, route, direction, milepost, latitude, longitude, reported_time, updated_time, cleared_time, is_active, event_type, lanes_affected, closure_status, severity_flag, severity_score, units_involved) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE source_system=VALUES(source_system), source_event_id=VALUES(source_event_id), state=VALUES(state), county=VALUES(county), route=VALUES(route), direction=VALUES(direction), milepost=VALUES(milepost), latitude=VALUES(latitude), longitude=VALUES(longitude), reported_time=VALUES(reported_time), updated_time=VALUES(updated_time), cleared_time=VALUES(cleared_time), is_active=VALUES(is_active), event_type=VALUES(event_type), lanes_affected=VALUES(lanes_affected), closure_status=VALUES(closure_status), severity_flag=VALUES(severity_flag), severity_score=VALUES(severity_score), units_involved=VALUES(units_involved)";

$stmt = $conn->prepare($sql);

if ($stmt === false) {
    http_response_code(500);
    echo json_encode(["message" => "Failed to prepare statement: " . $conn->error]);
    exit();
}

$inserted = 0;
$updated = 0;

foreach ($data as $incident) {
    // Bind parameters - 's' for string, 'd' for double/decimal, 'i' for integer
    $stmt->bind_param(
        "ssssssdiddsssissisii",
        $incident->uuid,
        $incident->source_system,
        $incident->source_event_id,
        $incident->state,
        $incident->county,
        $incident->route,
        $incident->direction,
        $incident->milepost,
        $incident->latitude,
        $incident->longitude,
        $incident->reported_time,
        $incident->updated_time,
        $incident->cleared_time,
        $incident->is_active,
        $incident->event_type,
        $incident->lanes_affected,
        $incident->closure_status,
        $incident->severity_flag,
        $incident->severity_score,
        $incident->units_involved
    );

    if ($stmt->execute()) {
        if ($stmt->affected_rows === 1) {
            $inserted++;
        } elseif ($stmt->affected_rows === 2) {
            $updated++;
        }
    }
}

http_response_code(200);
echo json_encode(["message" => "Sync successful. Inserted: $inserted, Updated: $updated."]);

$stmt->close();
$conn->close();
?>
```

#### 3. `fetch_tomtom.php`
*This is the secure proxy for the TomTom API. This advanced version includes API key rotation, usage tracking, alerting, and automatic "dead key" detection to disable keys that have been suspended or exhausted.*

```php
<?php
// --- fetch_tomtom.php ---

// --- Production-Ready Error Handling ---
error_reporting(0);
@ini_set('display_errors', 0);

// Set universal headers at the beginning.
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

/**
 * CONFIGURATION
 */
$keys = [
    // --- 🛑 ACTION REQUIRED 🛑 ---
    // Add your TomTom API keys here.
    "TOMTOM_KEY1" => "dmYkNsuekUXxEfDJ0kCIZCjHVu2YGAyW",
    "TOMTOM_KEY2" => "jS2lqYt7gG9YGwgCF33T8VEvNbzPWF6S",
    "TOMTOM_KEY3" => "yHrUbkdL54IypjpthLT3FElfZ00PnlDd",
    "TOMTOM_KEY4" => "Xkb5vNJoWC7TtLIup6DPwA3J2WQUx8gi",
    "TOMTOM_KEY5" => "FDiCsUeHswl45SmMzvPFgmmUAvwoXb0n"
];

$dailyLimit = 2400; // TomTom free tier is 2,500/day. Set slightly lower.
$alertThreshold = 2000;

// Set paths for log files. Ensure the web server has write permissions to this directory.
$usageFile = __DIR__ . '/tomtom_key_usage.json';
$logFile   = __DIR__ . '/tomtom_api.log';
$deadKeysFile = __DIR__ . '/tomtom_dead_keys.json';

// Optional: Set up email/Slack for alerts when keys near their limit.
$emailRecipient = "canadytw@jarheads.net";
$slackWebhook = getenv('SLACK_WEBHOOK_URL');

if (!function_exists('curl_init')) {
    http_response_code(500);
    echo json_encode(["error" => "Server configuration error: cURL extension is not installed or enabled."]);
    exit();
}

/**
 * HELPER FUNCTIONS
 */
function log_message($message) {
    global $logFile;
    $timestamp = date('c');
    @file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
}

function load_usage() {
    global $usageFile;
    return file_exists($usageFile) ? json_decode(file_get_contents($usageFile), true) : [];
}

function save_usage($usage) {
    global $usageFile;
    @file_put_contents($usageFile, json_encode($usage, JSON_PRETTY_PRINT));
}

function load_dead_keys() {
    global $deadKeysFile;
    return file_exists($deadKeysFile) ? json_decode(file_get_contents($deadKeysFile), true) : [];
}

function save_dead_keys($deadKeys) {
    global $deadKeysFile;
    @file_put_contents($deadKeysFile, json_encode($deadKeys, JSON_PRETTY_PRINT));
}

function send_alerts($label, $count) {
    global $emailRecipient, $slackWebhook;
    $subject = "TomTom API Key Alert: $label";
    $message = "Key $label has reached $count requests today.";
    if ($emailRecipient) @mail($emailRecipient, $subject, $message);
    if ($slackWebhook) {
        $payload = json_encode(["text" => ":warning: *TomTom API Key Alert*\nKey: `$label`\nUsage: *$count*"]);
        @file_get_contents($slackWebhook, false, stream_context_create(['http' => ['method' => 'POST', 'header' => "Content-Type: application/json\r\n", 'content' => $payload]]));
    }
}

function get_available_key(&$selectedKeyLabel) {
    global $keys, $dailyLimit, $alertThreshold;
    $today = date('Y-m-d');
    $usage = load_usage();
    $deadKeys = load_dead_keys();

    foreach ($keys as $label => $key) {
        if (!empty($deadKeys[$label])) continue; // Skip known dead keys

        $used = $usage[$label][$today] ?? 0;

        if ($used < $dailyLimit) {
            if ($used >= $alertThreshold && $used < $alertThreshold + 5) send_alerts($label, $used);
            $usage[$label][$today] = $used + 1;
            save_usage($usage);
            $selectedKeyLabel = $label;
            log_message("Using key $label. Usage now: {$usage[$label][$today]}");
            return $key;
        }
    }
    log_message("❌ All TomTom API keys exhausted for today.");
    return null;
}

/**
 * MAIN EXECUTION
 */
$bbox = filter_input(INPUT_GET, 'bbox', FILTER_SANITIZE_STRING);
if (!$bbox) {
    http_response_code(400);
    echo json_encode(["error" => "Missing 'bbox' parameter."]);
    exit;
}

$selectedKeyLabel = '';
$apiKey = get_available_key($selectedKeyLabel);

if (!$apiKey) {
    http_response_code(429);
    echo json_encode(["error" => "All TomTom API keys are exhausted for today."]);
    exit;
}

$url = "https://api.tomtom.com/traffic/services/5/incidentDetails?bbox=$bbox&key=$apiKey&format=geojson";
log_message("[$selectedKeyLabel] Requesting URL: $url");

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$response_body = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_error = curl_error($ch);
curl_close($ch);

if ($curl_error) {
    log_message("[$selectedKeyLabel] cURL error: $curl_error");
    http_response_code(502);
    echo json_encode(["error" => "cURL error connecting to TomTom API", "detail" => $curl_error]);
    exit;
}

// If API key is rejected (403) or rate-limited (429), mark it as dead.
if ($http_code === 403 || $http_code === 429) {
    $deadKeys = load_dead_keys();
    $deadKeys[$selectedKeyLabel] = date('c');
    save_dead_keys($deadKeys);
    log_message("[$selectedKeyLabel] API key flagged as dead (HTTP $http_code)");
}

if ($http_code !== 200) {
    log_message("[$selectedKeyLabel] TomTom API returned HTTP $http_code for bbox=$bbox");
    http_response_code($http_code);
    echo json_encode([
        "error" => "TomTom API returned non-200 status",
        "status" => $http_code,
        "detail" => substr($response_body, 0, 500)
    ]);
    exit;
}

header("X-TomTom-Key-Used: $selectedKeyLabel");
echo $response_body;
log_message("[$selectedKeyLabel] SUCCESS for bbox=$bbox");
?>
```

#### 4. `fetch_ohgo.php`
*This script proxies requests to the Ohio OHGO API. It now requires an 'endpoint' parameter to be passed in the URL from the frontend.*

```php
<?php
// --- fetch_ohgo.php ---

// --- Production-Ready Error Handling ---
error_reporting(0);
@ini_set('display_errors', 0);

// --- Essential Headers ---
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

// --- 🛑 ACTION REQUIRED 🛑 ---
$ohgo_api_key = "974bd202-b765-4a25-8ee2-a4d858d87bff";
$api_base_url = "https://publicapi.ohgo.com/api/v1/";

function send_json_error($statusCode, $message, $details = null) {
    http_response_code($statusCode);
    $response = ["error" => $message];
    if ($details) $response['details'] = $details;
    echo json_encode($response);
    exit();
}

if (!function_exists('curl_init')) {
    send_json_error(500, "Server configuration error: cURL extension is not installed or enabled.");
}

if (empty($ohgo_api_key) || $ohgo_api_key === 'YOUR_OHGO_API_KEY_HERE') {
    send_json_error(500, "Server configuration error: OHGO API key is not configured in fetch_ohgo.php.");
}

// FIX: This script now requires an 'endpoint' GET parameter (e.g., 'incidents').
$endpoint = filter_input(INPUT_GET, 'endpoint', FILTER_SANITIZE_STRING);
if (empty($endpoint)) {
    send_json_error(400, "Invalid or missing endpoint specified.");
}
$full_api_url = $api_base_url . $endpoint;

$ch = curl_init($full_api_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);
curl_setopt($ch, CURLOPT_USERAGENT, 'Traffic Incident Monitor Client');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "X-Api-Key: " . $ohgo_api_key,
    "Accept: application/json"
]);

$response_body = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_error = curl_error($ch);
curl_close($ch);

if ($curl_error) {
    send_json_error(502, "Failed to connect to OHGO API.", $curl_error);
}

if ($http_code === 401) {
    send_json_error(401, "Authentication failed. The provided OHGO API key is invalid or has expired.");
}

if ($http_code !== 200) {
    send_json_error(502, "OHGO API returned a non-200 status code.", "HTTP Status: $http_code. Response: " . substr($response_body, 0, 500));
}

json_decode($response_body);
if (json_last_error() !== JSON_ERROR_NONE) {
    send_json_error(502, "OHGO API returned invalid JSON.", "Response Snippet: " . substr($response_body, 0, 200));
}

echo $response_body;
?>
```

#### 5. `fetch_texas.php`
*This script proxies requests to the DriveTexas API, correctly including the required API key.*

```php
<?php
// --- fetch_texas.php ---

// --- Production-Ready Error Handling ---
error_reporting(0);
@ini_set('display_errors', 0);

// --- Essential Headers ---
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

// --- 🛑 ACTION REQUIRED 🛑 ---
// Replace with your actual DriveTexas API key.
$drivetexas_api_key = "282b3686-c1a2-4f20-9a53-53027e71c1c3";
$api_base_url = "https://api.drivetexas.org/api/conditions.geojson";

function send_json_error($statusCode, $message, $details = null) {
    http_response_code($statusCode);
    $response = ["error" => $message];
    if ($details) $response['details'] = $details;
    echo json_encode($response);
    exit();
}

if (!function_exists('curl_init')) {
    send_json_error(500, "Server configuration error: cURL extension is not installed or enabled.");
}

if (empty($drivetexas_api_key) || $drivetexas_api_key === 'YOUR_DRIVETEXAS_API_KEY_HERE') {
    send_json_error(500, "Server configuration error: DriveTexas API key is not configured in fetch_texas.php.");
}

$full_api_url = $api_base_url . '?key=' . urlencode($drivetexas_api_key);

$ch = curl_init($full_api_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);
curl_setopt($ch, CURLOPT_USERAGENT, 'Traffic Incident Monitor Client');
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Accept: application/json"]);

$response_body = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_error = curl_error($ch);
curl_close($ch);

if ($curl_error) {
    send_json_error(502, "Failed to connect to DriveTexas API.", $curl_error);
}

if ($http_code === 401) {
    send_json_error(401, "Authentication failed. The provided DriveTexas API key is invalid or has expired.");
}

if ($http_code !== 200) {
    send_json_error(502, "DriveTexas API returned a non-200 status code.", "HTTP Status: $http_code. Response: " . substr($response_body, 0, 500));
}

json_decode($response_body);
if (json_last_error() !== JSON_ERROR_NONE) {
    send_json_error(502, "DriveTexas API returned invalid JSON.", "Response Snippet: " . substr($response_body, 0, 200));
}

echo $response_body;
?>
```

### 4.4. Final Configuration

After setting up the database and uploading the PHP scripts:

1.  **Update Backend URLs in Frontend**:
    *   Open `services/api.ts` and change `YOUR_BACKEND_API_URL` to the full URL of your `get_incidents.php` script.
    *   Open `services/importer.ts` and update the `IMPORTER_API_URL`, `OHGO_PROXY_URL`, `TEXAS_PROXY_URL`, and `TOMTOM_PROXY_URL` constants to point to your live PHP scripts.

2.  **Upload Frontend Files**: Upload all the frontend files (`index.html`, `index.tsx`, etc.) to your web server.

---

## 5. Usage

1.  **Initial Load**: When the application first loads, it will automatically fetch existing incidents from your database via `get_incidents.php`.
2.  **Sync Data**: Click the "Sync" button (cloud icon) in the header. This triggers the `syncWithExternalApis` function, which calls your PHP proxies to get the latest data, transforms it, and sends it to `importer.php` to be saved in the database.
3.  **Refresh View**: After a sync, the app will automatically refresh the incident list to show the newly imported data. You can also manually refresh from the database at any time using the "Refresh" button.
4.  **Interact**: Click on any incident in the list or on the map to view its details and the AI-generated summary. Use the filter controls to narrow down the data shown. Your filter settings are automatically saved and will be restored the next time you open the app.

---

## 6. License

This project is licensed under the MIT License.
