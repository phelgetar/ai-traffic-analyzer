-- Database Cleanup Script - Remove Incidents with Invalid Coordinates
-- This SQL script removes incidents with placeholder/invalid coordinates
--
-- Usage via MySQL command line or phpMyAdmin:
-- 1. Open your MySQL client or phpMyAdmin
-- 2. Select your database
-- 3. Run these queries in order

-- Step 1: View count of bad records (optional)
SELECT 'Total bad records:' as info, COUNT(*) as count FROM incidents WHERE
    (ABS(latitude - 1.0) < 0.0001 AND ABS(longitude - 1.0) < 0.0001)
    OR (latitude = 0 AND longitude = 0)
    OR latitude IS NULL
    OR longitude IS NULL
    OR latitude < 24
    OR latitude > 50
    OR longitude < -125
    OR longitude > -66;

-- Step 2: View breakdown by issue type (optional)
SELECT 'Breakdown by issue type:' as info;

SELECT 'Placeholder (1.0, 1.0)' as issue_type, COUNT(*) as count
FROM incidents
WHERE ABS(latitude - 1.0) < 0.0001 AND ABS(longitude - 1.0) < 0.0001;

SELECT 'Zero coordinates (0.0, 0.0)' as issue_type, COUNT(*) as count
FROM incidents
WHERE latitude = 0 AND longitude = 0;

SELECT 'NULL coordinates' as issue_type, COUNT(*) as count
FROM incidents
WHERE latitude IS NULL OR longitude IS NULL;

SELECT 'Latitude out of US bounds' as issue_type, COUNT(*) as count
FROM incidents
WHERE latitude < 24 OR latitude > 50;

SELECT 'Longitude out of US bounds' as issue_type, COUNT(*) as count
FROM incidents
WHERE longitude < -125 OR longitude > -66;

-- Step 3: View sample bad records (optional)
SELECT 'Sample bad records:' as info;
SELECT source_system, latitude, longitude, route, event_type, updated_time
FROM incidents
WHERE (ABS(latitude - 1.0) < 0.0001 AND ABS(longitude - 1.0) < 0.0001)
   OR (latitude = 0 AND longitude = 0)
   OR latitude IS NULL
   OR longitude IS NULL
   OR latitude < 24
   OR latitude > 50
   OR longitude < -125
   OR longitude > -66
LIMIT 20;

-- Step 4: DELETE BAD RECORDS
-- ⚠️ WARNING: This will permanently delete records. Make a backup first!
-- Uncomment the line below to execute the deletion:

-- DELETE FROM incidents WHERE
--     (ABS(latitude - 1.0) < 0.0001 AND ABS(longitude - 1.0) < 0.0001)
--     OR (latitude = 0 AND longitude = 0)
--     OR latitude IS NULL
--     OR longitude IS NULL
--     OR latitude < 24
--     OR latitude > 50
--     OR longitude < -125
--     OR longitude > -66;

-- Step 5: Verify cleanup (optional)
-- After running the DELETE, check that bad records are gone:
-- SELECT COUNT(*) as remaining_bad_records FROM incidents WHERE
--     (ABS(latitude - 1.0) < 0.0001 AND ABS(longitude - 1.0) < 0.0001)
--     OR (latitude = 0 AND longitude = 0)
--     OR latitude IS NULL
--     OR longitude IS NULL
--     OR latitude < 24
--     OR latitude > 50
--     OR longitude < -125
--     OR longitude > -66;

-- After cleanup:
-- 1. Use the application's Sync button to fetch fresh data
-- 2. The improved importer will now reject incidents with invalid coordinates
-- 3. All new incidents will have valid, accurate coordinates
