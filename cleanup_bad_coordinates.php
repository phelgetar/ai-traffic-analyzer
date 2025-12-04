<?php
/**
 * Database Cleanup Script - Remove Incidents with Invalid Coordinates
 *
 * This script removes incidents with placeholder/invalid coordinates like (1.0, 1.0)
 * Run this ONCE to clean up existing bad data, then use the improved importer
 * to prevent future bad coordinates from being added.
 *
 * Usage:
 * 1. Upload this file to your server
 * 2. Access it via browser: https://yourserver.com/cleanup_bad_coordinates.php
 * 3. Or run via command line: php cleanup_bad_coordinates.php
 * 4. After cleanup, sync fresh data using the app's sync button
 */

// --- 🛑 ACTION REQUIRED 🛑 ---
// Replace with your actual database credentials.
$servername = "localhost";
$username = "YOUR_DATABASE_USERNAME";
$password = "YOUR_DATABASE_PASSWORD";
$dbname = "YOUR_DATABASE_NAME";

// Security: Uncomment this line to require a secret key via URL parameter
// if (!isset($_GET['key']) || $_GET['key'] !== 'your-secret-cleanup-key-here') {
//     die('Unauthorized access');
// }

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

echo "<!DOCTYPE html><html><head><title>Database Cleanup</title>";
echo "<style>body{font-family:Arial,sans-serif;max-width:800px;margin:50px auto;padding:20px;}";
echo ".success{color:green;}.error{color:red;}.info{color:blue;}h1{border-bottom:2px solid #333;}</style></head><body>";
echo "<h1>Database Cleanup - Invalid Coordinates</h1>";

// Step 1: Count incidents with bad coordinates
echo "<h2>Step 1: Analyzing Database</h2>";

$sql = "SELECT COUNT(*) as bad_count FROM incidents WHERE
    (ABS(latitude - 1.0) < 0.0001 AND ABS(longitude - 1.0) < 0.0001)
    OR (latitude = 0 AND longitude = 0)
    OR latitude IS NULL
    OR longitude IS NULL
    OR latitude < 24
    OR latitude > 50
    OR longitude < -125
    OR longitude > -66";

$result = $conn->query($sql);
$row = $result->fetch_assoc();
$badCount = $row['bad_count'];

echo "<p class='info'>Found <strong>$badCount</strong> incidents with invalid coordinates.</p>";

// Show breakdown by issue type
echo "<h3>Breakdown by Issue Type:</h3>";
echo "<table border='1' cellpadding='8' cellspacing='0'>";
echo "<tr><th>Issue Type</th><th>Count</th></tr>";

// Count each type of bad coordinate
$issues = [
    "Placeholder (1.0, 1.0)" => "ABS(latitude - 1.0) < 0.0001 AND ABS(longitude - 1.0) < 0.0001",
    "Zero coordinates (0.0, 0.0)" => "latitude = 0 AND longitude = 0",
    "NULL coordinates" => "latitude IS NULL OR longitude IS NULL",
    "Out of US bounds (latitude)" => "latitude < 24 OR latitude > 50",
    "Out of US bounds (longitude)" => "longitude < -125 OR longitude > -66"
];

foreach ($issues as $issueType => $condition) {
    $sql = "SELECT COUNT(*) as count FROM incidents WHERE $condition";
    $result = $conn->query($sql);
    $row = $result->fetch_assoc();
    $count = $row['count'];
    if ($count > 0) {
        echo "<tr><td>$issueType</td><td>$count</td></tr>";
    }
}
echo "</table>";

// Step 2: Show sample bad records
echo "<h2>Step 2: Sample Bad Records</h2>";
$sql = "SELECT uuid, source_system, latitude, longitude, route, event_type, updated_time
        FROM incidents
        WHERE (ABS(latitude - 1.0) < 0.0001 AND ABS(longitude - 1.0) < 0.0001)
           OR (latitude = 0 AND longitude = 0)
           OR latitude IS NULL
           OR longitude IS NULL
           OR latitude < 24
           OR latitude > 50
           OR longitude < -125
           OR longitude > -66
        LIMIT 10";

