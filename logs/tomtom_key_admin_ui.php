<?php
// admin_tomtom.php — TomTom API Key Usage Web UI

require 'vendor/autoload.php'; // For Redis (if using Predis)

use Predis\Client as RedisClient;

$redis = new RedisClient(); // Connect to Redis instance
$date = date('Y-m-d');

// Fetch key usage
$keys = [
    'TOMTOM_KEY1',
    'TOMTOM_KEY2',
    'TOMTOM_KEY3',
    'TOMTOM_KEY4',
    'TOMTOM_KEY5'
];

$keyUsage = [];
foreach ($keys as $key) {
    $redisKey = "tomtom_usage:{$date}:{$key}";
    $count = $redis->get($redisKey) ?? 0;
    $keyUsage[$key] = (int) $count;
}

?>
<!DOCTYPE html>
<html>
<head>
    <title>TomTom API Key Usage</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 2rem; }
        table { border-collapse: collapse; width: 50%; }
        th, td { border: 1px solid #ddd; padding: 8px; }
        th { background-color: #f2f2f2; }
        .warning { background-color: #fff3cd; }
        .exceeded { background-color: #f8d7da; }
    </style>
</head>
<body>
<h1>TomTom API Key Usage</h1>
<p>Date: <?= htmlspecialchars($date) ?></p>
<table>
    <thead>
        <tr><th>Key</th><th>Usage</th><th>Status</th></tr>
    </thead>
    <tbody>
    <?php foreach ($keyUsage as $key => $count): 
        $status = ($count >= 2000) ? 'Exceeded' : (($count >= 1800) ? 'Warning' : 'OK');
        $class = ($count >= 2000) ? 'exceeded' : (($count >= 1800) ? 'warning' : '');
    ?>
        <tr class="<?= $class ?>">
            <td><?= htmlspecialchars($key) ?></td>
            <td><?= $count ?></td>
            <td><?= $status ?></td>
        </tr>
    <?php endforeach; ?>
    </tbody>
</table>
</body>
</html>
