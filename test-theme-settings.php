<?php
/**
 * Test script to verify theme settings are being read correctly
 * 
 * Access via: wp-admin/admin.php?page=test-theme-settings
 * Or run via WP-CLI: wp eval-file test-theme-settings.php
 */

// Load WordPress
require_once dirname(dirname(dirname(dirname(__FILE__)))) . '/wp-load.php';

// Get settings from database
$settings = get_option('qe_plugin_settings', []);

echo "<h2>Current Theme Settings in Database:</h2>";
echo "<pre>";
print_r($settings);
echo "</pre>";

// Load the Settings API class
require_once __DIR__ . '/includes/api/class-qe-api-base.php';
require_once __DIR__ . '/includes/api/class-qe-settings-api.php';

echo "<h2>Settings via QE_Settings_API::get_all_settings():</h2>";
echo "<pre>";
print_r(QE_Settings_API::get_all_settings());
echo "</pre>";

echo "<h2>What will be injected into window.qe_data:</h2>";
$all_settings = QE_Settings_API::get_all_settings();
echo "<pre>";
echo "theme: ";
print_r($all_settings['theme']);
echo "\nscoreFormat: " . $all_settings['score_format'];
echo "</pre>";