$result = $conn->query($sql);
if ($result->num_rows > 0) {
    echo "<table border='1' cellpadding='8' cellspacing='0' style='font-size:12px;'>";
    echo "<tr><th>Source</th><th>Lat</th><th>Lon</th><th>Route</th><th>Event Type</th><th>Updated</th></tr>";
    while ($row = $result->fetch_assoc()) {
        echo "<tr>";
        echo "<td>" . htmlspecialchars($row['source_system']) . "</td>";
        echo "<td>" . ($row['latitude'] ?? 'NULL') . "</td>";
        echo "<td>" . ($row['longitude'] ?? 'NULL') . "</td>";
        echo "<td>" . htmlspecialchars($row['route'] ?? '') . "</td>";
        echo "<td>" . htmlspecialchars($row['event_type'] ?? '') . "</td>";
        echo "<td>" . htmlspecialchars($row['updated_time']) . "</td>";
        echo "</tr>";
    }
    echo "</table>";
    echo "<p class='info'>(Showing first 10 of $badCount total bad records)</p>";
}

// Step 3: Perform cleanup if confirmed
if ($badCount > 0) {
    echo "<h2>Step 3: Cleanup Action</h2>";

    if (isset($_GET['confirm']) && $_GET['confirm'] === 'yes') {
        // User confirmed - delete the bad records
        $sql = "DELETE FROM incidents WHERE
            (ABS(latitude - 1.0) < 0.0001 AND ABS(longitude - 1.0) < 0.0001)
            OR (latitude = 0 AND longitude = 0)
            OR latitude IS NULL
            OR longitude IS NULL
            OR latitude < 24
            OR latitude > 50
            OR longitude < -125
            OR longitude > -66";

        if ($conn->query($sql) === TRUE) {
            $deletedCount = $conn->affected_rows;
            echo "<p class='success'>✓ Successfully deleted <strong>$deletedCount</strong> incidents with invalid coordinates!</p>";
            echo "<p class='info'>Next steps:</p>";
            echo "<ol>";
            echo "<li>Return to the main application</li>";
            echo "<li>Click the <strong>Sync</strong> button to fetch fresh data with valid coordinates</li>";
            echo "<li>The improved importer will now reject any incidents with invalid coordinates</li>";
            echo "<li>You can safely delete this cleanup script from your server</li>";
            echo "</ol>";
        } else {
            echo "<p class='error'>Error deleting records: " . $conn->error . "</p>";
        }
    } else {
        // Show confirmation button
        echo "<p class='info'>Ready to delete $badCount incidents with invalid coordinates?</p>";
        echo "<p><strong>⚠️ Warning:</strong> This action cannot be undone. Make sure you have a database backup if needed.</p>";

        $currentUrl = $_SERVER['REQUEST_URI'];
        $separator = strpos($currentUrl, '?') === false ? '?' : '&';

        echo "<form method='get' style='margin:20px 0;'>";
        // Preserve existing query parameters
        foreach ($_GET as $key => $value) {
            if ($key !== 'confirm') {
                echo "<input type='hidden' name='" . htmlspecialchars($key) . "' value='" . htmlspecialchars($value) . "'>";
            }
        }
        echo "<input type='hidden' name='confirm' value='yes'>";
        echo "<button type='submit' style='background:red;color:white;padding:10px 20px;font-size:16px;border:none;cursor:pointer;'>DELETE $badCount BAD RECORDS</button>";
        echo "</form>";

        echo "<p style='color:#666;'><em>Click the button above to proceed with cleanup.</em></p>";
    }
} else {
    echo "<h2>Step 3: No Action Needed</h2>";
    echo "<p class='success'>✓ Database is clean! No incidents found with invalid coordinates.</p>";
}

// Close connection
$conn->close();

echo "</body></html>";
?>
