<?php
/**
 * Migration script to add live class fields to calendar_notes table
 * 
 * Adds: type, link, time fields to support live class functionality
 * 
 * Usage: Access this file directly in browser or run via WP-CLI
 * wp eval-file migrate-calendar-notes-live-class.php
 */

// Load WordPress
require_once dirname(__FILE__) . '/../../../../wp-load.php';

// Security check
if (!current_user_can('manage_options') && php_sapi_name() !== 'cli') {
    wp_die('Access denied');
}

global $wpdb;

$table_name = $wpdb->prefix . 'qe_calendar_notes';

echo "<pre>";
echo "=== Calendar Notes Live Class Migration ===\n\n";

// Check if table exists
$table_exists = $wpdb->get_var("SHOW TABLES LIKE '$table_name'");

if (!$table_exists) {
    echo "ERROR: Table $table_name does not exist.\n";
    echo "Please ensure the calendar notes table is created first.\n";
    echo "</pre>";
    exit;
}

echo "Table found: $table_name\n\n";

// Check existing columns
$columns = $wpdb->get_results("SHOW COLUMNS FROM $table_name");
$existing_columns = array_map(function ($col) {
    return $col->Field;
}, $columns);

echo "Existing columns: " . implode(', ', $existing_columns) . "\n\n";

$migrations = [];

// Add 'type' column if it doesn't exist
if (!in_array('type', $existing_columns)) {
    $migrations[] = [
        'name' => 'type',
        'sql' => "ALTER TABLE $table_name ADD COLUMN `type` ENUM('note', 'live_class') NOT NULL DEFAULT 'note' AFTER `color`"
    ];
}

// Add 'link' column if it doesn't exist
if (!in_array('link', $existing_columns)) {
    $migrations[] = [
        'name' => 'link',
        'sql' => "ALTER TABLE $table_name ADD COLUMN `link` VARCHAR(500) DEFAULT NULL AFTER `type`"
    ];
}

// Add 'time' column if it doesn't exist  
if (!in_array('time', $existing_columns)) {
    $migrations[] = [
        'name' => 'time',
        'sql' => "ALTER TABLE $table_name ADD COLUMN `time` TIME DEFAULT NULL AFTER `link`"
    ];
}

if (empty($migrations)) {
    echo "All columns already exist. No migrations needed.\n";
    echo "</pre>";
    exit;
}

echo "Migrations to run: " . count($migrations) . "\n\n";

foreach ($migrations as $migration) {
    echo "Adding column: {$migration['name']}... ";

    $result = $wpdb->query($migration['sql']);

    if ($result !== false) {
        echo "SUCCESS\n";
    } else {
        echo "FAILED - " . $wpdb->last_error . "\n";
    }
}

echo "\n=== Migration Complete ===\n";

// Verify final table structure
echo "\nFinal table structure:\n";
$columns = $wpdb->get_results("SHOW COLUMNS FROM $table_name");
foreach ($columns as $col) {
    echo "  - {$col->Field} ({$col->Type})" . ($col->Null === 'NO' ? ' NOT NULL' : '') . "\n";
}

echo "</pre>";
